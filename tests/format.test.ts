import assert from "node:assert/strict";
import { test } from "node:test";
import { daysAgoLabel, decideRemedy, formatUsd } from "../src/lib/policy";

test("formatUsd shows dollars and cents", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(3401), "$34.01");
  assert.equal(formatUsd(6800), "$68.00");
  assert.equal(formatUsd(5), "$0.05");
});

test("daysAgoLabel uses the singular for one day only", () => {
  assert.equal(daysAgoLabel(0), "0 days ago");
  assert.equal(daysAgoLabel(1), "1 day ago");
  assert.equal(daysAgoLabel(30), "30 days ago");
});

test("the rationale says '1 day ago' for a one-day-old order and '30 days ago' otherwise", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const base = {
    choice: "refund" as const,
    remedyOptions: ["Refund"],
    now,
    lineAmountCents: 3400,
    orderTotalCents: 3400,
    hasCapture: true,
  };
  const one = decideRemedy({ ...base, orderDate: new Date(now.getTime() - 86_400_000) });
  assert.match(one.rationale, /^Paid 1 day ago,/);
  const thirty = decideRemedy({ ...base, orderDate: new Date(now.getTime() - 30 * 86_400_000) });
  assert.match(thirty.rationale, /^Paid 30 days ago,/);
  const old = decideRemedy({ ...base, orderDate: new Date(now.getTime() - 250 * 86_400_000) });
  assert.match(old.rationale, /^Paid 250 days ago, past/);
});
