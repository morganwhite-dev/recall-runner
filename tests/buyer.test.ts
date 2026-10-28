// Tests for the two pure checks behind Phase 4: is this the buyer who paid, and which stored
// case does a PayPal webhook event belong to. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { emailsMatch, verifiedPayPalEmail } from "../src/lib/buyer";
import { settlementFor } from "../src/lib/settle";

test("a verified PayPal email is accepted, ignoring case", () => {
  const verified = verifiedPayPalEmail({ email: "Buyer@Example.com", email_verified: true });
  assert.equal(verified, "buyer@example.com");
  assert.equal(emailsMatch("  buyer@example.COM ", verified), true);
});

test("an email PayPal has not verified is never accepted", () => {
  assert.equal(verifiedPayPalEmail({ email: "buyer@example.com", email_verified: false }), null);
  assert.equal(verifiedPayPalEmail({ email: "buyer@example.com" }), null);
  assert.equal(emailsMatch("buyer@example.com", null), false);
});

test("a different PayPal account does not match the order", () => {
  const verified = verifiedPayPalEmail({ email: "someone.else@example.com", email_verified: "true" });
  assert.equal(emailsMatch("buyer@example.com", verified), false);
});

test("an emails list counts only if the primary one is confirmed", () => {
  const ok = { emails: [{ value: "a@example.com", primary: true, confirmed: true }] };
  const bad = { emails: [{ value: "a@example.com", primary: true, confirmed: false }] };
  assert.equal(verifiedPayPalEmail(ok), "a@example.com");
  assert.equal(verifiedPayPalEmail(bad), null);
});

test("a refund event points at the refund id", () => {
  assert.deepEqual(
    settlementFor({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "R1" } }),
    { kind: "REFUND", ref: "R1" },
  );
});

test("payout item and batch events point at the payout batch id", () => {
  assert.deepEqual(
    settlementFor({ event_type: "PAYMENT.PAYOUTS-ITEM.SUCCEEDED", resource: { payout_batch_id: "B1" } }),
    { kind: "PAYOUT", ref: "B1" },
  );
  assert.deepEqual(
    settlementFor({
      event_type: "PAYMENT.PAYOUTSBATCH.SUCCESS",
      resource: { batch_header: { payout_batch_id: "B2" } },
    }),
    { kind: "PAYOUT", ref: "B2" },
  );
});

test("other events, or events with no id, settle nothing", () => {
  assert.equal(settlementFor({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "X" } }), null);
  assert.equal(settlementFor({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: {} }), null);
  assert.equal(settlementFor({ event_type: "PAYMENT.CAPTURE.REFUNDED" }), null);
});

// ---- failures and retries ----
import { failureFor, limboFor } from "../src/lib/settle";
import { isDefiniteFailure, requestIdFor } from "../src/lib/retry";

test("a failed, blocked or returned payout names the batch we stored, so the case can be reopened", () => {
  for (const type of ["FAILED", "BLOCKED", "RETURNED"]) {
    const f = failureFor({
      event_type: `PAYMENT.PAYOUTS-ITEM.${type}`,
      resource: { payout_batch_id: "B9" },
    });
    assert.deepEqual([f?.kind, f?.ref], ["PAYOUT", "B9"]);
  }
});

test("a failed refund names the refund id, and PayPal's own error text is used when it sends one", () => {
  const f = failureFor({
    event_type: "PAYMENT.REFUND.FAILED",
    resource: { id: "R9", errors: { message: "Account closed" } },
  });
  assert.equal(f?.ref, "R9");
  assert.match(f?.reason ?? "", /Account closed/);
});

test("unclaimed or held payouts are only noted, never treated as failures that allow a second payment", () => {
  const unclaimed = { event_type: "PAYMENT.PAYOUTS-ITEM.UNCLAIMED", resource: { payout_batch_id: "B1" } };
  assert.equal(failureFor(unclaimed), null);
  assert.equal(limboFor(unclaimed)?.ref, "B1");
  assert.equal(limboFor({ event_type: "PAYMENT.PAYOUTS-ITEM.HELD", resource: { payout_batch_id: "B2" } })?.ref, "B2");
  assert.equal(limboFor({ event_type: "PAYMENT.PAYOUTS-ITEM.SUCCEEDED", resource: { payout_batch_id: "B3" } }), null);
});

test("failure events with no id, and success events, are not failures", () => {
  assert.equal(failureFor({ event_type: "PAYMENT.PAYOUTS-ITEM.FAILED", resource: {} }), null);
  assert.equal(failureFor({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "R1" } }), null);
});

test("the first try and any try with an unknown outcome reuse the same PayPal request id", () => {
  assert.equal(requestIdFor("c1", "PAYOUT", []), "case-c1-payout");
  const timeout = { status: "FAILED", httpStatus: 0, response: { issue: "timeout" } };
  const server = { status: "FAILED", httpStatus: 503, response: null };
  const pending = { status: "PENDING", httpStatus: null, response: null };
  assert.equal(requestIdFor("c1", "PAYOUT", [timeout, server, pending]), "case-c1-payout");
});

test("after a definite failure the retry gets a fresh request id, one more for each failure", () => {
  const rejected = { status: "FAILED", httpStatus: 422, response: { issue: "x" } };
  const told = { status: "FAILED", httpStatus: null, response: { failure: { reason: "returned" } } };
  assert.equal(isDefiniteFailure(rejected), true);
  assert.equal(isDefiniteFailure(told), true);
  assert.equal(isDefiniteFailure({ status: "SUCCEEDED", httpStatus: 201, response: null }), false);
  assert.equal(requestIdFor("c1", "REFUND", [rejected]), "case-c1-refund-retry1");
  assert.equal(requestIdFor("c1", "REFUND", [rejected, told]), "case-c1-refund-retry2");
});

// ---- a replayed PayPal callback ----
import { replayDestination } from "../src/lib/replay";

const FIN = ["REFUNDED", "PAYOUT_SENT", "REPLACEMENT_SHIPPED", "REPAIR_KIT_REQUESTED"];
const used = { buyerId: "b1", usedAt: new Date("2026-10-25T12:00:00Z") };

test("a replayed sign-in whose recalls are all settled goes back to the success view", () => {
  const cases = [{ id: "c1", status: "REFUNDED" }, { id: "c2", status: "PAYOUT_SENT" }];
  assert.equal(replayDestination(used, "b1", cases, FIN), "?done=c1,c2");
});

test("a replay never succeeds for another buyer, an unused sign-in, or an unfinished case", () => {
  const done = [{ id: "c1", status: "REFUNDED" }];
  assert.equal(replayDestination(used, "b2", done, FIN), null);
  assert.equal(replayDestination(used, null, done, FIN), null);
  assert.equal(replayDestination({ ...used, usedAt: null }, "b1", done, FIN), null);
  assert.equal(replayDestination(used, "b1", [...done, { id: "c2", status: "OPEN" }], FIN), null);
  assert.equal(replayDestination(used, "b1", [], FIN), null);
});
