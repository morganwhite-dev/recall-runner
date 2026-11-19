// Dashboard and scheduled scans share this path. Only verified model results can create a draft.
import { and, eq, sql } from "drizzle-orm";
import {
  agentDecisions,
  campaigns,
  db,
  merchants,
  products,
  recalls,
} from "@/db";
import { investigateRecall } from "./investigate";
import { CallBudget } from "./llm";
import {
  matchRecall,
  prefilter,
  verifyMatches,
  type RecallText,
  type ProductText,
} from "./match";

export const STORE_NAME = "Brightnest Home";
export const PENDING_SCAN = "CPSC_PENDING";
const recallAgent = { match: matchRecall, investigate: investigateRecall };
type Recall = typeof recalls.$inferSelect;
type Evidence = Pick<
  typeof agentDecisions.$inferInsert,
  "step" | "actor" | "summary" | "detail" | "model"
>;

export async function assessRecall(
  record: Recall,
  catalog: ProductText[],
  merchantId: string,
  reader: Pick<typeof db, "select">,
  agent = recallAgent,
) {
  const recall = {
    ...record,
    products: record.products as RecallText["products"],
  };
  const [candidate] = prefilter([recall], catalog);
  const evidence: Evidence[] = [];
  const skus: string[] = [];
  if (candidate) {
    const budget = new CallBudget(8);
    const match = await agent.match(recall, candidate.candidates, budget, {
      useCache: false,
    });
    if (!match.ok) throw new Error("Recall matching failed");
    const { verified } = verifyMatches(recall, candidate.candidates, match.raw);
    evidence.push({
      step: "MATCH",
      actor: "MODEL",
      model: match.model,
      summary: `Compared CPSC #${record.recallNumber} with ${candidate.candidates.length} catalog products.`,
      detail: { raw: match.raw },
    });
    for (const v of verified) {
      if (v.accepted && !skus.includes(v.sku)) skus.push(v.sku);
      evidence.push({
        step: "MATCH",
        actor: "RULE",
        summary: v.reason,
        detail: v,
      });
    }
    if (skus.length) {
      const result = await agent.investigate(
        recall,
        merchantId,
        skus,
        budget,
        reader,
        true,
      );
      if (!result.byModel) throw new Error("Recall investigation failed");
      for (const call of result.calls)
        evidence.push({
          step: "INVESTIGATE",
          actor: "TOOL",
          summary: call.summary,
          detail: call,
        });
      evidence.push({
        step: "PLAN",
        actor: "MODEL",
        model: result.model,
        summary: result.plan.summary,
        detail: result.plan,
      });
    }
  }
  return { skus, evidence };
}

export type ScanOutcome =
  "draft" | "no-match" | "protected" | "skipped" | "busy" | "unknown";

export async function scanRecall(
  recallNumber: string,
  source: "dashboard" | "cron",
  agent = recallAgent,
): Promise<ScanOutcome> {
  return db.transaction(async (tx) => {
    const [merchant] = await tx
      .select()
      .from(merchants)
      .where(eq(merchants.name, STORE_NAME));
    if (!merchant) throw new Error("Demo store missing");
    const [record] = await tx
      .select()
      .from(recalls)
      .where(eq(recalls.recallNumber, recallNumber));
    if (!record) return "unknown";

    // Two overlapping workers must not spend twice or both insert the first draft.
    const lock = await tx.execute<{ acquired: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtextextended(${merchant.id + ":" + record.id}, 0)) as acquired`,
    );
    if (!lock.rows[0]?.acquired) return "busy";
    const pending = and(
      eq(agentDecisions.merchantId, merchant.id),
      eq(agentDecisions.step, PENDING_SCAN),
      sql`${agentDecisions.detail}->>'recallNumber' = ${recallNumber}`,
    );
    if (source === "cron") {
      const [queued] = await tx
        .select({ id: agentDecisions.id })
        .from(agentDecisions)
        .where(pending)
        .limit(1);
      if (!queued) return "skipped";
    }
    const [existing] = await tx
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.merchantId, merchant.id),
          eq(campaigns.recallId, record.id),
        ),
      );
    if (existing && (existing.status !== "DRAFT" || source === "cron")) {
      await tx.delete(agentDecisions).where(pending);
      return existing.status === "DRAFT" ? "skipped" : "protected";
    }

    const catalog = await tx
      .select()
      .from(products)
      .where(eq(products.merchantId, merchant.id));
    const { skus, evidence } = await assessRecall(
      record,
      catalog,
      merchant.id,
      tx,
      agent,
    );
    let campaignId = existing?.id;
    if (skus.length) {
      if (existing) {
        // Approval may have committed while the agent was working.
        const updated = await tx
          .update(campaigns)
          .set({ matchedSkus: skus })
          .where(
            and(eq(campaigns.id, existing.id), eq(campaigns.status, "DRAFT")),
          )
          .returning({ id: campaigns.id });
        if (!updated.length) return "protected";
      } else {
        const [draft] = await tx
          .insert(campaigns)
          .values({
            merchantId: merchant.id,
            recallId: record.id,
            matchedSkus: skus,
            status: "DRAFT",
          })
          .returning({ id: campaigns.id });
        campaignId = draft.id;
      }
    }
    evidence.push({
      step: "RECALL_SCAN",
      actor: "RULE",
      detail: { recallNumber, source },
      summary: skus.length
        ? `CPSC #${recallNumber} draft ready for merchant review.`
        : `No verified catalog match for CPSC #${recallNumber}.`,
    });
    await tx.insert(agentDecisions).values(
      evidence.map((entry) => ({
        ...entry,
        campaignId,
        merchantId: merchant.id,
      })),
    );
    await tx.delete(agentDecisions).where(pending);
    return skus.length ? "draft" : "no-match";
  });
}
