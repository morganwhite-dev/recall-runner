import type { IconName } from "@/components/Icon";

// TODO: load the buyer's recalls by token from the database instead of fixtures.

export type RemedyKind = "refund" | "replace" | "repair";
export type ArtKind = "warmer" | "battery" | "dresser";

export interface Recall {
  art: ArtKind;
  artAlt: string;
  cpsc: string;
  date: string;
  name: string;
  headline: string;
  item: string;
  daysAgo: number;
  price: string;
  pronoun: "it" | "them";
  // The remedy the notice shows when the recall has one.
  remedy: RemedyKind;
  // Remedies the buyer can choose between; more than one shows the picker.
  offers: RemedyKind[];
  hazard: string;
}

export interface Remedy {
  icon: IconName;
  name: string;
  short: string;
  detail: string;
  rule: string;
}

export const STORE = "Brightnest Home";

// Demo: the approved design shows the three-option picker on every recall.
// Real data lists only what each recall actually offers.
const ALL_REMEDIES: RemedyKind[] = ["refund", "replace", "repair"];

export const RECALLS: Recall[] = [
  {
    art: "warmer",
    artAlt: "Line drawing of a rechargeable hand warmer",
    cpsc: "CPSC #27011",
    date: "Oct 1, 2026",
    name: "HotHands Rechargeable Hand Warmers",
    headline: "Your HotHands hand warmers have been recalled",
    item: "HotHands Rechargeable Hand Warmers, 2-pack",
    daysAgo: 45,
    price: "$34.00",
    pronoun: "them",
    remedy: "refund",
    offers: ALL_REMEDIES,
    hazard:
      "The lithium-ion battery and electrical components in the recalled hand warmers can overheat and ignite, posing a risk of serious injury from fire and burn hazards.",
  },
  // placeholder, replace with real CPSC data
  {
    art: "battery",
    artAlt: "Line drawing of a recliner battery pack",
    cpsc: "CPSC #26301",
    date: "Sep 11, 2026",
    name: "Recliner battery pack",
    headline: "Your recliner battery pack has been recalled",
    item: "Recliner battery pack",
    daysAgo: 60,
    price: "$59.00",
    pronoun: "it",
    remedy: "replace",
    offers: ALL_REMEDIES,
    hazard: "The recalled battery packs can overheat, posing a fire hazard.",
  },
  // placeholder, replace with real CPSC data
  {
    art: "dresser",
    artAlt: "Line drawing of an 8-drawer dresser",
    cpsc: "CPSC #26794",
    date: "Aug 7, 2026",
    name: "Aitjunz 8-Drawer Dresser",
    headline: "Your 8-drawer dresser has been recalled",
    item: "Aitjunz 8-Drawer Dresser",
    daysAgo: 70,
    price: "$249.00",
    pronoun: "it",
    remedy: "repair",
    offers: ALL_REMEDIES,
    hazard:
      "The recalled dressers are unstable if they are not anchored to the wall, posing tip-over and entrapment hazards to children.",
  },
];

export const REMEDIES: Record<RemedyKind, Remedy> = {
  refund: {
    icon: "refund",
    name: "Full refund",
    short: "Full refund",
    detail: "Paid back to your PayPal account.",
    rule: "Refund: paid within 180 days",
  },
  replace: {
    icon: "box",
    name: "Free replacement battery pack",
    short: "Replacement pack",
    detail: "No money. Tracking is added to your order.",
    rule: "Replacement: the recall offers a new pack",
  },
  repair: {
    icon: "wrench",
    name: "Free repair kit",
    short: "Repair kit",
    detail: "No money. The kit is mailed to you.",
    rule: "Repair: the recall offers a repair kit",
  },
};

// What the buyer sees as the money line: the price for a refund, else "Free".
export function remedyAmount(recall: Recall, kind: RemedyKind): string {
  return kind === "refund" ? recall.price : "Free";
}

// The success and mismatch screens settle the first recall (the refund).
export const SETTLED = RECALLS[0];

export const RECEIPT = {
  order: "BH-48213",
  reference: "8EG04191BL774610V",
};

// TODO: this will carry the case token once the login route accepts one.
export const PAYPAL_LOGIN_HREF = "/api/auth/paypal/login";
export const HELP_HREF = "mailto:help@example.com"; // placeholder address
