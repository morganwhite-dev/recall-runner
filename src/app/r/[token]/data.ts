import type { IconName } from "@/components/Icon";
import type { BuyerCase, RemedyKind } from "@/lib/buyer";
import { formatUsd, REFUND_WINDOW_DAYS } from "@/lib/policy";

// Wording and small helpers for the buyer page. The facts themselves (recall, order, amounts)
// come from the database through loadBuyerPage in src/lib/buyer.ts.

export type { RemedyKind };
export { artFor, type ArtKind } from "@/components/ProductArt";

export interface Remedy {
  icon: IconName;
  name: string;
  short: string;
  detail: string;
  rule: string;
}

// Product names carry extras ("Hand Warmers, 2-pack", "Battery Pack for Reclining Chairs",
// "Juniper Ridge Power Co. ..."). Headlines use the core name: no leading "The", and nothing after the
// first comma, bracket or " for ".
export function shortName(productName: string): string {
  return productName
    .split(/,|\(| for /)[0]
    .replace(/^the\s+/i, "")
    .trim();
}

// "Hand Warmers" -> them, "Dresser" -> it. A plain plural check on the last word of the core name.
export function pronounFor(productName: string): "it" | "them" {
  const last = shortName(productName).split(/\s+/).pop()?.toLowerCase() ?? "";
  return last.endsWith("s") && !last.endsWith("ss") ? "them" : "it";
}

export function remedyCopy(kind: RemedyKind): Remedy {
  switch (kind) {
    case "refund":
      return {
        icon: "refund",
        name: "Full refund",
        short: "Full refund",
        detail: "Paid back to your PayPal account.",
        rule: "Refund: the recall offers your money back",
      };
    case "replace":
      return {
        icon: "box",
        name: "Replacement",
        short: "Replacement",
        detail: "No money. A new one ships, and tracking is added to your order.",
        rule: "Replacement: the recall offers a new one",
      };
    case "repair":
      return {
        icon: "wrench",
        name: "Repair kit",
        short: "Repair kit",
        detail: "No money. The kit is mailed to you.",
        rule: "Repair: the recall offers a repair kit",
      };
  }
}

// What the buyer sees as the money line: the price for a refund, else "Free".
export function remedyAmount(c: BuyerCase, kind: RemedyKind): string {
  return kind === "refund" ? formatUsd(c.priceCents) : "Free";
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const cpscLabel = (c: BuyerCase) => `CPSC #${c.recallNumber}`;
export const headline = (c: BuyerCase) =>
  `Your ${shortName(c.productName)} ${pronounFor(c.productName) === "them" ? "have" : "has"} been recalled`;

// Where "Confirm with PayPal" goes. One sign-in can settle several recalls, one pick per case;
// the login route checks every case belongs to this link.
export function loginHref(
  token: string,
  picks: { caseId: string; remedy: RemedyKind }[],
): string {
  const q = new URLSearchParams({ token });
  for (const p of picks) q.append("pick", `${p.caseId}:${p.remedy}`);
  return `/api/auth/paypal/login?${q}`;
}

// A case the buyer can act on: waiting for a choice (OPEN), or one PayPal could not complete
// (FAILED), which may be tried again. REJECTED (the rules said no) and finished cases are final.
export const isClaimable = (c: BuyerCase) => c.status === "OPEN" || c.status === "FAILED";

// A case is finished once PayPal accepted the money step (or the repair request was recorded).
const DONE = [
  "REFUNDED",
  "PAYOUT_SENT",
  "REPLACEMENT_SHIPPED",
  "REPAIR_KIT_REQUESTED",
];
export const isDone = (c: BuyerCase) => DONE.includes(c.status);

// A buyer can have several orders of the same recalled product. They are one recall to settle:
// one card, one remedy choice, one amount. Order of first appearance is kept.
export interface RecallGroup {
  recallNumber: string;
  cases: BuyerCase[];
}

export function groupByRecall(cases: BuyerCase[]): RecallGroup[] {
  const groups = new Map<string, RecallGroup>();
  for (const c of cases) {
    const g = groups.get(c.recallNumber) ?? { recallNumber: c.recallNumber, cases: [] };
    g.cases.push(c);
    groups.set(c.recallNumber, g);
  }
  return [...groups.values()];
}

// The receipt headline for several settled cases. Orders of the same recall count once, so one
// recall bought twice is "settled for 2 orders", not "2 recalls". `covered` is the extra lede
// sentence when there are more orders than recalls (null when the headline already says it).
export function receiptHeadline(cases: BuyerCase[]): { title: string; covered: string | null } {
  const recalls = groupByRecall(cases).length;
  const orders = cases.length;
  if (recalls === 1)
    return {
      title: orders > 1 ? `Your recall is settled for ${orders} orders` : "Your recall is settled",
      covered: null,
    };
  return {
    title: `${recalls} recalls settled with one sign-in`,
    covered: orders > recalls ? `That covered ${orders} orders.` : null,
  };
}

// How one order will be paid for a remedy: refunds past PayPal's 180 days go by PayPal Payouts.
// Only money remedies have anything to say; the others are already named "Free" once on the card.
export function howPaid(c: BuyerCase, kind: RemedyKind): string | null {
  if (kind !== "refund") return null;
  return c.daysAgo > REFUND_WINDOW_DAYS ? "paid by PayPal Payouts" : "refunded to PayPal";
}

// The same, in one word, for the tight lines inside the several-recalls cards.
export function howPaidShort(c: BuyerCase, kind: RemedyKind): string | null {
  if (kind !== "refund") return null;
  return c.daysAgo > REFUND_WINDOW_DAYS ? "Payout" : "Refund";
}

// What the buyer gets for a remedy across several orders: the prices added up, or "Free".
export function groupAmount(cases: BuyerCase[], kind: RemedyKind): string {
  return kind === "refund"
    ? formatUsd(cases.reduce((sum, c) => sum + c.priceCents, 0))
    : "Free";
}

// The buyer page's headline promise, worked out from what is ready to settle: "$68.00 back and two
// free fixes are waiting." Null when nothing is ready yet (a recall that still needs a choice).
export function waitingLine(refundCents: number, fixes: number): string | null {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const count = (n: number) => words[n] ?? String(n);
  const fixText = `${count(fixes)} free ${fixes === 1 ? "fix" : "fixes"}`;
  if (refundCents > 0 && fixes > 0)
    return `${formatUsd(refundCents)} back and ${fixText} ${fixes === 1 ? "is" : "are"} waiting.`;
  if (refundCents > 0) return `${formatUsd(refundCents)} back is waiting.`;
  if (fixes > 0) return `${fixText[0].toUpperCase()}${fixText.slice(1)} ${fixes === 1 ? "is" : "are"} waiting.`;
  return null;
}
