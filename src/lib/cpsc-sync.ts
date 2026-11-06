// Live pull from the CPSC recall feed, shared by the scheduled route
// (src/app/api/cron/sync-recalls/route.ts) and the snapshot script (scripts/ingest-recalls.ts).
//
//   fetchCpscRecalls: calls the CPSC API, cleans each recall, applies the brand renames
//   upsertRecalls:    inserts new recalls and updates ones we already have (matched on recall number)
//   isAuthorized:     checks the Bearer token on the cron route (fails closed if no secret is set)
//
// This only loads the `recalls` table. It never runs the agent, so it spends no AI budget and does
// not touch campaigns, cases or money.
import { sql } from "drizzle-orm";
import { db, recalls } from "@/db";
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
    .map(renameRecall) // Devpost trademark rule: same renames as the snapshot path
    .sort((a, b) => b.recallDate.localeCompare(a.recallDate));
}

export type UpsertResult = { inserted: number; updated: number };

export async function upsertRecalls(
  records: RecallRecord[],
): Promise<UpsertResult> {
  if (records.length === 0) return { inserted: 0, updated: 0 };
  // xmax is 0 on a freshly inserted row and non-zero on one that was updated by the conflict clause.
  const rows = await db
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
    .returning({ inserted: sql<boolean>`(xmax = 0)` });
  const inserted = rows.filter((r) => r.inserted).length;
  return { inserted, updated: rows.length - inserted };
}

export function isAuthorized(
  header: string | null,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!secret || !header) return false;
  return header === `Bearer ${secret}`;
}
