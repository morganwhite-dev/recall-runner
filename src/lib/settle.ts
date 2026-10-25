// Turns verified PayPal webhook events into "settled" cases.
//
// When the executor calls PayPal it only learns that PayPal accepted the request. The webhook is
// PayPal telling us, later and on its own, that the money really moved. A case becomes settled
// (cases.settled_at) only when a verified event names the same PayPal id we stored for it.
import { and, eq, isNull } from "drizzle-orm";
import { agentDecisions, campaigns, cases, db } from "@/db";

export type PayPalEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
};

export type Settlement = { kind: "REFUND" | "PAYOUT"; ref: string };

// Which stored case an event is about. Pure function, so it can be tested without PayPal.
//   refund completed        -> resource.id is the refund id we stored as paypal_ref
//   payout item succeeded   -> resource.payout_batch_id is the batch id we stored
//   payout batch succeeded  -> resource.batch_header.payout_batch_id is the same batch id
export function settlementFor(event: PayPalEvent): Settlement | null {
  const r = event.resource ?? {};
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.REFUND.COMPLETED":
      return typeof r.id === "string" ? { kind: "REFUND", ref: r.id } : null;
    case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
      return typeof r.payout_batch_id === "string"
        ? { kind: "PAYOUT", ref: r.payout_batch_id }
        : null;
    case "PAYMENT.PAYOUTSBATCH.SUCCESS": {
      const header = r.batch_header as
        { payout_batch_id?: unknown } | undefined;
      return typeof header?.payout_batch_id === "string"
        ? { kind: "PAYOUT", ref: header.payout_batch_id }
        : null;
    }
    default:
      return null;
  }
}

// Marks the matching case settled. Safe to run again: an already settled case is left alone.
// Returns the case id when this call settled it, otherwise null.
export async function settleFromEvent(
  event: PayPalEvent,
): Promise<string | null> {
  const target = settlementFor(event);
  if (!target) return null;

  const doneStatus = target.kind === "REFUND" ? "REFUNDED" : "PAYOUT_SENT";
  const [settled] = await db
    .update(cases)
    .set({ settledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(cases.paypalRef, target.ref),
        eq(cases.status, doneStatus),
        isNull(cases.settledAt),
      ),
    )
    .returning();
  if (!settled) return null;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, settled.campaignId));
  await db.insert(agentDecisions).values({
    merchantId: campaign.merchantId,
    campaignId: campaign.id,
    caseId: settled.id,
    step: "SETTLE",
    actor: "TOOL",
    summary:
      target.kind === "REFUND"
        ? "PayPal confirmed the refund went through (verified webhook). Case settled."
        : "PayPal confirmed the payout was delivered (verified webhook). Case settled.",
    detail: { event: event.event_type, eventId: event.id },
  });
  return settled.id;
}
