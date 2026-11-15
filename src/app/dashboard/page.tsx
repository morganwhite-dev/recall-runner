import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ART_PATHS } from "@/components/ProductArt";
import { StatusPill } from "@/components/StatusPill";
import { loadDashboard } from "@/lib/dashboard";
import { resetNoticeFrom } from "@/lib/reset-notice";
import { TweenMoney } from "@/components/TweenMoney";
import { shortName } from "@/app/r/[token]/data";
import { ApproveButton } from "./ApproveButton";
import { DemoGuide } from "./DemoGuide";
import { Funnel } from "./Funnel";
import { ResetNotice } from "./ResetNotice";
import { campaignStats, formatDate, formatMoney } from "./data";
import styles from "./page.module.css";
import shell from "./shell.module.css";
import { TopBar } from "./TopBar";
import { Workspace } from "./Workspace";

export const metadata: Metadata = {
  title: "Merchant dashboard | Recall Runner",
};

async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  // Everything below depends on the clock and the database, so render at request time. Without
  // this, Next.js tries to prerender the page and stops at the Date.now() in resetNoticeFrom.
  await connection();
  const { campaign, reset, since } = await searchParams;
  // After "Start fresh demo" ran into the cooldown or an error (see demo/actions.ts).
  const notice = resetNoticeFrom(reset, since);
  const data = await loadDashboard(
    typeof campaign === "string" ? campaign : undefined,
  );
  if (!data) {
    return (
      <main className={styles.wrap}>
        {notice && <ResetNotice notice={notice} key={notice.kind} />}
        <h1 className={shell.h1}>Merchant dashboard</h1>
        <p className={styles.empty}>
          Nothing here yet. Head back to the home page and choose Start fresh
          demo to set up a store.
        </p>
      </main>
    );
  }
  // An address for a campaign that doesn't exist is an error, not a silent switch to another one.
  if (typeof campaign === "string" && campaign !== data.header.recallNumber)
    notFound();
  const { header, cases: CASES } = data;
  const approved = header.status === "APPROVED";
  const stats = campaignStats(CASES, data.affected);
  const offers = header.remedies;
  const opened = CASES.filter((c) => c.opened).length;
  // Money that PayPal has confirmed moving, for the progress card.
  const paidCents = CASES.filter(
    (c) =>
      c.status === "Settled" &&
      (c.path === "Refund" || c.path === "PayPal Payout"),
  ).reduce((sum, c) => sum + c.amountCents, 0);
  // The four bars, each as a share of the buyers affected.
  const share = (n: number) =>
    `${stats.affected ? Math.round((n / stats.affected) * 100) : 0}%`;

  return (
    <div className={shell.root}>
      {notice && (
        <ResetNotice
          notice={notice}
          key={notice.kind === "cooldown" ? notice.since : notice.kind}
        />
      )}
      {data.guide && (
        <DemoGuide
          guide={data.guide}
          current={header.recallNumber}
          waiting={stats.awaiting > 0}
          settledCents={paidCents}
        />
      )}
      <TopBar campaigns={data.campaigns} current={header.recallNumber} />

      <main className={`${shell.main} ${shell.band}`}>
        {/* The recall on the left, its progress on the right: the same two columns as the case
            table and the detail panel below, so the page reads as one grid. */}
        <section className={shell.recall} aria-labelledby="title">
          <div className={shell.title}>
            <p className={shell.recallMeta}>
              <span className={shell.artTile}>
                <svg
                  viewBox="0 0 96 96"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ART_PATHS[header.art]}
                </svg>
              </span>
              <span className={shell.eyebrow}>Merchant dashboard</span>
              <span className={shell.badge}>CPSC #{header.recallNumber}</span>
              <span>Recall · {formatDate(header.recallDate)}</span>
            </p>
            <h1 id="title" className={shell.h1}>
              {header.productNames.map(shortName).join(", ") || header.title}
            </h1>
            {/* The official CPSC wording, kept for the record but out of the way. */}
            <p className={shell.official} title={header.title}>
              {header.title}
            </p>
            <p className={shell.sub}>
              <b>Product:</b> {header.productNames.join(", ")} · <b>Remedy:</b>{" "}
              {header.remedies.map((r) => r.toLowerCase()).join(" or ")}
              {header.priceCents !== null && offers.includes("Refund") && (
                <> · {formatMoney(header.priceCents)} each</>
              )}
            </p>
            {approved ? (
              <p className={shell.approval}>
                {header.preApproved
                  ? "Approved in advance for the demo"
                  : "You approved this campaign"}{" "}
                <StatusPill>Approved</StatusPill>
              </p>
            ) : (
              <div className={shell.approval}>
                <ApproveButton campaignId={header.id} />
              </div>
            )}
          </div>

          <section className={shell.progress} aria-label="Campaign progress">
            <p className={shell.progressHead}>
              Progress
              {stats.awaiting > 0 && (
                <span className={shell.live} aria-hidden="true" />
              )}
            </p>
            {/* One row per stage: what it counts, a bar (its share of the orders), the count. */}
            <div className={shell.rows}>
              <div
                className={shell.row}
                title="Orders that contain the recalled product; each one is a case"
              >
                <span className={shell.rowLabel}>Orders</span>
                <span className={shell.seg} aria-hidden="true">
                  <i style={{ width: stats.affected ? "100%" : "0%" }} />
                </span>
                <b>{stats.affected}</b>
              </div>
              <div className={shell.row}>
                <span className={shell.rowLabel}>Sent</span>
                <span className={shell.seg} aria-hidden="true">
                  <i
                    style={{
                      width: stats.affected ? share(stats.notified) : "0%",
                    }}
                  />
                </span>
                <b>{stats.notified}</b>
              </div>
              <div
                className={shell.row}
                title="Buyers who opened the notice, including those since settled"
              >
                <span className={shell.rowLabel}>Read so far</span>
                <span className={shell.seg} aria-hidden="true">
                  <i style={{ width: share(opened) }} />
                </span>
                <b>{opened}</b>
              </div>
              <div className={shell.row}>
                <span className={shell.rowLabel}>
                  Settled
                  {stats.awaiting > 0 && <> · {stats.awaiting} waiting</>}
                </span>
                <span className={shell.seg} aria-hidden="true">
                  <i
                    className={shell.green}
                    style={{ width: share(stats.settled) }}
                  />
                  <i
                    className={shell.amber}
                    style={{ width: share(stats.awaiting) }}
                  />
                </span>
                <b>{stats.settled}</b>
              </div>
            </div>
            <p className={shell.moneyWrap}>
              <span className={shell.moneyLabel}>settled</span>
              <TweenMoney className={shell.money} cents={paidCents} />
            </p>
          </section>
        </section>

        <Workspace
          cases={CASES}
          activity={data.activity}
          approved={approved}
          funnel={
            data.funnel && (
              <Funnel funnel={data.funnel} current={header.recallNumber} />
            )
          }
          key={header.id}
        />
      </main>

      <footer className={`${shell.footer} on-plum`}>
        <p className={shell.band}>
          Demo store. The merchant and order dates are made up; the recalls are
          real CPSC recalls, with brand names replaced. Not affiliated with CPSC
          or PayPal.
        </p>
      </footer>
    </div>
  );
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={null}>
      <Dashboard {...props} />
    </Suspense>
  );
}
