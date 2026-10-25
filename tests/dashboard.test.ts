// Tests for the small rules behind the dashboard: which status a case shows, which remedy path it
// is on, and how the numbers are counted. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  campaignStats,
  caseStatus,
  maskEmail,
  relativeTime,
  remedyPath,
  type BuyerCase,
} from "../src/app/dashboard/data";

const T = new Date("2026-10-25T12:00:00Z");

test("a refund or payout is Settled only after PayPal's webhook, not when the request is accepted", () => {
  assert.equal(caseStatus({ status: "REFUNDED", settledAt: null, openedAt: T }), "Waiting");
  assert.equal(caseStatus({ status: "REFUNDED", settledAt: T, openedAt: T }), "Settled");
  assert.equal(caseStatus({ status: "PAYOUT_SENT", settledAt: null, openedAt: null }), "Waiting");
  assert.equal(caseStatus({ status: "PAYOUT_SENT", settledAt: T, openedAt: null }), "Settled");
});

test("replacements and repair kits are Settled at once, because PayPal sends no webhook for them", () => {
  assert.equal(caseStatus({ status: "REPLACEMENT_SHIPPED", settledAt: null, openedAt: null }), "Settled");
  assert.equal(caseStatus({ status: "REPAIR_KIT_REQUESTED", settledAt: null, openedAt: null }), "Settled");
});

test("an open case is Notified until the buyer opens the notice, then Waiting", () => {
  assert.equal(caseStatus({ status: "OPEN", settledAt: null, openedAt: null }), "Notified");
  assert.equal(caseStatus({ status: "OPEN", settledAt: null, openedAt: T }), "Waiting");
});

test("a refused or failed case shows as Problem, never as waiting or settled", () => {
  assert.equal(caseStatus({ status: "REJECTED", settledAt: null, openedAt: T }), "Problem");
  assert.equal(caseStatus({ status: "FAILED", settledAt: null, openedAt: T }), "Problem");
});

test("before a decision, the path comes from the recall's remedy and the order's age", () => {
  assert.equal(remedyPath({ action: null, offers: ["Refund"], ageDays: 180 }), "Refund");
  assert.equal(remedyPath({ action: null, offers: ["Refund"], ageDays: 181 }), "PayPal Payout");
  assert.equal(remedyPath({ action: null, offers: ["Replace"], ageDays: 400 }), "Replacement");
  assert.equal(remedyPath({ action: null, offers: ["Repair"], ageDays: 5 }), "Repair");
});

test("once the policy engine has decided, its action wins over the preview", () => {
  assert.equal(remedyPath({ action: "PAYOUT", offers: ["Refund"], ageDays: 5 }), "PayPal Payout");
  assert.equal(remedyPath({ action: "REFUND", offers: ["Refund"], ageDays: 900 }), "Refund");
  assert.equal(remedyPath({ action: "TRACKING", offers: ["Replace"], ageDays: 5 }), "Replacement");
});

test("emails are masked to the first letter and the domain", () => {
  assert.equal(maskEmail("sam.novak@example.com"), "s•••@example.com");
});

test("time ago reads in minutes, hours and days", () => {
  const ago = (ms: number) => relativeTime(new Date(T.getTime() - ms), T);
  assert.equal(ago(10_000), "just now");
  assert.equal(ago(42 * 60_000), "42 min ago");
  assert.equal(ago(3 * 3_600_000), "3 h ago");
  assert.equal(ago(2 * 86_400_000), "2 days ago");
});

test("the numbers count settled cases per path, and 'products fixed' is settled over affected", () => {
  const c = (path: BuyerCase["path"], status: BuyerCase["status"]) => ({ path, status }) as BuyerCase;
  const stats = campaignStats([
    c("Refund", "Settled"),
    c("Refund", "Waiting"),
    c("PayPal Payout", "Settled"),
    c("PayPal Payout", "Notified"),
  ]);
  assert.equal(stats.affected, 4);
  assert.equal(stats.settled, 2);
  assert.equal(stats.settledRefunds, 1);
  assert.equal(stats.settledPayouts, 1);
  assert.equal(stats.fixedPercent, 50);
  assert.equal(stats.byPath.Refund, 2);
  assert.equal(campaignStats([], 6).fixedPercent, 0);
});
