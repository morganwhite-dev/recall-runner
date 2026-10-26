import type { IconName } from "@/components/Icon";

export type TestGroup = {
  id: string;
  label: string;
  icon: IconName;
  // Width on the 12-column grid, so every row of cards fills evenly: 3 (four across), 4 (three across) or 6 (two across).
  span: 3 | 4 | 6;
  tests: { n: number; text: string }[];
};

// Numbers 01 to 11 follow tests/policy.test.ts, 12 to 18 and 32 to 37 tests/buyer.test.ts, 38 to 43 tests/impact.test.ts, 19 to 31 tests/dashboard.test.ts.
export const MONEY_GROUPS: TestGroup[] = [
  {
    id: "refund",
    label: "Refund",
    icon: "refund",
    span: 3,
    tests: [
      { n: 1, text: "an order paid 179 days ago is refunded" },
      { n: 2, text: "an order paid exactly 180 days ago is still refunded (the window includes day 180)" },
    ],
  },
  {
    id: "payout",
    label: "PayPal Payout",
    icon: "payout",
    span: 3,
    tests: [
      { n: 3, text: "one millisecond past 180 days switches to PayPal Payouts" },
      { n: 4, text: "an order paid 400 days ago is paid by Payouts, and the reason says so" },
    ],
  },
  {
    id: "replacement",
    label: "Replacement",
    icon: "truck",
    span: 3,
    tests: [{ n: 5, text: "a replacement adds tracking and moves no money" }],
  },
  {
    id: "repair",
    label: "Repair",
    icon: "wrench",
    span: 3,
    tests: [{ n: 6, text: "a repair records the kit request and moves no money" }],
  },
  {
    id: "guard",
    label: "Guard",
    icon: "shield",
    span: 4,
    tests: [
      { n: 7, text: "a buyer cannot pick a remedy the recall does not offer" },
      { n: 8, text: "no PayPal payment on record means no money, even inside the window" },
      { n: 9, text: "never pays more than the order total" },
      { n: 10, text: "rejects zero, negative or fractional amounts" },
      { n: 11, text: "refunds only the recalled item, not the whole order" },
    ],
  },
  {
    id: "identity",
    label: "Identity and settling",
    icon: "lock",
    span: 4,
    tests: [
      { n: 12, text: "a verified PayPal email is accepted, ignoring case" },
      { n: 13, text: "an email PayPal has not verified is never accepted" },
      { n: 14, text: "a different PayPal account does not match the order" },
      { n: 15, text: "an emails list counts only if the primary one is confirmed" },
      { n: 16, text: "a refund event points at the refund id" },
      { n: 17, text: "payout item and batch events point at the payout batch id" },
      { n: 18, text: "other events, or events with no id, settle nothing" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard and buyer page",
    icon: "info",
    span: 4,
    tests: [
      { n: 19, text: "a refund or payout is Settled only after PayPal's webhook, not when the request is accepted" },
      { n: 20, text: "replacements and repair kits are Settled at once, because PayPal sends no webhook for them" },
      { n: 21, text: "an open case is Notified until the buyer opens the notice, then Waiting" },
      { n: 22, text: "a refused or failed case shows as Problem, never as waiting or settled" },
      { n: 23, text: "before a decision, the path comes from the recall's remedy and the order's age" },
      { n: 24, text: "once the policy engine has decided, its action wins over the preview" },
      { n: 25, text: "emails are masked to the first letter and the domain" },
      { n: 26, text: "time ago reads in minutes, hours and days" },
      { n: 27, text: "the numbers count settled cases per path, and 'products fixed' is settled over affected" },
      { n: 28, text: "long timeline lines are cut to one line with an ellipsis, short ones are untouched" },
      { n: 29, text: "several orders of the same recall become one group, in order of first appearance" },
      { n: 30, text: "a refund past 180 days is described as a PayPal Payout, inside it as a refund; other remedies say nothing" },
      { n: 31, text: "the amount for several orders adds the prices; remedies with no money say Free" },
    ],
  },
  {
    id: "failures",
    label: "Failures and retries",
    icon: "alert",
    span: 6,
    tests: [
      { n: 32, text: "a failed, blocked or returned payout names the batch we stored, so the case can be reopened" },
      { n: 33, text: "a failed refund names the refund id, and PayPal's own error text is used when it sends one" },
      { n: 34, text: "unclaimed or held payouts are only noted, never treated as failures that allow a second payment" },
      { n: 35, text: "failure events with no id, and success events, are not failures" },
      { n: 36, text: "the first try and any try with an unknown outcome reuse the same PayPal request id" },
      { n: 37, text: "after a definite failure the retry gets a fresh request id, one more for each failure" },
    ],
  },
  {
    id: "impact",
    label: "Home page numbers",
    icon: "info",
    span: 6,
    tests: [
      { n: 38, text: "no recalls gives all zeros, not an error" },
      { n: 39, text: "online recalls are counted from the sold-online flag" },
      { n: 40, text: "Amazon is any recall whose retailers text mentions Amazon, in any letter case" },
      { n: 41, text: "a barcode counts as listed only when a UPC number is written out" },
      { n: 42, text: "a barcode that is only mentioned, with no number, does not count" },
      { n: 43, text: "a barcode number in the product list also counts" },
    ],
  },
];

// The AI tests (npm run eval): 8 cases, each run several times.
export const AI_GROUPS: TestGroup[] = [
  {
    id: "match",
    label: "Matching",
    icon: "match",
    span: 3,
    tests: [
      { n: 1, text: "correct match from a reworded title" },
      { n: 2, text: "match by brand plus product type" },
    ],
  },
  {
    id: "refuse",
    label: "Refusal",
    icon: "ban",
    span: 3,
    tests: [
      { n: 3, text: "near-miss product correctly refused" },
      { n: 4, text: "different brand correctly refused (the Emberly decoy)" },
    ],
  },
  {
    id: "inject",
    label: "Prompt injection",
    icon: "alert",
    span: 3,
    tests: [
      { n: 5, text: "a product description that tries to instruct the AI (prompt injection) has no effect" },
      { n: 6, text: "a recall text with an injected link adds no link to the buyer notice" },
    ],
  },
  {
    id: "quote",
    label: "Quoting and fallback",
    icon: "quote",
    span: 3,
    tests: [
      { n: 7, text: "the buyer notice quotes the recall word for word" },
      { n: 8, text: "a missing AI key falls back to templates" },
    ],
  },
];

// The four money rules shown on the 180-day timeline; `test` is the money test number.
export const WINDOW_STOPS: {
  day: string;
  remedy: "refund" | "payout";
  why: string;
  test: number;
}[] = [
  { day: "Day 179", remedy: "refund", why: "Inside the window.", test: 1 },
  { day: "Day 180", remedy: "refund", why: "The window includes day 180.", test: 2 },
  { day: "180 days + 1 ms", remedy: "payout", why: "One millisecond too late.", test: 3 },
  { day: "Day 400", remedy: "payout", why: "The reason on the order says so.", test: 4 },
];

export const RUN = {
  file: "tests/*.test.ts",
  command: "npm test",
};

const count = (groups: TestGroup[]) =>
  groups.reduce((sum, g) => sum + g.tests.length, 0);

export const MONEY_COUNT = count(MONEY_GROUPS);
export const AI_COUNT = count(AI_GROUPS);
export const TOTAL_COUNT = MONEY_COUNT + AI_COUNT;

// Ring geometry: one segment per test around a circle of radius 80, 4 units of gap.
const RADIUS = 80;
const GAP = 4;
const PERIOD = (2 * Math.PI * RADIUS) / TOTAL_COUNT;
const DASH = PERIOD - GAP;
const r4 = (n: number) => Number(n.toFixed(4));

// Pale segments for every test, then solid plum on top for each one that passed, in order.
// A segment that did not pass is skipped in the solid ring, so it stays pale.
export function ringFor(passed: boolean[]) {
  const seg = `${r4(DASH)} ${GAP}`;
  return {
    radius: RADIUS,
    all: `${Array.from({ length: TOTAL_COUNT }, () => seg).join(" ")} 0 600`,
    passed: `${passed.map((ok) => (ok ? seg : `0 ${r4(PERIOD)}`)).join(" ")} 0 600`,
  };
}

export const pad = (n: number) => String(n).padStart(2, "0");
