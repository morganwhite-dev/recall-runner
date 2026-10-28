// Turns verified PayPal webhook events into "settled" cases.
//
// When the executor calls PayPal it only learns that PayPal accepted the request. The webhook is
// PayPal telling us, later and on its own, that the money really moved. A case becomes settled
// (cases.settled_at) only when a verified event names the same PayPal id we stored for it.
import { and, eq, isNull, sql } from "drizzle-orm";
import { agentDecisions, campaigns, cases, db, paypalActions } from "@/db";

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

// ---- When PayPal says the money did NOT arrive -------------------------------------------------
//
// PayPal accepting a request is not the end: a payout can later fail, be blocked or be returned,
// and a refund can fail. Those events are as important as the happy ones, or a case would sit on
// "Waiting on PayPal" forever.

export type Failure = {
  kind: "REFUND" | "PAYOUT";
  ref: string;
  reason: string; // plain English, shown on the dashboard
};

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);

// PayPal's error detail when it sends one (`errors.message`), else our own plain wording.
function detail(r: Record<string, unknown>): string | null {
  const errors = r.errors as { message?: unknown; name?: unknown } | undefined;
  return str(errors?.message) ?? str(errors?.name);
}

// Events that mean the buyer did not get the money, so the case can safely be tried again.
//   payout item failed / blocked / returned -> resource.payout_batch_id is the batch id we stored
//   refund failed                           -> resource.id is the refund id we stored
// Event names are from PayPal's webhook event list. PayPal's page does not spell out the fields
// of each payout event; payout_batch_id is the one we already rely on for the success event, and
// `errors` is only used for wording, so a missing field never breaks matching.
export function failureFor(event: PayPalEvent): Failure | null {
  const r = event.resource ?? {};
  const why = detail(r);
  switch (event.event_type) {
    case "PAYMENT.PAYOUTS-ITEM.FAILED":
      return payoutFailure(
        r,
        `PayPal could not deliver the payout${why ? `: ${why}` : ""}.`,
      );
    case "PAYMENT.PAYOUTS-ITEM.BLOCKED":
      return payoutFailure(
        r,
        `PayPal blocked the payout${why ? `: ${why}` : ""}.`,
      );
    case "PAYMENT.PAYOUTS-ITEM.RETURNED":
      return payoutFailure(
        r,
        "The payout was returned to the store, so the buyer did not receive it.",
      );
    case "PAYMENT.REFUND.FAILED": {
      const id = str(r.id);
      return id
        ? {
            kind: "REFUND",
            ref: id,
            reason: `PayPal could not complete the refund${why ? `: ${why}` : ""}.`,
          }
        : null;
    }
    default:
      return null;
  }
}

function payoutFailure(
  r: Record<string, unknown>,
  reason: string,
): Failure | null {
  const batch = str(r.payout_batch_id);
  return batch ? { kind: "PAYOUT", ref: batch, reason } : null;
}

// Events where the money is in limbo, not lost: the recipient has no PayPal account yet or PayPal
// is holding the payout. These are only NOTED. Trying again here could pay twice if the buyer
// claims the first one later, so the case is not reopened.
export function limboFor(event: PayPalEvent): Failure | null {
  const batch = str((event.resource ?? {}).payout_batch_id);
  if (!batch) return null;
  switch (event.event_type) {
    case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
      return {
        kind: "PAYOUT",
        ref: batch,
        reason:
          "The payout is unclaimed: the recipient has no PayPal account for this email yet. PayPal holds it and returns it to the store if it is never claimed.",
      };
    case "PAYMENT.PAYOUTS-ITEM.HELD":
      return {
        kind: "PAYOUT",
        ref: batch,
        reason: "PayPal is holding the payout for review.",
      };
    default:
      return null;
  }
}

// Marks the matching case FAILED (it was accepted by PayPal and not yet settled), marks its ledger
// row FAILED with the reason, and writes one line on the audit trail. Running it twice does nothing
// the second time. Returns the case id when this call changed it.
export async function failFromEvent(
  event: PayPalEvent,
): Promise<string | null> {
  const failure = failureFor(event);
  if (!failure) return null;

  const acceptedStatus = failure.kind === "REFUND" ? "REFUNDED" : "PAYOUT_SENT";
  const [failed] = await db
    .update(cases)
    .set({ status: "FAILED", updatedAt: new Date() })
    .where(
      and(
        eq(cases.paypalRef, failure.ref),
        eq(cases.status, acceptedStatus),
        isNull(cases.settledAt),
      ),
    )
    .returning();
  if (!failed) return null;

  // Keep what we stored, and add what PayPal told us. `failure` is also how a later retry knows
  // the first attempt definitely did not go through.
  await db
    .update(paypalActions)
    .set({
      status: "FAILED",
      response: sql`coalesce(${paypalActions.response}, '{}'::jsonb) || ${JSON.stringify(
        {
          failure: {
            event: event.event_type,
            eventId: event.id,
            reason: failure.reason,
          },
        },
      )}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paypalActions.caseId, failed.id),
        eq(paypalActions.paypalRef, failure.ref),
      ),
    );

  await logSettleStep(failed.campaignId, failed.id, failure.reason, event);
  return failed.id;
}

// Notes a limbo event on the audit trail once per PayPal event (PayPal resends events).
export async function noteLimbo(event: PayPalEvent): Promise<string | null> {
  const limbo = limboFor(event);
  if (!limbo) return null;
  const [kase] = await db
    .select()
    .from(cases)
    .where(
      and(
        eq(cases.paypalRef, limbo.ref),
        eq(cases.status, "PAYOUT_SENT"),
        isNull(cases.settledAt),
      ),
    );
  if (!kase) return null;
  const already = await db
    .select()
    .from(agentDecisions)
    .where(
      and(
        eq(agentDecisions.caseId, kase.id),
        eq(agentDecisions.step, "SETTLE"),
      ),
    );
  if (
    already.some(
      (d) => (d.detail as { eventId?: string } | null)?.eventId === event.id,
    )
  )
    return null;
  await logSettleStep(kase.campaignId, kase.id, limbo.reason, event);
  return kase.id;
}

async function logSettleStep(
  campaignId: string,
  caseId: string,
  summary: string,
  event: PayPalEvent,
) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));
  await db.insert(agentDecisions).values({
    merchantId: campaign.merchantId,
    campaignId,
    caseId,
    step: "SETTLE",
    actor: "TOOL",
    summary,
    detail: { event: event.event_type, eventId: event.id },
  });
}

// Everything the webhook route does with a verified event: settle, or record a failure, or note
// a payout in limbo. Safe to run again for the same event.
export async function handleVerifiedEvent(
  event: PayPalEvent,
): Promise<{
  outcome: "settled" | "failed" | "noted" | "ignored";
  caseId: string | null;
}> {
  const settled = await settleFromEvent(event);
  if (settled) return { outcome: "settled", caseId: settled };
  const failed = await failFromEvent(event);
  if (failed) return { outcome: "failed", caseId: failed };
  const noted = await noteLimbo(event);
  if (noted) return { outcome: "noted", caseId: noted };
  return { outcome: "ignored", caseId: null };
}
