// The agent's conductor. Runs the steps in a fixed order and writes each one to the audit trail
// (agent_decisions), tagged MODEL, RULE, TOOL or YOU, which feeds "Why this happened".
//
//   runScan:          DETECT (rule) -> MATCH (model, checked by rule) -> DRAFT campaign
//                     -> INVESTIGATE + PLAN (model with read-only tools) -> waits for the merchant
//   approveCampaign:  APPROVE (you) -> open cases (tool) -> NOTIFY (model drafts, rule checks)
//
// Money is never moved here. The executor (src/lib/executor.ts) does that, through the policy
// engine, after a buyer chooses a remedy.
import { and, eq, inArray } from "drizzle-orm";
import {
  agentDecisions,
  buyers,
  campaigns,
  cases,
  db,
  merchants,
  notices,
  orderItems,
  orders,
  products,
  recalls,
} from "@/db";
import { buyerUrl, ensureBuyerLink } from "../buyer";
import { investigateCampaign } from "./investigate";
import { AGENT_MODEL, CallBudget } from "./llm";
import {
  matchRecall,
  prefilter,
  verifyMatches,
  type ProductText,
  type RecallText,
} from "./match";
import { assembleNotice, draftSlots } from "./notice";

export const MAX_MATCH_CALLS = 8; // AI calls allowed for matching in one scan
export const MAX_CALLS_PER_CAMPAIGN = 12;

type Actor = "MODEL" | "RULE" | "TOOL" | "YOU";
async function log(entry: {
  merchantId: string;
  campaignId?: string | null;
  step: string;
  actor: Actor;
  summary: string;
  detail?: unknown;
  model?: string | null;
}) {
  await db.insert(agentDecisions).values({
    merchantId: entry.merchantId,
    campaignId: entry.campaignId ?? null,
    step: entry.step,
    actor: entry.actor,
    summary: entry.summary,
    detail: entry.detail ?? null,
    model: entry.model ?? null,
  });
}

export type ScanResult = {
  checked: number;
  candidates: number;
  campaigns: { campaignId: string; recallNumber: string; skus: string[] }[];
  refused: { recallNumber: string; reason: string }[];
};

