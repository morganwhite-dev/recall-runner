// Everything the buyer page needs, loaded from the database by the private link token.
//
//   token -> buyer -> their cases in APPROVED campaigns -> recall, product, order, notice
//
// Also: making the token (one per buyer, random), and the email check that decides whether
// the PayPal account that signed in is the one that paid.
import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull, like } from "drizzle-orm";
import {
  buyerLinks,
  buyers,
  campaigns,
  cases,
  db,
  merchants,
  notices,
  orderItems,
  orders,
  products,
  recalls,
} from "@/db";
import { formatUsd, type BuyerChoice } from "./policy";

const DAY_MS = 24 * 60 * 60 * 1000;

// 32 random bytes = 256 bits, so a link can't be guessed or counted up to.
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

// One link per buyer. Asking twice returns the same token, so a buyer's notices all agree.
export async function ensureBuyerLink(buyerId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(buyerLinks)
    .where(eq(buyerLinks.buyerId, buyerId));
  if (existing) return existing.token;
  const [made] = await db
    .insert(buyerLinks)
    .values({ buyerId, token: newToken() })
    .onConflictDoNothing()
    .returning();
  if (made) return made.token;
  // Two requests raced; the other one won. Read what it wrote.
  const [winner] = await db
    .select()
    .from(buyerLinks)
    .where(eq(buyerLinks.buyerId, buyerId));
  return winner.token;
}

// Where the buyer link points. Set APP_URL in production; the default is the live demo.
export function buyerUrl(token: string): string {
  const base = process.env.APP_URL ?? "https://recall-runner.onrender.com";
  return `${base.replace(/\/$/, "")}/r/${token}`;
}

export type RemedyKind = "refund" | "replace" | "repair";

// The recall's CPSC remedy names (Refund, Replace, Repair) as the page's remedy kinds.
const KIND: Record<string, RemedyKind> = {
  Refund: "refund",
  Replace: "replace",
  Repair: "repair",
};

// The page says "replace"; the policy engine says "replacement".
export const CHOICE_FOR: Record<RemedyKind, BuyerChoice> = {
  refund: "refund",
  replace: "replacement",
  repair: "repair",
};
export const KIND_FOR: Record<BuyerChoice, RemedyKind> = {
  refund: "refund",
  replacement: "replace",
  repair: "repair",
};

export type BuyerCase = {
  caseId: string;
  status: string; // the case status: OPEN, REFUNDED, PAYOUT_SENT, ...
  settled: boolean;
  choice: RemedyKind | null;
  recallNumber: string;
  recallDate: string; // ISO date
  hazard: string; // quoted word for word from the CPSC record
  draftedBy: "MODEL" | "TEMPLATE" | null; // who wrote the notice, so the page never overclaims
  offers: RemedyKind[];
  productName: string;
  sku: string;
  priceCents: number;
  daysAgo: number;
  orderRef: string; // PayPal order id, shown on the receipt
  paypalRef: string | null;
  amountCents: number | null;
  rationale: string | null;
};

export type BuyerPage = {
  storeName: string;
  buyerName: string;
  cases: BuyerCase[];
  // Only the sandbox buyer can really sign in. For every other (fictional) buyer the page says so
  // and points at the sandbox buyer's page.
  fictional: boolean;
  sandboxPath: string | null;
};

export async function loadBuyerPage(token: string): Promise<BuyerPage | null> {
  const [link] = await db
    .select()
    .from(buyerLinks)
    .where(eq(buyerLinks.token, token));
  if (!link) return null;
  const [buyer] = await db
    .select()
    .from(buyers)
    .where(eq(buyers.id, link.buyerId));

  const rows = await db
    .select({
      kase: cases,
      order: orders,
      recall: recalls,
      product: products,
      notice: notices,
      merchant: merchants,
    })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .innerJoin(products, eq(cases.productId, products.id))
    .innerJoin(merchants, eq(campaigns.merchantId, merchants.id))
    .leftJoin(notices, eq(notices.caseId, cases.id))
    .where(
      and(eq(orders.buyerId, link.buyerId), eq(campaigns.status, "APPROVED")),
    )
    .orderBy(recalls.recallDate);
  if (rows.length === 0) return null;

  const lines = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.order.id),
      ),
    );

  const now = Date.now();
  const out: BuyerCase[] = rows.map((r) => {
    const priceCents = lines
      .filter((l) => l.orderId === r.order.id && l.productId === r.product.id)
      .reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
    return {
      caseId: r.kase.id,
      status: r.kase.status,
      settled: Boolean(r.kase.settledAt),
      choice: (r.kase.choice && KIND_FOR[r.kase.choice as BuyerChoice]) || null,
      recallNumber: r.recall.recallNumber,
      recallDate: r.recall.recallDate,
      // The notice quotes the hazard exactly; fall back to the CPSC field if there is no notice.
      hazard: r.notice?.hazardQuote ?? r.recall.hazards,
      draftedBy: (r.notice?.draftedBy as "MODEL" | "TEMPLATE" | undefined) ?? null,
      offers: r.recall.remedyOptions
        .map((o) => KIND[o])
        .filter((k): k is RemedyKind => Boolean(k)),
      productName: r.product.name,
      sku: r.product.sku,
      priceCents,
      daysAgo: Math.floor(
        (now - r.order.effectiveOrderDate.getTime()) / DAY_MS,
      ),
      orderRef: r.order.paypalOrderId ?? "",
      paypalRef: r.kase.paypalRef,
      amountCents: r.kase.amountCents,
      rationale: r.kase.rationale,
    };
  });
  const fictional = !buyer.email.toLowerCase().endsWith("@personal.example.com");
  let sandboxPath: string | null = null;
  if (fictional) {
    const [sandbox] = await db
      .select({ token: buyerLinks.token })
      .from(buyerLinks)
      .innerJoin(buyers, eq(buyerLinks.buyerId, buyers.id))
      .where(like(buyers.email, "%@personal.example.com"));
    sandboxPath = sandbox ? `/r/${sandbox.token}` : null;
  }
  return {
    storeName: rows[0].merchant.name,
    buyerName: buyer.name,
    cases: out,
    fictional,
    sandboxPath,
  };
}

// Marks the buyer's notices as opened (what the dashboard Outbox shows). Safe to repeat.
export async function markOpened(caseIds: string[]) {
  if (caseIds.length === 0) return;
  await db
    .update(notices)
    .set({ openedAt: new Date() })
    .where(and(inArray(notices.caseId, caseIds), isNull(notices.openedAt)));
}

// The email PayPal vouches for, or null. With schema=openid PayPal sends `email` plus
// `email_verified`; some accounts send an `emails` list with a `confirmed` flag instead.
export function verifiedPayPalEmail(identity: Record<string, unknown>): string | null {
  if (
    typeof identity.email === "string" &&
    (identity.email_verified === true || identity.email_verified === "true")
  ) {
    return identity.email.trim().toLowerCase();
  }
  if (Array.isArray(identity.emails)) {
    const primary = identity.emails.find(
      (e): e is { value: string; primary?: boolean; confirmed?: boolean } =>
        typeof e?.value === "string" && e.primary === true && e.confirmed === true,
    );
    if (primary) return primary.value.trim().toLowerCase();
  }
  return null;
}

// Does the verified PayPal email belong to the buyer who paid? Compared ignoring case.
export function emailsMatch(orderEmail: string, verified: string | null): boolean {
  return verified !== null && verified === orderEmail.trim().toLowerCase();
}

export { formatUsd };
