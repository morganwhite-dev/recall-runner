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
  type ActivityEvent,
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
  activity: ActivityEvent[]; // newest first
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
  // Closed and total cases per campaign, for the sidebar list.
  const caseStates = await db
    .select({
      campaignId: cases.campaignId,
      status: cases.status,
      settledAt: cases.settledAt,
    })
    .from(cases);
  const options: CampaignOption[] = all.map(({ campaign, recall }) => {
    const mine = caseStates.filter((k) => k.campaignId === campaign.id);
    return {
      recallNumber: recall.recallNumber,
      label: `${nameOf(campaign.matchedSkus[0] ?? "")} recall (CPSC #${recall.recallNumber})`,
      name: nameOf(campaign.matchedSkus[0] ?? ""),
      remedy: recall.remedyOptions.map((r) => r.toLowerCase()).join(" or "),
      approval:
        campaign.status !== "APPROVED"
          ? "Needs your approval"
          : recall.recallNumber === FEATURED_RECALL
            ? "Approved by you"
            : "Pre-approved",
      closed: mine.filter((k) => caseStatus({ ...k, openedAt: null }) === "Settled").length,
      total: mine.length,
    };
  });

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
    (approval?.detail as { approvedBy?: string } | null)?.approvedBy ===
    PRE_APPROVED_BY;

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
      timeline.push({
        tag: "tool",
        text:
          a.status === "SUCCEEDED" && a.paypalRef
            ? `${text} (PayPal id ${a.paypalRef})`
            : text,
      });
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
      canSignIn: buyer.email.toLowerCase().endsWith("@personal.example.com"),
      awaitingPayPal: PAID.includes(kase.status) && !kase.settledAt,
      timeline,
    };
  });

  const activity = buildActivity({
    rows,
    ledger,
    caseDecisions,
    campaignDecisions,
    out,
    now,
  });

  return {
    campaigns: options,
    header,
    cases: out,
    activity,
    affected: lines.length,
    guide: await loadGuide(all, nameOf),
  };
}

// Recent events for the Activity feed, newest first. Every line comes from a stored row: the
// notice, the sign-in step, the PayPal ledger and the settle time set by a verified webhook.
function buildActivity(input: {
  rows: {
    kase: typeof cases.$inferSelect;
    notice: typeof notices.$inferSelect | null;
  }[];
  ledger: (typeof paypalActions.$inferSelect)[];
  caseDecisions: (typeof agentDecisions.$inferSelect)[];
  campaignDecisions: (typeof agentDecisions.$inferSelect)[];
  out: BuyerCase[];
  now: Date;
}): ActivityEvent[] {
  const { rows, ledger, caseDecisions, campaignDecisions, out, now } = input;
  const events: (ActivityEvent & { time: number })[] = [];
  const add = (
    id: string,
    at: Date,
    kind: ActivityEvent["kind"],
    text: string,
    amountCents?: number,
  ) =>
    events.push({
      id,
      at: at.toISOString(),
      when: relativeTime(at, now),
      kind,
      text,
      amountCents,
      time: at.getTime(),
    });

  const approval = campaignDecisions.find((d) => d.step === "APPROVE");
  if (approval)
    add(
      `approved-${approval.id}`,
      approval.createdAt,
      "approved",
      "You approved the campaign",
    );

  for (const { kase, notice } of rows) {
    const c = out.find((o) => o.id === kase.id);
    if (!c) continue;
    const first = c.name.split(" ")[0];
    if (notice)
      add(`sent-${kase.id}`, notice.sentAt, "sent", `Notice sent to ${c.name}`);
    if (notice?.openedAt)
      add(
        `opened-${kase.id}`,
        notice.openedAt,
        "opened",
        `${c.name} opened the notice`,
      );
    for (const d of caseDecisions.filter(
      (d) => d.caseId === kase.id && d.step === "CLAIM",
    )) {
      add(
        `signin-${d.id}`,
        d.createdAt,
        "signin",
        `${first} signed in with PayPal`,
      );
    }
    for (const a of ledger.filter(
      (a) => a.caseId === kase.id && a.status === "SUCCEEDED",
    )) {
      if (a.op === "TRACKING") {
        add(
          `track-${a.id}`,
          a.updatedAt,
          "settled",
          `Tracking added for ${first}'s replacement`,
        );
      } else {
        const what = a.op === "REFUND" ? "refund" : "payout";
        add(
          `paid-${a.id}`,
          a.updatedAt,
          "paid",
          `PayPal accepted ${first}'s ${what}`,
          c.amountCents,
        );
      }
    }
    if (kase.settledAt && PAID.includes(kase.status)) {
      const what = kase.status === "REFUNDED" ? "refund" : "payout";
      add(
        `settled-${kase.id}`,
        kase.settledAt,
        "settled",
        `PayPal confirmed ${first}'s ${what}`,
        c.amountCents,
      );
    }
  }
  return events
    .sort((a, b) => b.time - a.time)
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      at: e.at,
      when: e.when,
      kind: e.kind,
      text: e.text,
      amountCents: e.amountCents,
    }));
}

// The demo has one buyer who can really sign in: the sandbox personal account. The guide points
// at the campaign that affects that buyer, and works out which step the visitor is on.
async function loadGuide(
  all: {
    campaign: typeof campaigns.$inferSelect;
    recall: typeof recalls.$inferSelect;
  }[],
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
  const targets = all.filter((a) =>
    a.campaign.matchedSkus.some((s) => skus.has(s)),
  );
  if (targets.length === 0) return null;

  const [link] = await db
    .select()
    .from(buyerLinks)
    .where(eq(buyerLinks.buyerId, sandbox.id));
  const theirCases = await db
    .select({ status: cases.status, settledAt: cases.settledAt })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .where(
      and(
        inArray(
          cases.campaignId,
          targets.map((t) => t.campaign.id),
        ),
        eq(orders.buyerId, sandbox.id),
      ),
    );
  const featured =
    targets.find((t) => t.recall.recallNumber === FEATURED_RECALL) ??
    targets[0];
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
