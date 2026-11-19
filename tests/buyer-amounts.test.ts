// Tests that the buyer page promises the amount the rules will really pay, including when the store
// already refunded part of the price. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { BuyerCase } from "../src/lib/buyer";
import { dueCents, groupAmount, howPaid, remedyAmount, remedyCopy } from "../src/app/r/[token]/data";

function kase(over: Partial<BuyerCase> = {}): BuyerCase {
  return { priceCents: 3400, refundedCents: 0, daysAgo: 120, ...over } as BuyerCase;
}

test("a normal order is promised the full price", () => {
  assert.equal(dueCents(kase()), 3400);
  assert.equal(remedyAmount(kase(), "refund"), "$34.00");
  assert.equal(remedyCopy("refund", [kase()]).name, "Full refund");
});

test("a partly refunded order is promised only what is left, and says so", () => {
  const c = kase({ refundedCents: 1000 });
  assert.equal(dueCents(c), 2400);
  assert.equal(remedyAmount(c, "refund"), "$24.00");
  assert.equal(groupAmount([c], "refund"), "$24.00");
  assert.equal(remedyCopy("refund", [c]).name, "Refund of what's left");
  assert.match(howPaid(c, "refund") ?? "", /\$10\.00 already refunded; rest refunded to PayPal/);
});

test("several orders add up what is left on each", () => {
  const total = groupAmount([kase(), kase({ refundedCents: 1000 })], "refund");
  assert.equal(total, "$58.00");
});

test("a fully refunded order is promised nothing, never a negative", () => {
  assert.equal(dueCents(kase({ refundedCents: 9999 })), 0);
});

test("non-money remedies are still free, whatever was refunded", () => {
  assert.equal(remedyAmount(kase({ refundedCents: 1000 }), "replace"), "Free");
});

test("an old partly refunded order says it is paid by Payouts", () => {
  assert.match(howPaid(kase({ daysAgo: 250, refundedCents: 400 }), "refund") ?? "", /rest paid by PayPal Payouts/);
});

test("pre-confirmation labels distinguish refunds, payouts, and groups that use both", () => {
  const recent = kase({ daysAgo: 179 });
  const old = kase({ daysAgo: 250 });
  assert.equal(remedyCopy("refund", [kase({ daysAgo: 180 })]).name, "Full amount back");
  assert.equal(remedyCopy("refund", [recent]).name, "Full refund");
  assert.equal(remedyCopy("refund", [old]).name, "PayPal payout");
  assert.equal(remedyCopy("refund", [recent, old]).short, "Refund and PayPal payout");
  assert.equal(remedyCopy("refund", [{ ...old, refundedCents: 400 }]).short, "PayPal payout of what's left");
});
