// "Start fresh demo": puts the demo store back to the moment before the visitor approves the featured
// recall, so the next visitor walks the whole flow from the start.
//
//   cases, notices, ledger rows, sign-in attempts and the approve/notify/claim/settle audit steps
//   are deleted; campaigns go back to DRAFT (their AI matching and investigation are kept, so no AI
//   calls are repeated); buyer links are kept, so links people already hold still work.
//
// A refunded payment cannot be refunded twice, so every order that was refunded gets a brand new
// sandbox payment. Payouts and tracking do not use up a payment, so those orders are left alone.
import { and, eq, inArray } from "drizzle-orm";
import {
  agentDecisions,
  campaigns,
  cases,
  db,
  merchants,
  orders,
  paypalActions,
  recalls,
} from "@/db";
import { approveCampaign } from "./agent/pipeline";
import { FEATURED_RECALL, PRE_APPROVED_BY } from "./demo-config";
import { createCardOrder } from "./paypal-client";
import { COOLDOWN_MS } from "./reset-notice";

const MAX_RECAPTURES = 8;

export type ResetResult =
  | { reset: true; campaigns: number; newPayments: number }
  | { reset: false; reason: "cooldown"; since: number } // since: when the last reset started
  | { reset: false; reason: "no-merchant" };

export async function resetDemo(): Promise<ResetResult> {
  if (process.env.PAYPAL_ENV !== "sandbox") {
    throw new Error("Refusing to reset: PAYPAL_ENV must be 'sandbox'");
  }
  const [merchant] = await db.select().from(merchants).limit(1);
  if (!merchant) return { reset: false, reason: "no-merchant" };

  // Cooldown, kept in the database so it holds across server instances. The marker is written
  // first, so a second click during the reset sees it and does nothing.
  const recent = await db
    .select()
    .from(agentDecisions)
    .where(and(eq(agentDecisions.merchantId, merchant.id), eq(agentDecisions.step, "RESET")));
  const last = Math.max(0, ...recent.map((d) => d.createdAt.getTime()));
  if (Date.now() - last < COOLDOWN_MS) return { reset: false, reason: "cooldown", since: last };
  await db.insert(agentDecisions).values({
    merchantId: merchant.id,
    step: "RESET",
    actor: "TOOL",
    summary: "Demo reset started.",
  });

  const merchantCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.merchantId, merchant.id));
  const campaignIds = merchantCampaigns.map((c) => c.id);
  if (campaignIds.length === 0) return { reset: true, campaigns: 0, newPayments: 0 };

  // Orders whose payment was refunded: found before the ledger rows are deleted below.
  const refunded = await db
    .selectDistinct({ orderId: cases.orderId })
    .from(paypalActions)
    .innerJoin(cases, eq(paypalActions.caseId, cases.id))
    .where(
      and(
        inArray(cases.campaignId, campaignIds),
        eq(paypalActions.op, "REFUND"),
        eq(paypalActions.status, "SUCCEEDED"),
      ),
    );

  // Deleting a case also deletes its notice, ledger rows, sign-in attempts and case-level steps.
  await db.delete(cases).where(inArray(cases.campaignId, campaignIds));
  await db
    .delete(agentDecisions)
    .where(
      and(
        inArray(agentDecisions.campaignId, campaignIds),
        inArray(agentDecisions.step, ["APPROVE", "NOTIFY", "CLAIM", "SETTLE"]),
      ),
    );
  await db
    .update(campaigns)
    .set({ status: "DRAFT", approvedAt: null })
    .where(inArray(campaigns.id, campaignIds));

  // Fresh sandbox payments, one at a time (PayPal calls are rate limited).
  let newPayments = 0;
  for (const { orderId } of refunded.slice(0, MAX_RECAPTURES)) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) continue;
    const { orderId: paypalOrderId, captureId } = await createCardOrder(
      order.amountCents,
      `Brightnest Home order ${order.id.slice(0, 8)}`,
      `reset-capture-${order.id}-${Date.now()}`, // new on purpose: this must be a new payment
    );
    await db
      .update(orders)
      .set({ paypalOrderId, paypalCaptureId: captureId })
      .where(eq(orders.id, order.id));
    newPayments += 1;
  }

  // Every recall except the featured one is approved in advance, as if the store had handled it
  // earlier. The visitor approves the featured one themselves. Approving only opens cases and queues
  // notices (the AI draft is cached); it moves no money.
  const rows = await db
    .select({ campaign: campaigns, recallNumber: recalls.recallNumber })
    .from(campaigns)
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(inArray(campaigns.id, campaignIds));
  const preApproved = rows.filter((r) => r.recallNumber !== FEATURED_RECALL);
  for (const r of preApproved) {
    await approveCampaign(r.campaign.id, PRE_APPROVED_BY, "set up in advance for the demo");
  }

  await db.insert(agentDecisions).values({
    merchantId: merchant.id,
    step: "RESET",
    actor: "TOOL",
    summary: `Demo reset: ${campaignIds.length} campaigns, ${preApproved.length} approved in advance, ${newPayments} new sandbox payment(s).`,
  });
  return { reset: true, campaigns: campaignIds.length, newPayments };
}