export async function runScan(
  merchantId: string,
  options: { useCache?: boolean } = {},
): Promise<ScanResult> {
  const allRecalls = await db.select().from(recalls);
  const catalog = await db
    .select()
    .from(products)
    .where(eq(products.merchantId, merchantId));
  const recallTexts: (RecallText & { id: string })[] = allRecalls.map((r) => ({
    id: r.id,
    recallNumber: r.recallNumber,
    title: r.title,
    description: r.description,
    hazards: r.hazards,
    products: r.products as { name: string; type: string }[],
  }));
  const catalogTexts: ProductText[] = catalog.map((p) => ({
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  // DETECT (RULE): cheap word overlap decides which recalls are worth an AI call.
  let candidates = prefilter(recallTexts, catalogTexts);
  candidates.sort(
    (a, b) =>
      Math.max(...Object.values(b.shared).map((w) => w.length)) -
      Math.max(...Object.values(a.shared).map((w) => w.length)),
  );
  const skipped = candidates.slice(MAX_MATCH_CALLS);
  candidates = candidates.slice(0, MAX_MATCH_CALLS);
  await log({
    merchantId,
    step: "DETECT",
    actor: "RULE",
    summary: `Checked ${allRecalls.length} CPSC recalls against ${catalog.length} products; ${candidates.length} share enough words to review${skipped.length ? `, ${skipped.length} more skipped by the call limit` : ""}.`,
    detail: {
      candidates: candidates.map((c) => ({
        recall: c.recall.recallNumber,
        shared: c.shared,
      })),
    },
  });

  const budget = new CallBudget(MAX_MATCH_CALLS);
  const result: ScanResult = {
    checked: allRecalls.length,
    candidates: candidates.length,
    campaigns: [],
    refused: [],
  };

  for (const cand of candidates) {
    const recall = cand.recall as RecallText & { id: string };
    const ai = await matchRecall(recall, cand.candidates, budget, options);

    let accepted: { sku: string; confidence: number | null; reason: string }[] =
      [];
    let modelEntry: Parameters<typeof log>[0] | null = null;
    let ruleEntries: Parameters<typeof log>[0][] = [];

    if (ai.ok) {
      const { verified, unknownSkus } = verifyMatches(
        recall,
        cand.candidates,
        ai.raw,
      );
      accepted = verified
        .filter((v) => v.accepted)
        .map((v) => ({
          sku: v.sku,
          confidence: v.confidence,
          reason: v.reason,
        }));
      const best = verified.find((v) => v.accepted) ?? verified[0];
      modelEntry = {
        merchantId,
        step: "MATCH",
        actor: "MODEL",
        model: ai.model,
        summary: best
          ? `Compared recall #${recall.recallNumber} with ${cand.candidates.length} product${cand.candidates.length > 1 ? "s" : ""}. ${best.verifiedEvidence[0] ? `Evidence: "${best.verifiedEvidence[0].recall_quote}" / "${best.verifiedEvidence[0].catalog_quote}".` : "No verifiable evidence."}`
          : `Compared recall #${recall.recallNumber} with ${cand.candidates.length} product${cand.candidates.length > 1 ? "s" : ""}: none is the recalled product.`,
        detail: { raw: ai.raw, cached: ai.cached },
      };
      ruleEntries = verified.map((v) => ({
        merchantId,
        step: "MATCH",
        actor: "RULE" as const,
        summary: v.reason,
        detail: v,
      }));
      if (unknownSkus.length) {
        ruleEntries.push({
          merchantId,
          step: "MATCH",
          actor: "RULE",
          summary: `Dropped products the AI named that aren't in the catalog: ${unknownSkus.join(", ")}.`,
        });
      }
    } else {
      // Fallback RULE: only exact brand-in-title plus strong word overlap counts.
      accepted = cand.candidates
        .filter(
          (p) =>
            recall.title.toLowerCase().includes(p.brand.toLowerCase()) &&
            (cand.shared[p.sku]?.length ?? 0) >= 3,
        )
        .map((p) => ({
          sku: p.sku,
          confidence: null,
          reason: `${p.name}: brand "${p.brand}" appears in the recall title (rule match, AI unavailable).`,
        }));
      ruleEntries = [
        {
          merchantId,
          step: "MATCH",
          actor: "RULE",
          summary: `AI unavailable (${ai.reason}); used the strict brand rule instead. ${accepted.length ? accepted.map((a) => a.reason).join(" ") : "No match."}`,
          detail: { reason: ai.reason, message: ai.message },
        },
      ];
    }

    if (accepted.length === 0) {
      for (const e of [modelEntry, ...ruleEntries]) if (e) await log(e);
      result.refused.push({
        recallNumber: recall.recallNumber,
        reason: ruleEntries.map((e) => e.summary).join(" "),
      });
      continue;
    }

    // DRAFT campaign (reuse an open one for the same recall).
    const skus = accepted.map((a) => a.sku);
    const [existing] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.merchantId, merchantId),
          eq(campaigns.recallId, recall.id),
        ),
      );
    const campaign =
      existing ??
      (
        await db
          .insert(campaigns)
          .values({ merchantId, recallId: recall.id, matchedSkus: skus })
          .returning()
      )[0];
    for (const e of [modelEntry, ...ruleEntries])
      if (e) await log({ ...e, campaignId: campaign.id });
    result.campaigns.push({
      campaignId: campaign.id,
      recallNumber: recall.recallNumber,
      skus,
    });
    if (existing) continue;

    // INVESTIGATE + PLAN (MODEL with read-only tools).
    const plan = await investigateCampaign(
      campaign.id,
      new CallBudget(MAX_CALLS_PER_CAMPAIGN),
    );
    for (const call of plan.calls) {
      await log({
        merchantId,
        campaignId: campaign.id,
        step: "INVESTIGATE",
        actor: "TOOL",
        summary: call.summary,
        detail: call,
      });
    }
    await log({
      merchantId,
      campaignId: campaign.id,
      step: "PLAN",
      actor: plan.byModel ? "MODEL" : "RULE",
      model: plan.model ?? null,
      summary: plan.byModel
        ? plan.plan.summary
        : `Plan built by code (${plan.fallbackReason}). ${plan.plan.summary}`,
      detail: plan.plan,
    });
  }
  return result;
}

