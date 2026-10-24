import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { Tag } from "@/components/Tag";
import { CASES, campaignStats, formatMoney, PRODUCT } from "./data";
import styles from "./page.module.css";
import { Workspace } from "./Workspace";

export const metadata: Metadata = {
  title: "Merchant dashboard | Recall Runner",
};

const CAMPAIGN = "Rechargeable hand warmers recall (CPSC #27011)";

export default function DashboardPage() {
  const stats = campaignStats(CASES);

  const paths: {
    icon: IconName;
    title: string;
    text: string;
    count: number | null;
  }[] = [
    { icon: "refund", title: "Refund", text: "Paid within 180 days", count: stats.refundCases },
    { icon: "payout", title: "PayPal Payout", text: "Paid more than 180 days ago", count: stats.payoutCases },
    { icon: "truck", title: "Replacement", text: "Tracking added to the order", count: null },
    { icon: "wrench", title: "Repair", text: "Kit request, no money", count: null },
  ];

  return (
    <>
      <header className={`${styles.top} on-plum`}>
        <div className={`${styles.wrap} ${styles.topBar}`}>
          <Link className={styles.logo} href="/">
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
          <label className={styles.switch}>
            <span className={styles.switchLabel}>Campaign</span>
            <select defaultValue="27011">
              <option value="27011">{CAMPAIGN}</option>
            </select>
            <Icon name="chev" />
          </label>
          <p className={styles.approval}>
            You approved this campaign <StatusPill>Approved</StatusPill>
          </p>
        </div>
      </header>

      <main className={styles.wrap}>
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
            <rect x="22" y="40" width="52" height="40" rx="12" />
            <rect x="30" y="48" width="36" height="24" rx="7" strokeWidth="1.5" strokeDasharray="3 4" />
            <path d="M36 30c-3-4 3-6 0-11M48 30c-3-4 3-6 0-11M60 30c-3-4 3-6 0-11" />
          </svg>
          <div>
            <p className={styles.meta}>
              <span className={styles.badge}>CPSC #27011</span>
              <span>Recall · Oct 1, 2026</span>
            </p>
            <h1 id="title">
              Kobayashi Recalls Rechargeable Hand Warmers Due to Risk of Serious
              Injury from Fire and Burn Hazards
            </h1>
            <p className={styles.sub}>
              <b>Product:</b> {PRODUCT}, 2-pack · <b>Remedy:</b> refund ·{" "}
              {formatMoney(CASES[0].amountCents)} each
            </p>
          </div>
        </section>

        <dl className={styles.kpis} aria-label="Campaign results">
          <div>
            <dt>Buyers affected</dt>
            <dd>{stats.affected}</dd>
            <p>Found in PayPal orders</p>
          </div>
          <div>
            <dt>Notified</dt>
            <dd>{stats.notified}</dd>
            <p>
              {stats.notified} of {stats.affected} buyers
            </p>
          </div>
          <div>
            <dt>Settled</dt>
            <dd>{stats.settled}</dd>
            <p>
              {stats.settledRefunds} refunds · {stats.settledPayouts} payout
            </p>
          </div>
          <div>
            <dt>Products fixed</dt>
            <dd>{stats.fixedPercent}%</dd>
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

        <Workspace />

        <section className={styles.money} aria-labelledby="money">
          <header>
            <Tag kind="rule" />
            <h2 id="money">How money moves</h2>
            <p>Fixed rules, not the AI, pick the path for each order</p>
          </header>
          <ul className={styles.paths}>
            {paths.map((p) => (
              <li key={p.title} className={p.count === null ? styles.off : undefined}>
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
