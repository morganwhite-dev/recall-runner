// Reads everything the merchant dashboard shows, straight from the database:
//
//   campaign (recall + matched products) -> its cases -> buyer, order, notice, ledger
//   and, for each case, the "Why this happened" timeline built from the audit trail.
import { and, asc, desc, eq, inArray, isNull, like } from "drizzle-orm";
import {
  agentDecisions,
  buyerLinks,
  buyers,
  campaigns,
  cases,
  db,
  notices,
  orderItems,
  orders,
  paypalActions,
  products,
  recalls,
} from "@/db";
import type { TagKind } from "@/components/Tag";
import { FEATURED_RECALL, PRE_APPROVED_BY } from "@/lib/demo-config";
import { artFor } from "@/components/ProductArt";
import {
  caseStatus,
  formatMoney,
  initialsOf,
  maskEmail,
  relativeTime,
  remedyPath,
  type BuyerCase,
  type CampaignHeader,
  type CampaignOption,
  type DemoGuideState,
  clip,
  type TimelineStep,
} from "@/app/dashboard/data";

const DAY_MS = 24 * 60 * 60 * 1000;
const tagOf = (actor: string): TagKind =>
  (["model", "rule", "tool", "you"] as const).find(
    (t) => t === actor.toLowerCase(),
  ) ?? "tool";

// Case states that mean PayPal has accepted a refund or payout.
const PAID = ["REFUNDED", "PAYOUT_SENT"];

export type DashboardData = {
  guide: DemoGuideState | null;
  campaigns: CampaignOption[];
  header: CampaignHeader;
  cases: BuyerCase[];
  affected: number; // orders that contain a matched product, found in PayPal order records
};

// The orders (lines) that contain this campaign's matched products. Approval opens one case
// for each, so before approval this is the "buyers affected" preview.
export async function affectedLines(merchantId: string, skus: string[]) {
  if (skus.length === 0) return [];
  return db
    .select({ orderId: orders.id, productId: products.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(orders.merchantId, merchantId), inArray(products.sku, skus)));
}

