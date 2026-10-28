// Tests for the small rules behind the dashboard: which status a case shows, which remedy path it
// is on, and how the numbers are counted. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  campaignStats,
  clip,
  caseStatus,
  groupBuyerMoments,
  maskEmail,
  relativeTime,
  remedyPath,
  type BuyerCase,
} from "../src/app/dashboard/data";
import type { BuyerCase as BuyerRow } from "../src/lib/buyer";
import { groupAmount, groupByRecall, howPaid, receiptHeadline } from "../src/app/r/[token]/data";

const T = new Date("2026-10-25T12:00:00Z");

test("a refund or payout is Settled only after PayPal's webhook, not when the request is accepted", () => {
  assert.equal(caseStatus({ status: "REFUNDED", settledAt: null, openedAt: T }), "Waiting on PayPal");
  assert.equal(caseStatus({ status: "REFUNDED", settledAt: T, openedAt: T }), "Settled");
  assert.equal(caseStatus({ status: "PAYOUT_SENT", settledAt: null, openedAt: null }), "Waiting on PayPal");
  assert.equal(caseStatus({ status: "PAYOUT_SENT", settledAt: T, openedAt: null }), "Settled");
});

test("replacements and repair kits are Settled at once, because PayPal sends no webhook for them", () => {
  assert.equal(caseStatus({ status: "REPLACEMENT_SHIPPED", settledAt: null, openedAt: null }), "Settled");
  assert.equal(caseStatus({ status: "REPAIR_KIT_REQUESTED", settledAt: null, openedAt: null }), "Settled");
});

test("an open case is Sent until the buyer opens the notice, then Opened", () => {
  assert.equal(caseStatus({ status: "OPEN", settledAt: null, openedAt: null }), "Sent");
  assert.equal(caseStatus({ status: "OPEN", settledAt: null, openedAt: T }), "Opened");
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
    c("Refund", "Waiting on PayPal"),
    c("PayPal Payout", "Settled"),
    c("PayPal Payout", "Sent"),
  ]);
  assert.equal(stats.affected, 4);
  assert.equal(stats.settled, 2);
  assert.equal(stats.settledRefunds, 1);
  assert.equal(stats.settledPayouts, 1);
  assert.equal(stats.fixedPercent, 50);
  assert.equal(stats.byPath.Refund, 2);
  assert.equal(campaignStats([], 6).fixedPercent, 0);
});

test("long timeline lines are cut to one line with an ellipsis, short ones are untouched", () => {
  assert.equal(clip("short line"), "short line");
  const long = "x".repeat(300);
  assert.equal(clip(long, 50).length, 50);
  assert.ok(clip(long, 50).endsWith("…"));
});

// The buyer page's recall grouping.
const order = (recallNumber: string, daysAgo: number, caseId: string) =>
  ({ recallNumber, daysAgo, caseId, priceCents: 3400 }) as unknown as BuyerRow;

test("several orders of the same recall become one group, in order of first appearance", () => {
  const groups = groupByRecall([order("A", 200, "1"), order("B", 5, "2"), order("A", 45, "3")]);
  assert.deepEqual(groups.map((g) => [g.recallNumber, g.cases.length]), [["A", 2], ["B", 1]]);
});

test("a refund past 180 days is described as a PayPal Payout, inside it as a refund; other remedies say nothing", () => {
  assert.equal(howPaid(order("A", 200, "1"), "refund"), "paid by PayPal Payouts");
  assert.equal(howPaid(order("A", 180, "1"), "refund"), "refunded to PayPal");
  assert.equal(howPaid(order("A", 5, "1"), "repair"), null);
});

test("the amount for several orders adds the prices; remedies with no money say Free", () => {
  const two = [order("A", 200, "1"), order("A", 45, "2")];
  assert.equal(groupAmount(two, "refund"), "$68.00");
  assert.equal(groupAmount(two, "replace"), "Free");
});

test("the receipt counts recalls, not orders, and says how many orders it covered", () => {
  assert.deepEqual(receiptHeadline([order("A", 200, "1"), order("A", 45, "2")]), {
    title: "Your recall is settled for 2 orders",
    covered: null,
  });
  assert.deepEqual(receiptHeadline([order("A", 200, "1"), order("B", 5, "2"), order("A", 45, "3")]), {
    title: "2 recalls settled with one sign-in",
    covered: "That covered 3 orders.",
  });
  assert.deepEqual(receiptHeadline([order("A", 5, "1"), order("B", 5, "2")]), {
    title: "2 recalls settled with one sign-in",
    covered: null,
  });
});

// The Activity feed's per-buyer lines.
const moment = (id: string, secs: number, caseId: string, buyerId = "morgan", kind: "sent" | "opened" | "signin" = "signin") => ({
  id,
  time: T.getTime() + secs * 1000,
  kind,
  buyerId,
  name: buyerId === "morgan" ? "Morgan Demo" : "Priya Shah",
  caseId,
});

test("one sign-in that claims two orders is one Activity line, keeping the earliest id", () => {
  const lines = groupBuyerMoments([moment("b", 1, "2"), moment("a", 0, "1"), moment("c", 0, "3", "priya")]);
  assert.deepEqual(
    lines.map((l) => [l.id, l.text]),
    [
      ["a", "Morgan Demo signed in with PayPal · 2 orders"],
      ["c", "Priya Shah signed in with PayPal"],
    ],
  );
});

test("moments far apart, or of different kinds, stay separate lines", () => {
  const lines = groupBuyerMoments([
    moment("a", 0, "1", "morgan", "sent"),
    moment("b", 0, "2", "morgan", "sent"),
    moment("c", 60, "1", "morgan", "opened"),
    moment("d", 600, "2", "morgan", "opened"),
  ]);
  assert.deepEqual(
    lines.map((l) => l.text),
    ["Notice sent to Morgan Demo · 2 orders", "Morgan Demo opened the notice", "Morgan Demo opened the notice"],
  );
});
