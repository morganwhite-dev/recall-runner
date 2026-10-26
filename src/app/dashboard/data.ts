import type { ArtKind } from "@/components/ProductArt";
import type { TagKind } from "@/components/Tag";
import { REFUND_WINDOW_DAYS } from "@/lib/policy";

// Shapes and plain helpers for the dashboard. Nothing here touches the database, so the grid
// (a client component) can import it. The server builds these shapes in src/lib/dashboard.ts.

export type RemedyPath = "Refund" | "PayPal Payout" | "Replacement" | "Repair";
// Notified: notice sent, not opened. Waiting: opened, or PayPal has the request and has not yet
// confirmed. Settled: confirmed. Problem: the rules refused it or PayPal returned an error.
export type CaseStatus = "Notified" | "Waiting" | "Settled" | "Problem";

export interface BuyerCase {
  id: string;
  name: string;
  initials: string;
  daysAgo: number;
  path: RemedyPath;
  amountCents: number;
  status: CaseStatus;
  email: string; // masked
  sent: string; // "2 min ago"
  opened: boolean;
  subject: string;
  body: string;
  draftedBy: "MODEL" | "TEMPLATE" | null;
  buyerPath: string; // /r/<token>
  timeline: TimelineStep[];
}

export interface TimelineStep {
  tag: TagKind;
  text: string;
  code?: string;
  // The AI's background work for the whole campaign (lookups, rule checks). It is kept behind a
  // "show" toggle so the timeline for one case stays short.
  research?: boolean;
}

// One line is enough on screen; the full text stays in the audit trail.
export function clip(text: string, max = 140): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export interface CampaignHeader {
  id: string;
  recallNumber: string;
  recallDate: string; // ISO date
  title: string;
  productNames: string[];
  remedies: string[];
  status: string; // DRAFT or APPROVED
  art: ArtKind;
  priceCents: number | null;
}

// Where the visitor is in the demo, so the dashboard can say what to do next.
export interface DemoGuideState {
  recallNumber: string; // the campaign that affects the sandbox buyer
  label: string;
  approved: boolean;
  buyerPath: string | null; // the sandbox buyer's page, once the campaign is approved
  paid: boolean; // PayPal has accepted a refund or payout
  settled: boolean; // a verified webhook confirmed it
}

export interface CampaignOption {
  recallNumber: string;
  label: string;
}

export { REFUND_WINDOW_DAYS };

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Replacement and repair move no money, so the amount column says so instead of "$0.00".
export function amountLabel(
  c: Pick<BuyerCase, "path" | "amountCents">,
): string {
  return c.path === "Refund" || c.path === "PayPal Payout"
    ? formatMoney(c.amountCents)
    : "No money";
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Counts shown in the KPI strip and the money paths strip.
export function campaignStats(cases: BuyerCase[], affectedOverride?: number) {
  const settled = cases.filter((c) => c.status === "Settled");
  const money = (c: BuyerCase, path: RemedyPath) => c.path === path;
  const affected = affectedOverride ?? cases.length;
  return {
    affected,
    notified: cases.length,
    settled: settled.length,
    settledRefunds: settled.filter((c) => money(c, "Refund")).length,
    settledPayouts: settled.filter((c) => money(c, "PayPal Payout")).length,
    settledOther: settled.filter(
      (c) => money(c, "Replacement") || money(c, "Repair"),
    ).length,
    fixedPercent: affected ? Math.round((settled.length / affected) * 100) : 0,
    byPath: {
      Refund: cases.filter((c) => money(c, "Refund")).length,
      "PayPal Payout": cases.filter((c) => money(c, "PayPal Payout")).length,
      Replacement: cases.filter((c) => money(c, "Replacement")).length,
      Repair: cases.filter((c) => money(c, "Repair")).length,
    } satisfies Record<RemedyPath, number>,
  };
}

// Which remedy path a case is on. Once the policy engine has decided, its action wins; before
// that, the recall's offered remedy and the order's age give the expected path.
export function remedyPath(input: {
  action: string | null;
  offers: string[];
  ageDays: number;
}): RemedyPath {
  switch (input.action) {
    case "REFUND":
      return "Refund";
    case "PAYOUT":
      return "PayPal Payout";
    case "TRACKING":
      return "Replacement";
    case "REPAIR_NOTICE":
      return "Repair";
  }
  if (input.offers.includes("Refund")) {
    return input.ageDays <= REFUND_WINDOW_DAYS ? "Refund" : "PayPal Payout";
  }
  if (input.offers.includes("Replace")) return "Replacement";
  return "Repair";
}

export function caseStatus(k: {
  status: string;
  settledAt: Date | null;
  openedAt: Date | null;
}): CaseStatus {
  switch (k.status) {
    case "REFUNDED":
    case "PAYOUT_SENT":
      // PayPal accepted the request; settled only once its webhook says the money moved.
      return k.settledAt ? "Settled" : "Waiting";
    case "REPLACEMENT_SHIPPED":
    case "REPAIR_KIT_REQUESTED":
      return "Settled"; // no money moves and PayPal sends no webhook for these
    case "REJECTED":
    case "FAILED":
      return "Problem";
    default:
      return k.openedAt ? "Waiting" : "Notified";
  }
}

// "sam.novak@example.com" -> "s•••@example.com"
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0] ?? ""}•••@${domain ?? ""}`;
}

export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function relativeTime(then: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// The line under "Remedy" in the message preview.
export function remedyLabel(
  c: Pick<BuyerCase, "path" | "amountCents">,
): string {
  switch (c.path) {
    case "Refund":
      return `Full refund · ${formatMoney(c.amountCents)}`;
    case "PayPal Payout":
      return `PayPal payout · ${formatMoney(c.amountCents)}`;
    case "Replacement":
      return "Free replacement";
    case "Repair":
      return "Free repair kit";
  }
}
