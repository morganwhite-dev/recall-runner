// The executor: carries out the policy engine's decision for one case, at most once.
//
//   approved campaign? -> buyer chose? -> policy decides -> decision saved -> ledger row PENDING
//   -> PayPal call (with a fixed request id) -> ledger SUCCEEDED or FAILED -> case status updated
//
// Running it twice on the same case is safe: a finished case returns its earlier result, and a
// retried PayPal call reuses the same request id, which PayPal treats as the same request.
import { and, eq } from "drizzle-orm";
import {
  buyers,
  campaigns,
  cases,
  db,
  orderItems,
  orders,
  paypalActions,
  recalls,
} from "@/db";
import { decideRemedy, type BuyerChoice, type Decision } from "./policy";
import {
  addTracking,
  PayPalError,
  refundCapture,
  sendPayout,
} from "./paypal-client";

const FINISHED = [
  "REFUNDED",
  "PAYOUT_SENT",
  "REPLACEMENT_SHIPPED",
  "REPAIR_KIT_REQUESTED",
];

export type ExecutionResult = {
  caseId: string;
  status: string;
  decision?: Decision;
  paypalRef?: string | null;
  alreadyDone?: boolean;
  error?: string;
};

export async function executeCase(caseId: string): Promise<ExecutionResult> {
  const [row] = await db
    .select({
      kase: cases,
      order: orders,
      buyer: buyers,
      campaign: campaigns,
      recall: recalls,
    })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(eq(cases.id, caseId));
  if (!row) throw new Error(`Case ${caseId} not found`);
  const { kase, order, buyer, campaign, recall } = row;

  // Already done: return what happened before, touch nothing.
  if (FINISHED.includes(kase.status)) {
    return {
      caseId,
      status: kase.status,
      paypalRef: kase.paypalRef,
      alreadyDone: true,
    };
  }

  // Human approval gate: the merchant must approve the campaign before anything happens.
  if (campaign.status !== "APPROVED") {
    return {
      caseId,
      status: kase.status,
      error: "Campaign is not approved by the merchant yet",
    };
  }
  if (!kase.choice) {
    return {
      caseId,
      status: kase.status,
      error: "The buyer has not chosen a remedy yet",
    };
  }

  // The amount is the recalled product's line on this order, read from the database.
  const lines = await db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, order.id),
        eq(orderItems.productId, kase.productId),
      ),
    );
  const lineAmountCents = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPriceCents,
    0,
  );

  const decision = decideRemedy({
    choice: kase.choice as BuyerChoice,
    remedyOptions: recall.remedyOptions,
    orderDate: order.effectiveOrderDate,
    now: new Date(),
    lineAmountCents,
    orderTotalCents: order.amountCents,
    hasCapture: Boolean(order.paypalCaptureId && order.paypalOrderId),
  });

  const save = async (status: string, paypalRef: string | null = null) => {
    await db
      .update(cases)
      .set({
        status,
        action: decision.action,
        ruleApplied: decision.rule,
        rationale: decision.rationale,
        amountCents: decision.amountCents,
        paypalRef,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, caseId));
    return { caseId, status, decision, paypalRef };
  };

  if (decision.action === "REJECT") return save("REJECTED");
  if (decision.action === "REPAIR_NOTICE") return save("REPAIR_KIT_REQUESTED");

  // From here on, PayPal is called. One fixed request id per case and action.
  const requestId = `case-${caseId}-${decision.action.toLowerCase()}`;
  const [previous] = await db
    .select()
    .from(paypalActions)
    .where(eq(paypalActions.requestId, requestId));
  const doneStatus = {
    REFUND: "REFUNDED",
    PAYOUT: "PAYOUT_SENT",
    TRACKING: "REPLACEMENT_SHIPPED",
  }[decision.action];
  if (previous?.status === "SUCCEEDED")
    return {
      ...(await save(doneStatus, previous.paypalRef)),
      alreadyDone: true,
    };

  if (!previous) {
    await db
      .insert(paypalActions)
      .values({ caseId, op: decision.action, requestId })
      .onConflictDoNothing();
  }

  try {
    let paypalRef: string;
    let response: unknown;
    if (decision.action === "REFUND") {
      const r = await refundCapture(
        order.paypalCaptureId!,
        decision.amountCents,
        requestId,
        decision.rationale,
      );
      paypalRef = r.refundId;
      response = { id: r.refundId, status: r.status };
    } else if (decision.action === "PAYOUT") {
      // Phase 4 replaces this with the email PayPal verified when the buyer signed in.
      const r = await sendPayout(
        buyer.email,
        decision.amountCents,
        requestId,
        decision.rationale,
      );
      paypalRef = r.batchId;
      response = { batch_id: r.batchId, status: r.status };
    } else {
      const trackingNumber = `BH-${caseId.slice(0, 8).toUpperCase()}`; // same number on every retry
      await addTracking(
        order.paypalOrderId!,
        order.paypalCaptureId!,
        trackingNumber,
        requestId,
      );
      paypalRef = trackingNumber;
      response = { tracking_number: trackingNumber };
    }

    await db
      .update(paypalActions)
      .set({ status: "SUCCEEDED", paypalRef, response, updatedAt: new Date() })
      .where(eq(paypalActions.requestId, requestId));
    return save(doneStatus, paypalRef);
  } catch (err) {
    const e =
      err instanceof PayPalError ? err : new PayPalError(String(err), 0);
    await db
      .update(paypalActions)
      .set({
        status: "FAILED",
        httpStatus: e.status,
        response: { issue: e.issue, message: e.message },
        updatedAt: new Date(),
      })
      .where(eq(paypalActions.requestId, requestId));
    const result = await save("FAILED");
    return { ...result, error: e.message };
  }
}
