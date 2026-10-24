import type { TagKind } from "@/components/Tag";

// TODO: load the campaign and its cases from the database instead of fixtures.

export type RemedyPath = "Refund" | "PayPal Payout";
export type CaseStatus = "Notified" | "Waiting" | "Settled";

export interface BuyerCase {
  id: string;
  name: string;
  initials: string;
  daysAgo: number;
  path: RemedyPath;
  amountCents: number;
  status: CaseStatus;
  email: string;
  sent: string;
  opened: boolean;
}

export interface TimelineStep {
  tag: TagKind;
  text: string;
  code?: string;
}

export interface MessagePreview {
  to: string;
  sent: string;
  opened: string;
  remedy: string;
  subject: string;
  greeting: string;
  promise: string;
  link: string;
}

export const REFUND_WINDOW_DAYS = 180;
export const PRODUCT = "HotHands Rechargeable Hand Warmers";
export const HAZARD =
  "The lithium-ion battery and electrical components in the recalled hand warmers can overheat and ignite, posing a risk of serious injury from fire and burn hazards.";

const AMOUNT_CENTS = 3400;

function buyer(
  name: string,
  daysAgo: number,
  path: RemedyPath,
  status: CaseStatus,
  opened: boolean,
): BuyerCase {
  const [first, last] = name.split(" ");
  return {
    id: first.toLowerCase(),
    name,
    initials: `${first[0]}${last[0]}`,
    daysAgo,
    path,
    amountCents: AMOUNT_CENTS,
    status,
    email: `${first[0].toLowerCase()}•••@example.com`,
    sent: "2 min ago",
    opened,
  };
}

export const CASES: BuyerCase[] = [
  buyer("Sam Novak", 12, "Refund", "Notified", false),
  buyer("Alicia Rivera", 45, "Refund", "Settled", true),
  buyer("James Okafor", 90, "Refund", "Settled", true),
  buyer("Mei Chen", 60, "Refund", "Waiting", true),
  buyer("Morgan Demo", 200, "PayPal Payout", "Settled", true),
  buyer("Priya Nair", 250, "PayPal Payout", "Notified", false),
];

export const DEFAULT_CASE_ID = "morgan";

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function buyerPagePath(c: BuyerCase): string {
  return `/r/demo-${c.id}`;
}

// Counts shown in the KPI strip and the money paths strip, from the fixtures.
export function campaignStats(cases: BuyerCase[]) {
  const settled = cases.filter((c) => c.status === "Settled");
  const settledRefunds = settled.filter((c) => c.path === "Refund").length;
  const settledPayouts = settled.length - settledRefunds;
  return {
    affected: cases.length,
    notified: cases.length,
    settled: settled.length,
    settledRefunds,
    settledPayouts,
    fixedPercent: Math.round((settled.length / cases.length) * 100),
    refundCases: cases.filter((c) => c.path === "Refund").length,
    payoutCases: cases.filter((c) => c.path === "PayPal Payout").length,
  };
}

// The steps that have happened for a case. Money decisions are always RULE.
export function timelineFor(c: BuyerCase): TimelineStep[] {
  const steps: TimelineStep[] = [
    { tag: "model", text: `Matched the recall to ${PRODUCT}` },
    { tag: "you", text: "You approved the campaign" },
    { tag: "tool", text: "Notice delivered to the in-app outbox" },
  ];
  if (c.status !== "Settled") {
    if (c.opened) steps.push({ tag: "tool", text: "Buyer opened the notice" });
    steps.push({
      tag: "tool",
      text: "Waiting for the buyer to sign in with PayPal",
    });
    return steps;
  }
  const money = formatMoney(c.amountCents);
  const refund = c.path === "Refund";
  steps.push(
    {
      tag: "tool",
      text: "Buyer signed in with PayPal and the account matched the order",
    },
    refund
      ? {
          tag: "rule",
          text: `Paid ${c.daysAgo} days ago, within PayPal’s ${REFUND_WINDOW_DAYS}-day refund window, so refund the order: ${money}`,
          code: "WITHIN_REFUND_WINDOW",
        }
      : {
          tag: "rule",
          text: `Paid ${c.daysAgo} days ago, past PayPal’s ${REFUND_WINDOW_DAYS}-day refund window, so pay by PayPal Payouts instead: ${money}`,
          code: "REFUND_WINDOW_EXCEEDED",
        },
    {
      tag: "tool",
      text: refund ? `PayPal refunded ${money}` : `PayPal Payouts sent ${money}`,
    },
    { tag: "tool", text: "Webhook confirmed: case settled" },
  );
  return steps;
}

export function messageFor(c: BuyerCase): MessagePreview {
  const money = formatMoney(c.amountCents);
  const refund = c.path === "Refund";
  return {
    to: c.email,
    sent: c.sent,
    opened: c.opened ? "Yes" : "No",
    remedy: refund ? `Full refund · ${money}` : `PayPal payout · ${money}`,
    subject: "Safety recall: your HotHands hand warmers",
    greeting: `Hi ${c.name.split(" ")[0]}, Kobayashi has recalled the ${PRODUCT}, 2-pack, that you bought from Brightnest Home. The CPSC says:`,
    promise: refund
      ? `Please stop using them. We will refund ${money} through PayPal. Start here: `
      : `Please stop using them. We will send ${money} through PayPal Payouts. Start here: `,
    link: `recall-runner.onrender.com${buyerPagePath(c)}`,
  };
}
