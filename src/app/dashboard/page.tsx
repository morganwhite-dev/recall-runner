import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { Tag } from "@/components/Tag";
import { Suspense } from "react";
import { ART_PATHS } from "@/components/ProductArt";
import { loadDashboard } from "@/lib/dashboard";
import { Count } from "@/components/Count";
import { ApproveButton } from "./ApproveButton";
import { CampaignSwitch } from "./CampaignSwitch";
import { DemoGuide } from "./DemoGuide";
import { campaignStats, formatDate, formatMoney } from "./data";
import styles from "./page.module.css";
import { Workspace } from "./Workspace";

export const metadata: Metadata = {
  title: "Merchant dashboard | Recall Runner",
};

async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const { campaign } = await searchParams;
  const data = await loadDashboard(
    typeof campaign === "string" ? campaign : undefined,
  );
  if (!data) {
    return (
      <main className={styles.wrap}>
        <p className={styles.empty}>
          Nothing here yet. Head back to the home page and choose Start fresh
          demo to set up a store.
        </p>
      </main>
    );
  }
  const { header, cases: CASES } = data;
  const approved = header.status === "APPROVED";
  const stats = campaignStats(CASES, data.affected);
  const offers = header.remedies;

  const paths: {
    icon: IconName;
    title: string;
    text: string;
    count: number | null;
  }[] = [
    {
      icon: "refund",
      title: "Refund",
      text: "Paid within 180 days",
      count: offers.includes("Refund") ? stats.byPath.Refund : null,
    },
    {
      icon: "payout",
      title: "PayPal Payout",
      text: "Paid more than 180 days ago",
      count: offers.includes("Refund") ? stats.byPath["PayPal Payout"] : null,
    },
    {
      icon: "truck",
      title: "Replacement",
      text: "Tracking added to the order",
      count: offers.includes("Replace") ? stats.byPath.Replacement : null,
    },
    {
      icon: "wrench",
      title: "Repair",
      text: "Kit request, no money",
      count: offers.includes("Repair") ? stats.byPath.Repair : null,
    },
  ];

  return (
    <>
      <header className={`${styles.top} on-plum`}>
        <div className={`${styles.wrap} ${styles.topBar}`}>
          <Link className={`${styles.logo} logo-turn`} href="/">
            <span className={styles.mark}>
              <Icon name="loop" />
            </span>
            Recall Runner
          </Link>
          <p className={styles.store}>
            Store <b>Brightnest Home</b>
          </p>
          <nav aria-label="Primary" className={styles.topNav}>
            <Link href="/evals">Test results</Link>
          </nav>
          <CampaignSwitch
            options={data.campaigns}
            current={header.recallNumber}
          />
          {approved ? (
            <p className={styles.approval}>
              You approved this campaign <StatusPill>Approved</StatusPill>
            </p>
          ) : (
            <div className={styles.approval}>
              <ApproveButton campaignId={header.id} />
            </div>
          )}
        </div>
      </header>

      <main className={styles.wrap}>
        {data.guide && <DemoGuide guide={data.guide} current={header.recallNumber} />}
        <section className={styles.recall} aria-labelledby="title">
          <svg
            className={styles.art}
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
          <div>
            <p className={styles.meta}>
              <span className={styles.badge}>CPSC #{header.recallNumber}</span>
              <span>Recall · {formatDate(header.recallDate)}</span>
            </p>
            <h1 id="title">{header.title}</h1>
            <p className={styles.sub}>
              <b>Product:</b> {header.productNames.join(", ")} · <b>Remedy:</b>{" "}
              {header.remedies.map((r) => r.toLowerCase()).join(" or ")}
              {header.priceCents !== null && offers.includes("Refund") && (
                <> · {formatMoney(header.priceCents)} each</>
              )}
            </p>
          </div>
        </section>

        <dl className={styles.kpis} aria-label="Campaign results">
          <div>
            <dt>
              <span className={styles.kico}>
                <Icon name="person" />
              </span>
              Buyers affected
            </dt>
            <dd>
              <Count className={styles.countUp} value={stats.affected} />
            </dd>
            <p>Found in PayPal orders</p>
          </div>
          <div>
            <dt>
              <span className={styles.kico}>
                <Icon name="bell" />
              </span>
              Notified
            </dt>
            <dd>
              <Count className={styles.countUp} value={stats.notified} />
            </dd>
            <p>
              {stats.notified} of {stats.affected} buyers
            </p>
          </div>
          <div>
            <dt>
              <span className={styles.kico}>
                <Icon name="check" />
              </span>
              Settled
            </dt>
            <dd>
              <Count className={styles.countUp} value={stats.settled} />
            </dd>
            <p>
              {stats.settledRefunds} refunds · {stats.settledPayouts} payouts
              {stats.settledOther > 0 && (
                <> · {stats.settledOther} kits or replacements</>
              )}
            </p>
          </div>
          <div>
            <dt>
              <span className={styles.kico}>
                <Icon name="wrench" />
              </span>
              Products fixed
            </dt>
            <dd>
              <Count
                className={styles.countUp}
                value={stats.fixedPercent}
                unit="%"
              />
            </dd>
            <div
              className={styles.bar}
              role="progressbar"
              aria-valuenow={stats.fixedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Products fixed, ${stats.settled} of ${stats.affected}`}
            >
              <i style={{ width: `${stats.fixedPercent}%` }} />
            </div>
            <p>
              {stats.settled} of {stats.affected}
            </p>
          </div>
        </dl>

        <Workspace cases={CASES} approved={approved} key={header.id} />

        <section className={styles.money} aria-labelledby="money">
          <header>
            <Tag kind="rule" />
            <h2 id="money">How money moves</h2>
            <p>Fixed rules, not the AI, pick the path for each order</p>
          </header>
          <ul className={styles.paths}>
            {paths.map((p) => (
              <li
                key={p.title}
                className={p.count === null ? styles.off : undefined}
              >
                <Icon name={p.icon} />
                <div>
                  <b>{p.title}</b>
                  <span>{p.text}</span>
                  <span className={styles.cnt}>
                    {p.count === null ? (
                      <>
                        <Icon name="minus" />
                        Not in this recall
                      </>
                    ) : (
                      `${p.count} cases`
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer>
        <div className={styles.wrap}>
          <p className={styles.disclaimer}>
            Demo store. The merchant and order dates are made up; the recalls
            are real CPSC data. Not affiliated with CPSC or PayPal.
          </p>
        </div>
      </footer>
    </>
  );
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={null}>
      <Dashboard {...props} />
    </Suspense>
  );
}
