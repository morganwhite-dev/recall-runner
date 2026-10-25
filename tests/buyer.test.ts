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
