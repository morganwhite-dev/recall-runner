import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ART_PATHS } from "@/components/ProductArt";
import { StatusPill } from "@/components/StatusPill";
import { loadDashboard } from "@/lib/dashboard";
import { resetNoticeFrom } from "@/lib/reset-notice";
import { TweenMoney } from "@/components/TweenMoney";
import { shortName } from "@/app/r/[token]/data";
import { ApproveButton } from "./ApproveButton";
import { DemoGuide } from "./DemoGuide";
import { ResetNotice } from "./ResetNotice";
import { campaignStats, formatDate, formatMoney } from "./data";
import styles from "./page.module.css";
import { Sidebar } from "./Sidebar";
import shell from "./shell.module.css";
import { Workspace } from "./Workspace";

export const metadata: Metadata = {
  title: "Merchant dashboard | Recall Runner",
};

async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
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
      <Sidebar campaigns={data.campaigns} current={header.recallNumber} />

      <main className={shell.main}>
        <h1 className="sr-only">Merchant dashboard</h1>
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

        <section
          className={`${shell.recall} ${shell.band}`}
          aria-labelledby="title"
        >
          <div className={shell.artTile}>
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
          </div>
          <div className={shell.title}>
            <p className={shell.recallMeta}>
              <span className={shell.badge}>CPSC #{header.recallNumber}</span>
              <span>Recall · {formatDate(header.recallDate)}</span>
            </p>
            <h2 id="title">
              {header.productNames.map(shortName).join(", ") || header.title}
            </h2>
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
              <span className={shell.moneyWrap}>
                <TweenMoney className={shell.money} cents={paidCents} />
                <span className={shell.moneyLabel}>settled</span>
              </span>
            </p>
            <div className={shell.segs} aria-hidden="true">
              <span className={shell.seg}>
                <i style={{ width: stats.affected ? "100%" : "0%" }} />
              </span>
              <span className={shell.seg}>
                <i
                  style={{
                    width: stats.affected ? share(stats.notified) : "0%",
                  }}
                />
              </span>
              <span className={shell.seg}>
                <i style={{ width: share(opened) }} />
              </span>
              <span className={shell.seg}>
                <i
                  className={shell.green}
                  style={{ width: share(stats.settled) }}
                />
                <i
                  className={shell.amber}
                  style={{ width: share(stats.awaiting) }}
                />
              </span>
            </div>
            <div className={shell.nums}>
              <div title="Orders that contain the recalled product; each one is a case">
                <b>{stats.affected}</b>Orders
              </div>
              <div>
                <b>{stats.notified}</b>Sent
              </div>
              <div title="Buyers who opened the notice, including those since settled">
                <b>{opened}</b>Read
              </div>
              <div>
                <b>{stats.settled}</b>
                Settled{stats.awaiting > 0 && <> · {stats.awaiting} waiting</>}
              </div>
            </div>
          </section>
        </section>

        <div className={`${shell.content} ${shell.band}`}>
          <Workspace
            cases={CASES}
            activity={data.activity}
            approved={approved}
            key={header.id}
          />
        </div>
      </main>
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
