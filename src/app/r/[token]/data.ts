import type { IconName } from "@/components/Icon";
import type { BuyerCase, RemedyKind } from "@/lib/buyer";
import { formatUsd } from "@/lib/policy";

// Wording and small helpers for the buyer page. The facts themselves (recall, order, amounts)
// come from the database through loadBuyerPage in src/lib/buyer.ts.

export type { RemedyKind };
export type ArtKind = "warmer" | "battery" | "dresser" | "box";

export interface Remedy {
  icon: IconName;
  name: string;
  short: string;
  detail: string;
  rule: string;
}

export const HELP_HREF = "mailto:help@example.com"; // placeholder address

// The line drawing shown for a product. Unknown products get a plain box.
const ART_BY_SKU: Record<string, ArtKind> = {
  "BH-HW-2P": "warmer",
  "BH-RC-BP": "battery",
  "BH-DR-8": "dresser",
};
export function artFor(sku: string): ArtKind {
  return ART_BY_SKU[sku] ?? "box";
}

// Product names carry extras ("Hand Warmers, 2-pack", "Battery Pack for Reclining Chairs",
// "The Blue Cactus ..."). Headlines use the core name: no leading "The", and nothing after the
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
        name: "Free replacement",
        short: "Free replacement",
        detail: "No money. A new one ships, and tracking is added to your order.",
        rule: "Replacement: the recall offers a new one",
      };
    case "repair":
      return {
        icon: "wrench",
        name: "Free repair kit",
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

// Where "Confirm with PayPal" goes: the login route checks the case belongs to this link.
export function loginHref(
  token: string,
  caseId: string,
  remedy: RemedyKind,
): string {
  const q = new URLSearchParams({ token, case: caseId, remedy });
  return `/api/auth/paypal/login?${q}`;
}

// A case is finished once PayPal accepted the money step (or the repair request was recorded).
const DONE = [
  "REFUNDED",
  "PAYOUT_SENT",
  "REPLACEMENT_SHIPPED",
  "REPAIR_KIT_REQUESTED",
];
export const isDone = (c: BuyerCase) => DONE.includes(c.status);