export async function approveCampaign(
  campaignId: string,
  approvedBy = "merchant",
) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, campaign.merchantId));
  const [recall] = await db
    .select()
    .from(recalls)
    .where(eq(recalls.id, campaign.recallId));

  if (campaign.status !== "APPROVED") {
    await db
      .update(campaigns)
      .set({ status: "APPROVED", approvedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    await log({
      merchantId: campaign.merchantId,
      campaignId,
      step: "APPROVE",
      actor: "YOU",
      summary: `Campaign approved by ${merchant.name}.`,
      detail: { approvedBy },
    });
  }

  // One case per order line that contains a matched product.
  const lines = await db
    .select({
      orderId: orders.id,
      productId: products.id,
      productName: products.name,
      buyerId: buyers.id,
      buyerName: buyers.name,
      lineCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id))
    .where(
      and(
        eq(orders.merchantId, campaign.merchantId),
        inArray(products.sku, campaign.matchedSkus),
      ),
    );

  const opened = await db
    .insert(cases)
    .values(
      lines.map((l) => ({
        campaignId,
        orderId: l.orderId,
        productId: l.productId,
      })),
    )
    .onConflictDoNothing()
    .returning();
  await log({
    merchantId: campaign.merchantId,
    campaignId,
    step: "NOTIFY",
    actor: "TOOL",
    summary: `Found ${lines.length} affected order${lines.length === 1 ? "" : "s"} in PayPal order records and opened ${opened.length} case${opened.length === 1 ? "" : "s"}.`,
  });

  // NOTIFY: one AI draft per campaign, checked, then personalised per buyer by code.
  const allCases = await db
    .select()
    .from(cases)
    .where(eq(cases.campaignId, campaignId));
  const productName = lines[0]?.productName ?? "product";
  const noticeRecall = {
    recallNumber: recall.recallNumber,
    title: recall.title,
    hazards: recall.hazards,
    remedyText: recall.remedyText,
    remedyOptions: recall.remedyOptions,
    productName,
  };
  const draft = await draftSlots(noticeRecall, new CallBudget(2));
  await log({
    merchantId: campaign.merchantId,
    campaignId,
    step: "NOTIFY",
    actor: draft.byModel ? "MODEL" : "RULE",
    model: draft.model ?? null,
    summary: draft.byModel
      ? "Drafted the buyer notice from the CPSC record; hazard and remedy quoted word for word."
      : `Used the plain notice template (${draft.fallbackReason}).`,
    detail: draft.slots,
  });

  let queued = 0;
  for (const k of allCases) {
    const line = lines.find(
      (l) => l.orderId === k.orderId && l.productId === k.productId,
    );
    if (!line) continue;
    // Each buyer has one private link; every notice for that buyer carries the same one.
    const link = buyerUrl(await ensureBuyerLink(line.buyerId));
    const assembled = assembleNotice({
      slots: draft.slots,
      recall: noticeRecall,
      buyerName: line.buyerName,
      storeName: merchant.name,
      amountCents: line.lineCents * line.quantity,
    });
    const subject = assembled.subject;
    const body = assembled.body.replace("{{BUYER_LINK}}", link);
    const inserted = await db
      .insert(notices)
      .values({
        caseId: k.id,
        subject,
        body,
        hazardQuote: draft.slots.hazard_quote,
        remedyQuote: draft.slots.remedy_quote,
        draftedBy: draft.byModel ? "MODEL" : "TEMPLATE",
        fallbackReason: draft.fallbackReason ?? null,
      })
      .onConflictDoNothing()
      .returning();
    queued += inserted.length;
  }
  await log({
    merchantId: campaign.merchantId,
    campaignId,
    step: "NOTIFY",
    actor: "TOOL",
    summary: `Queued ${queued} notice${queued === 1 ? "" : "s"} in the outbox (demo delivery, no real email).`,
  });
  return {
    cases: allCases.length,
    noticesQueued: queued,
    draftedByModel: draft.byModel,
    model: AGENT_MODEL,
  };
}
