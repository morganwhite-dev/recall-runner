// Tests for the policy engine. Run: npm test
// Each test states a rule in plain words, then checks the engine follows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRemedy, type PolicyInput } from "../src/lib/policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-23T12:00:00Z");

// A normal refund case; each test changes only what it is about.
function input(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    choice: "refund",
    remedyOptions: ["Refund"],
    orderDate: new Date(NOW.getTime() - 30 * DAY_MS),
    now: NOW,
    lineAmountCents: 3400,
    orderTotalCents: 3400,
    hasCapture: true,
    ...overrides,
  };
}
const daysAgo = (days: number, extraMs = 0) =>
  new Date(NOW.getTime() - days * DAY_MS - extraMs);

test("an order paid 179 days ago is refunded", () => {
  const d = decideRemedy(input({ orderDate: daysAgo(179) }));
  assert.equal(d.action, "REFUND");
  assert.equal(d.rule, "WITHIN_REFUND_WINDOW");
  assert.equal(d.amountCents, 3400);
});

test("an order paid exactly 180 days ago is still refunded (the window includes day 180)", () => {
  assert.equal(
    decideRemedy(input({ orderDate: daysAgo(180) })).action,
    "REFUND",
  );
});

test("one millisecond past 180 days switches to PayPal Payouts", () => {
  const d = decideRemedy(input({ orderDate: daysAgo(180, 1) }));
  assert.equal(d.action, "PAYOUT");
  assert.equal(d.rule, "REFUND_WINDOW_EXCEEDED");
  assert.equal(d.amountCents, 3400);
});

test("an order paid 400 days ago is paid by Payouts, and the reason says so", () => {
  const d = decideRemedy(input({ orderDate: daysAgo(400) }));
  assert.equal(d.action, "PAYOUT");
  assert.match(d.rationale, /400 days ago/);
  assert.match(d.rationale, /\$34\.00/);
});

test("a replacement adds tracking and moves no money", () => {
  const d = decideRemedy(
    input({ choice: "replacement", remedyOptions: ["Replace"] }),
  );
  assert.equal(d.action, "TRACKING");
  assert.equal(d.amountCents, 0);
});

test("a repair records the kit request and moves no money", () => {
  const d = decideRemedy(
    input({ choice: "repair", remedyOptions: ["Repair"] }),
  );
  assert.equal(d.action, "REPAIR_NOTICE");
  assert.equal(d.amountCents, 0);
});

test("a buyer cannot pick a remedy the recall does not offer", () => {
  const d = decideRemedy(
    input({ choice: "refund", remedyOptions: ["Replace"] }),
  );
  assert.equal(d.action, "REJECT");
  assert.equal(d.rule, "CHOICE_NOT_OFFERED");
  assert.equal(d.amountCents, 0);
});

test("no PayPal payment on record means no money, even inside the window", () => {
  const d = decideRemedy(input({ hasCapture: false }));
  assert.equal(d.action, "REJECT");
  assert.equal(d.rule, "NO_PAYMENT_ON_RECORD");
});

test("never pays more than the order total", () => {
  const d = decideRemedy(
    input({ lineAmountCents: 5000, orderTotalCents: 3400 }),
  );
  assert.equal(d.action, "REJECT");
  assert.equal(d.rule, "AMOUNT_EXCEEDS_ORDER");
});

test("rejects zero, negative or fractional amounts", () => {
  for (const bad of [0, -100, 12.5]) {
    assert.equal(
      decideRemedy(input({ lineAmountCents: bad })).rule,
      "INVALID_AMOUNT",
    );
  }
});

test("refunds only the recalled item, not the whole order", () => {
  // The order also contained a $30 candle; only the $34 hand warmers are refunded.
  const d = decideRemedy(
    input({ lineAmountCents: 3400, orderTotalCents: 6400 }),
  );
  assert.equal(d.amountCents, 3400);
});
