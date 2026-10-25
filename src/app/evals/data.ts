import type { IconName } from "@/components/Icon";

export type TestGroup = {
  id: string;
  label: string;
  icon: IconName;
  tests: { n: number; text: string }[];
};

// Numbers run 01 to 11 in the order of tests/policy.test.ts.
export const MONEY_GROUPS: TestGroup[] = [
  {
    id: "refund",
    label: "Refund",
    icon: "refund",
    tests: [
      { n: 1, text: "an order paid 179 days ago is refunded" },
      { n: 2, text: "an order paid exactly 180 days ago is still refunded (the window includes day 180)" },
    ],
  },
  {
    id: "payout",
    label: "PayPal Payout",
    icon: "payout",
    tests: [
      { n: 3, text: "one millisecond past 180 days switches to PayPal Payouts" },
      { n: 4, text: "an order paid 400 days ago is paid by Payouts, and the reason says so" },
    ],
  },
  {
    id: "replacement",
    label: "Replacement",
    icon: "truck",
    tests: [{ n: 5, text: "a replacement adds tracking and moves no money" }],
  },
  {
    id: "repair",
    label: "Repair",
    icon: "wrench",
    tests: [{ n: 6, text: "a repair records the kit request and moves no money" }],
  },
  {
    id: "guard",
    label: "Guard",
    icon: "shield",
    tests: [
      { n: 7, text: "a buyer cannot pick a remedy the recall does not offer" },
      { n: 8, text: "no PayPal payment on record means no money, even inside the window" },
      { n: 9, text: "never pays more than the order total" },
      { n: 10, text: "rejects zero, negative or fractional amounts" },
      { n: 11, text: "refunds only the recalled item, not the whole order" },
    ],
  },
];

// Planned, not run yet (Phase 3).
export const AI_GROUPS: TestGroup[] = [
  {
    id: "match",
    label: "Matching",
    icon: "match",
    tests: [
      { n: 1, text: "correct match from a reworded title" },
      { n: 2, text: "match by brand plus product type" },
    ],
  },
  {
    id: "refuse",
    label: "Refusal",
    icon: "ban",
    tests: [
      { n: 3, text: "near-miss product correctly refused" },
      { n: 4, text: "different brand correctly refused (the Emberly decoy)" },
    ],
  },
  {
    id: "inject",
    label: "Prompt injection",
    icon: "alert",
    tests: [
      { n: 5, text: "a product description that tries to instruct the AI (prompt injection) has no effect" },
      { n: 6, text: "a recall text with an injected link adds no link to the buyer notice" },
    ],
  },
  {
    id: "quote",
    label: "Quoting and fallback",
    icon: "quote",
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

// Copied from a real `npm test` run (11 pass, 0 fail, 71 ms); generate this from the test output later.
export const RUN = {
  file: "tests/policy.test.ts",
  command: "npm test",
  runTime: "71 ms",
  lastRun: "Oct 24, 2026",
  failing: 0,
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

const repeat = (pattern: string, times: number) =>
  Array.from({ length: times }, () => pattern).join(" ");

export const RING = {
  radius: RADIUS,
  // Solid plum segments for the passed tests.
  passed: `${repeat(`${r4(DASH)} ${GAP}`, MONEY_COUNT)} 0 600`,
  // Pale fill for the planned tests, starting after the passed ones.
  plannedFill: `0 ${r4(MONEY_COUNT * PERIOD)} ${repeat(`${r4(DASH)} ${GAP}`, AI_COUNT)} 0 600`,
  // Dashed centre line over the planned segments.
  plannedLine: `0 ${r4(MONEY_COUNT * PERIOD)} ${repeat("3 5", Math.round((AI_COUNT * PERIOD) / 8) - 2)} 0 600`,
};

export const pad = (n: number) => String(n).padStart(2, "0");
