// Live pull from the CPSC recall feed, shared by the scheduled route
// (src/app/api/cron/sync-recalls/route.ts) and the snapshot script (scripts/ingest-recalls.ts).
//
//   fetchCpscRecalls: calls the CPSC API, cleans each recall, applies the brand renames
//   upsertRecalls:    inserts new recalls and updates ones we already have (matched on recall number)
//   isAuthorized:     checks the Bearer token on the cron route (fails closed if no secret is set)
//
import { and, asc, eq, sql } from "drizzle-orm";
import { agentDecisions, db, merchants, recalls } from "@/db";
import { PENDING_SCAN, STORE_NAME, scanRecall } from "./agent/scan-recall";
import { renameRecall } from "./brand-aliases";
import { CPSC_API, normalizeRecall, type RecallRecord } from "./cpsc";

export const SYNC_WINDOW_DAYS = 30; // CPSC edits recalls after publishing, so re-pull a overlap window
const FETCH_TIMEOUT_MS = 20_000;

export function sinceDate(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function fetchCpscRecalls(since: string): Promise<RecallRecord[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since))
    throw new Error("since must be YYYY-MM-DD");
  const res = await fetch(`${CPSC_API}?format=json&RecallDateStart=${since}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CPSC API failed: HTTP ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];
  return raw
    .map(normalizeRecall)
    .map(renameRecall) // trademark-free demo names: same renames as the snapshot path
    .sort((a, b) => b.recallDate.localeCompare(a.recallDate));
}

export type UpsertResult = { inserted: number; updated: number };

export async function upsertRecalls(
  records: RecallRecord[],
  queueNew = false,
): Promise<UpsertResult> {
  return db.transaction(async (tx) => {
    if (records.length === 0) return { inserted: 0, updated: 0 };
    // xmax is 0 on a freshly inserted row and non-zero on one that was updated by the conflict clause.
    const rows = await tx
      .insert(recalls)
      .values(records)
      .onConflictDoUpdate({
        target: recalls.recallNumber,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          hazards: sql`excluded.hazards`,
          remedyText: sql`excluded.remedy_text`,
          remedyOptions: sql`excluded.remedy_options`,
          retailers: sql`excluded.retailers`,
          manufacturers: sql`excluded.manufacturers`,
          soldOnline: sql`excluded.sold_online`,
          products: sql`excluded.products`,
          url: sql`excluded.url`,
        },
      })
      .returning({
        recallNumber: recalls.recallNumber,
        inserted: sql<boolean>`(xmax = 0)`,
      });
    const inserted = rows.filter((r) => r.inserted).length;
    if (queueNew && inserted) {
      const [merchant] = await tx
        .select()
        .from(merchants)
        .where(eq(merchants.name, STORE_NAME));
      if (!merchant) throw new Error("Demo store missing");
      await tx.insert(agentDecisions).values(
        rows
          .filter((row) => row.inserted)
          .map((row) => ({
            merchantId: merchant.id,
            actor: "RULE",
            step: PENDING_SCAN,
            summary: `Queued new CPSC recall #${row.recallNumber} for review.`,
            detail: { recallNumber: row.recallNumber },
          })),
      );
    }
    return { inserted, updated: rows.length - inserted };
  });
}

export function isAuthorized(
  header: string | null,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!secret || !header) return false;
  return header === `Bearer ${secret}`;
}

export const MAX_SYNC_RECALLS = 4;

async function pendingRecalls() {
  const rows = await db
    .select({ number: sql<string>`${agentDecisions.detail}->>'recallNumber'` })
    .from(agentDecisions)
    .innerJoin(merchants, eq(merchants.id, agentDecisions.merchantId))
    .where(
      and(
        eq(merchants.name, STORE_NAME),
        eq(agentDecisions.step, PENDING_SCAN),
      ),
    )
    .orderBy(
      sql`${agentDecisions.detail}->>'lastAttempt' asc nulls first`,
      asc(agentDecisions.createdAt),
      asc(agentDecisions.id),
    )
    .limit(MAX_SYNC_RECALLS);
  return rows.map((row) => row.number);
}

async function deferRetry(number: string) {
  const store = db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.name, STORE_NAME));
  await db
    .update(agentDecisions)
    .set({
      detail: sql`${agentDecisions.detail} || jsonb_build_object('lastAttempt', now())`,
    })
    .where(
      and(
        eq(agentDecisions.step, PENDING_SCAN),
        sql`${agentDecisions.merchantId} in (${store})`,
        sql`${agentDecisions.detail}->>'recallNumber' = ${number}`,
      ),
    );
}

export async function scanPendingRecalls(
  load = pendingRecalls,
  scan = scanRecall,
  retry = deferRetry,
) {
  const result = { drafted: 0, unmatched: 0, skipped: 0, failed: 0 };
  for (const number of (await load()).slice(0, MAX_SYNC_RECALLS)) {
    try {
      const outcome = await scan(number, "cron");
      if (outcome === "draft") result.drafted++;
      else if (outcome === "no-match") result.unmatched++;
      else result.skipped++;
    } catch {
      // The scan rolled back. Its pending row remains available on the next run.
      await retry(number);
      result.failed++;
    }
  }
  return result;
}