export async function loadDashboard(
  recallNumber?: string,
): Promise<DashboardData | null> {
  const all = await db
    .select({ campaign: campaigns, recall: recalls })
    .from(campaigns)
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .orderBy(desc(recalls.recallDate));
  if (all.length === 0) return null;

  const catalog = await db.select().from(products);
  const nameOf = (sku: string) =>
    catalog.find((p) => p.sku === sku)?.name ?? sku;
  const options: CampaignOption[] = all.map(({ campaign, recall }) => ({
    recallNumber: recall.recallNumber,
    label: `${nameOf(campaign.matchedSkus[0] ?? "")} recall (CPSC #${recall.recallNumber})`,
  }));

  const current =
    all.find((a) => a.recall.recallNumber === recallNumber) ?? all[0];
  const { campaign, recall } = current;
  const matched = catalog.filter((p) => campaign.matchedSkus.includes(p.sku));
  const header: CampaignHeader = {
    id: campaign.id,
    recallNumber: recall.recallNumber,
    recallDate: recall.recallDate,
    title: recall.title,
    productNames: matched.map((p) => p.name),
    remedies: recall.remedyOptions,
    status: campaign.status,
    preApproved: false, // filled in below
    art: artFor(matched[0]?.sku ?? ""),
    priceCents: matched[0]?.priceCents ?? null,
  };

  const lines = await affectedLines(campaign.merchantId, campaign.matchedSkus);

  const rows = await db
    .select({
      kase: cases,
      order: orders,
      buyer: buyers,
      notice: notices,
      token: buyerLinks.token,
    })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id))
    .leftJoin(notices, eq(notices.caseId, cases.id))
    .leftJoin(buyerLinks, eq(buyerLinks.buyerId, buyers.id))
    .where(eq(cases.campaignId, campaign.id))
    .orderBy(asc(orders.effectiveOrderDate));

  const caseIds = rows.map((r) => r.kase.id);
  const [orderLines, caseDecisions, ledger, campaignDecisions] =
    await Promise.all([
      caseIds.length
        ? db
            .select()
            .from(orderItems)
            .where(
              inArray(
                orderItems.orderId,
                rows.map((r) => r.order.id),
              ),
            )
        : Promise.resolve([]),
      caseIds.length
        ? db
            .select()
            .from(agentDecisions)
            .where(inArray(agentDecisions.caseId, caseIds))
            .orderBy(asc(agentDecisions.createdAt))
        : Promise.resolve([]),
      caseIds.length
        ? db
            .select()
            .from(paypalActions)
            .where(inArray(paypalActions.caseId, caseIds))
            .orderBy(asc(paypalActions.createdAt))
        : Promise.resolve([]),
      db
        .select()
        .from(agentDecisions)
        .where(
          and(
            eq(agentDecisions.campaignId, campaign.id),
            isNull(agentDecisions.caseId),
          ),
        )
        .orderBy(asc(agentDecisions.createdAt)),
    ]);

  const approval = campaignDecisions.find((d) => d.step === "APPROVE");
  header.preApproved =
    (approval?.detail as { approvedBy?: string } | null)?.approvedBy === PRE_APPROVED_BY;

  const now = new Date();
  const out: BuyerCase[] = rows.map(({ kase, order, buyer, notice, token }) => {
    const ageDays = Math.floor(
      (now.getTime() - order.effectiveOrderDate.getTime()) / DAY_MS,
    );
    const lineCents = orderLines
      .filter((l) => l.orderId === order.id && l.productId === kase.productId)
      .reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
    const path = remedyPath({
      action: kase.action,
      offers: recall.remedyOptions,
      ageDays,
    });
    const status = caseStatus({
      status: kase.status,
      settledAt: kase.settledAt,
      openedAt: notice?.openedAt ?? null,
    });

    // "Why this happened": the campaign's steps, then this case's own.
    // Only three campaign steps matter to one buyer: the match, your approval and the notice draft.
    // The rest (tool lookups, rule checks) is the AI's research, shown behind a toggle.
    const headline = (d: { step: string; actor: string }) =>
      (d.step === "MATCH" && d.actor === "MODEL") ||
      d.step === "APPROVE" ||
      (d.step === "NOTIFY" && d.actor === "MODEL");
    const timeline: TimelineStep[] = campaignDecisions.map((d) => ({
      tag: tagOf(d.actor),
      text: clip(d.summary),
      research: !headline(d),
    }));
    if (notice)
      timeline.push({
        tag: "tool",
        text: "Notice delivered to the in-app outbox",
      });
    if (notice?.openedAt)
      timeline.push({ tag: "tool", text: "Buyer opened the notice" });
    const mine = caseDecisions.filter((d) => d.caseId === kase.id);
    for (const d of mine.filter((d) => d.step !== "SETTLE")) {
      timeline.push({ tag: tagOf(d.actor), text: clip(d.summary) });
    }
    if (kase.rationale) {
      timeline.push({
        tag: "rule",
        text: kase.rationale,
        code: kase.ruleApplied ?? undefined,
      });
    }
    for (const a of ledger.filter((a) => a.caseId === kase.id)) {
      const money = formatMoney(kase.amountCents ?? lineCents);
      const text =
        a.status === "SUCCEEDED"
          ? a.op === "REFUND"
            ? `PayPal refunded ${money}`
            : a.op === "PAYOUT"
              ? `PayPal Payouts sent ${money}`
              : "Tracking number added to the PayPal order"
          : a.status === "FAILED"
            ? `PayPal returned an error for the ${a.op.toLowerCase()}; nothing was sent`
            : `${a.op} sent to PayPal, waiting for its answer`;
      timeline.push({ tag: "tool", text });
    }
    for (const d of mine.filter((d) => d.step === "SETTLE")) {
      timeline.push({ tag: tagOf(d.actor), text: clip(d.summary) });
    }
    if (kase.status === "OPEN") {
      timeline.push({
        tag: "tool",
        text: "Waiting for the buyer to sign in with PayPal",
      });
    }

    return {
      id: kase.id,
      name: buyer.name,
      initials: initialsOf(buyer.name),
      daysAgo: ageDays,
      path,
      amountCents: kase.amountCents ?? lineCents,
      status,
      email: maskEmail(buyer.email),
      sent: notice ? relativeTime(notice.sentAt, now) : "Not sent",
      opened: Boolean(notice?.openedAt),
      subject: notice?.subject ?? "",
      body: notice?.body ?? "",
      draftedBy:
        (notice?.draftedBy as "MODEL" | "TEMPLATE" | undefined) ?? null,
      buyerPath: token ? `/r/${token}` : "",
      timeline,
    };
  });

  return {
    campaigns: options,
    header,
    cases: out,
    affected: lines.length,
    guide: await loadGuide(all, nameOf),
  };
}

// The demo has one buyer who can really sign in: the sandbox personal account. The guide points
// at the campaign that affects that buyer, and works out which step the visitor is on.
async function loadGuide(
  all: { campaign: typeof campaigns.$inferSelect; recall: typeof recalls.$inferSelect }[],
  nameOf: (sku: string) => string,
): Promise<DemoGuideState | null> {
  const [sandbox] = await db
    .select()
    .from(buyers)
    .where(like(buyers.email, "%@personal.example.com"))
    .limit(1);
  if (!sandbox) return null;

  const bought = await db
    .select({ sku: products.sku })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orders.buyerId, sandbox.id));
  const skus = new Set(bought.map((b) => b.sku));
  const targets = all.filter((a) => a.campaign.matchedSkus.some((s) => skus.has(s)));
  if (targets.length === 0) return null;

  const [link] = await db.select().from(buyerLinks).where(eq(buyerLinks.buyerId, sandbox.id));
  const theirCases = await db
    .select({ status: cases.status, settledAt: cases.settledAt })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .where(
      and(
        inArray(cases.campaignId, targets.map((t) => t.campaign.id)),
        eq(orders.buyerId, sandbox.id),
      ),
    );
  const featured = targets.find((t) => t.recall.recallNumber === FEATURED_RECALL) ?? targets[0];
  const featuredApproved = featured.campaign.status === "APPROVED";
  return {
    featured: {
      recallNumber: featured.recall.recallNumber,
      label: `${nameOf(featured.campaign.matchedSkus[0] ?? "")} recall`,
      approved: featuredApproved,
    },
    preApprovedCount: targets.filter(
      (t) => t !== featured && t.campaign.status === "APPROVED",
    ).length,
    buyerPath: featuredApproved && link ? `/r/${link.token}` : null,
    paid: theirCases.some((c) => PAID.includes(c.status)),
    settled: theirCases.some((c) => c.settledAt !== null),
  };
}
