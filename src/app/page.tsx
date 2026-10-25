import Link from "next/link";
import { StartFreshDemo } from "@/components/StartFreshDemo";
import { Icon, type IconName } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { Tag, type TagKind } from "@/components/Tag";
import styles from "./page.module.css";

const GITHUB_URL = "https://github.com/morganwhite-dev/recall-runner";

const STEPS: { tag: TagKind; title: string; cap?: string }[] = [
  { tag: "model", title: "The agent finds a matching recall", cap: "AI" },
  { tag: "you", title: "You approve the campaign" },
  {
    tag: "tool",
    title: "Buyers tap their link and sign in with PayPal",
    cap: "Buyer",
  },
  {
    tag: "rule",
    title: "PayPal refunds, pays out, or tracks a replacement",
    cap: "Rules decide which",
  },
];

const PAYPAL: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "orders",
    title: "Order records",
    text: "Finds who bought the recalled item.",
  },
  {
    icon: "key",
    title: "Log in with PayPal",
    text: "Checks the buyer owns the order.",
  },
  { icon: "refund", title: "Refunds", text: "Orders paid within 180 days." },
  {
    icon: "payout",
    title: "Payouts",
    text: "Orders paid more than 180 days ago.",
  },
  {
    icon: "truck",
    title: "Shipment tracking",
    text: "Adds replacement tracking to the order.",
  },
  {
    icon: "bell",
    title: "Webhooks",
    text: "Updates each case when PayPal reports back.",
  },
];

const JUDGE_STEPS = [
  "Start fresh demo",
  "Approve the campaign",
  "Open a buyer link from the Outbox",
  "Sign in with the sandbox buyer",
  "Watch the case settle",
];

export default function Home() {
  return (
    <>
      <header className={`${styles.field} on-plum`}>
        <nav aria-label="Primary">
          <div className={styles.wrap}>
            <Link className={`${styles.logo} logo-turn`} href="/">
              <span className={styles.mark}>
                <Icon name="loop" />
              </span>
              Recall Runner
            </Link>
            <ul className={styles.navList}>
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link href="/evals">Test results</Link>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className={`${styles.wrap} ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>PayPal hackathon demo</p>
            <h1 className={styles.h1}>
              Recalled products, <span>refunded</span> through PayPal
            </h1>
            <p className={styles.lede}>
              An AI agent watches the US government recall feed, finds a store’s
              affected buyers in its PayPal orders, and lets each buyer settle
              in one tap.
            </p>
            <div className={styles.cta}>
              <StartFreshDemo />
              <p className={styles.note}>
                Resets the demo store: real recalls waiting for your approval
                and sandbox PayPal orders. About 20 seconds.
              </p>
            </div>
          </div>

          <aside className={styles.case} aria-label="Example case">
            <div className={styles.caseHead}>
              <svg
                viewBox="0 0 96 96"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="22" y="40" width="52" height="40" rx="12" />
                <rect
                  x="30"
                  y="48"
                  width="36"
                  height="24"
                  rx="7"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                />
                <path d="M36 30c-3-4 3-6 0-11M48 30c-3-4 3-6 0-11M60 30c-3-4 3-6 0-11" />
              </svg>
              <div>
                <span className={styles.badge}>CPSC #27011</span>
                <h2 className={styles.caseTitle}>
                  Rechargeable hand warmers recall
                </h2>
                <p className={styles.remedy}>
                  Remedy: <b>refund · $34.00 each</b>
                </p>
              </div>
            </div>
            <dl className={styles.metrics}>
              <div className={styles.metric}>
                <dt>Status</dt>
                <dd className={styles.metricStatus}>
                  <Icon name="check" />
                  Approved
                </dd>
              </div>
              <div className={styles.metric}>
                <dt>Buyers affected</dt>
                <dd>6</dd>
              </div>
              <div className={styles.metric}>
                <dt>Notified</dt>
                <dd>6</dd>
              </div>
              <div className={styles.metric}>
                <dt>Settled</dt>
                <dd>3</dd>
              </div>
            </dl>
            <div className={styles.ruleline}>
              <Tag kind="rule" />
              <div>
                <span className={styles.settled}>
                  <StatusPill>Settled</StatusPill>
                </span>
                <p>
                  Morgan Demo paid 200 days ago, past PayPal’s 180-day refund
                  window, so the buyer is paid by PayPal Payouts instead:
                  $34.00.
                </p>
                <code className={styles.code}>REFUND_WINDOW_EXCEEDED</code>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main className={styles.wrap}>
        <section
          className={`${styles.section} ${styles.first}`}
          aria-labelledby="s1"
        >
          <div className={styles.row}>
            <div>
              <h2 className={styles.title} id="s1">
                Why notify directly
              </h2>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.n}>6%</div>
                <span className={styles.bar} aria-hidden="true" />
                <p>
                  Press release only<span>Buyers who act</span>
                </p>
              </div>
              <div className={`${styles.stat} ${styles.hi}`}>
                <div className={styles.n}>
                  <span className={styles.tilde} aria-hidden="true">
                    ~
                  </span>
                  <span className="sr-only">About </span>50%
                </div>
                <span className={styles.bar} aria-hidden="true" />
                <p>
                  Notified directly<span>Buyers who act</span>
                </p>
              </div>
              <p className={styles.cite}>
                About 6% of buyers act on a recall announced only by press
                release; about 50% act when notified directly. (CPSC data,
                FY2013–16, as cited by consumer groups)
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="s2">
          <div className={styles.row}>
            <div>
              <h2 className={styles.title} id="s2">
                How it works
              </h2>
              <p className={styles.sub}>
                AI suggests, you approve, fixed rules move the money.
              </p>
            </div>
            <ol className={styles.timeline}>
              {STEPS.map((step, i) => (
                <li className={styles.step} key={step.title}>
                  <span className={styles.node} aria-hidden="true">
                    {i + 1}
                  </span>
                  <Tag kind={step.tag} />
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  {step.cap && <p className={styles.cap}>{step.cap}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="s3">
          <div className={styles.row}>
            <div>
              <h2 className={styles.title} id="s3">
                What PayPal does here
              </h2>
              <p className={styles.sub}>All calls run in the PayPal sandbox.</p>
            </div>
            <ul className={styles.pp}>
              {PAYPAL.map((item) => (
                <li className={styles.ppItem} key={item.title}>
                  <Icon name={item.icon} />
                  <div>
                    <b>{item.title}</b>
                    <span>{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.judges}`}
          aria-labelledby="s4"
        >
          <div className={styles.judgesHead}>
            <h2 id="s4">For judges</h2>
            <span className={styles.when}>About 2 minutes</span>
          </div>
          <ol className={styles.judgeList}>
            {JUDGE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={styles.readme}>Sandbox login is in the README.</p>
        </section>
      </main>

      <footer>
        <div className={`${styles.wrap} ${styles.footer}`}>
          Demo store. The merchant and order dates are made up; the recalls are
          real CPSC data. Not affiliated with CPSC or PayPal.
        </div>
      </footer>
    </>
  );
}
