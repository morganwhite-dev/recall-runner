import Link from "next/link";
import { ART_PATHS } from "@/components/ProductArt";
import { Count } from "@/components/Count";
import { StartFreshDemo } from "@/components/StartFreshDemo";
import { Icon, type IconName } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { Tag, type TagKind } from "@/components/Tag";
import { DEMO_STEPS } from "@/lib/demo-config";
import { loadImpact, type Impact } from "@/lib/impact";
import styles from "./page.module.css";

const GITHUB_URL = "https://github.com/morganwhite-dev/recall-runner";

const STEPS: { tag: TagKind; title: string; cap?: string }[] = [
  { tag: "model", title: "The agent finds a matching recall", cap: "AI" },
  { tag: "you", title: "You approve the campaign", cap: "You" },
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

// The three figures in the impact strip. Each reads one count from the recalls table.
const impactFigures = (i: Impact) => [
  { n: i.soldOnline, label: `of ${i.total} recalls involved online sales` },
  { n: i.amazon, label: `of ${i.total} were sold on Amazon` },
  {
    n: i.barcodeListed,
    label: `of ${i.total} listed a barcode number, so text matching is needed`,
  },
];

const sinceLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function Home() {
  // null when the query fails or finds nothing; the strip is then left out.
  const impact = await loadImpact();

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
              in one sign-in.
            </p>
            <p className={styles.heroStat}>
              Only about 6% of buyers act on a recall announced by press
              release. About 50% act when notified directly.
              <span>CPSC data, FY2013–16</span>
            </p>
            <div className={styles.cta}>
              <StartFreshDemo />
              <p className={styles.note}>
                Resets the demo store: real recalls waiting for your approval
                and sandbox PayPal orders. About 20 seconds.
              </p>
              <ol className={styles.tryIt} aria-label="How to try the demo">
                {DEMO_STEPS.map((step) => (
                  <li key={step.title}>
                    <span>
                      <b>{step.title}</b> {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className={styles.case} aria-label="Example case">
            <p className={styles.exampleTag}>Example</p>
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
                {ART_PATHS.warmer}
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
                  <Icon name="done" />
                  Approved
                </dd>
              </div>
              <div className={styles.metric}>
                <dt>Orders affected</dt>
                <dd>6</dd>
              </div>
              <div className={styles.metric}>
                <dt>Notified</dt>
                <dd>6</dd>
              </div>
              <div className={styles.metric}>
                <dt>Settled</dt>
                <dd>2</dd>
              </div>
            </dl>
            <div className={styles.ruleline}>
              <Tag kind="rule" />
              <div>
                <span className={styles.settled}>
                  <StatusPill>Settled</StatusPill>
                </span>
                <p>
                  Morgan Demo paid 202 days ago, past PayPal’s 180-day refund
                  window, so the buyer is paid by PayPal Payouts instead:
                  $34.00.
                </p>
                <p className={styles.codeNote}>
                  Rule that applied: paid past the 180-day refund window
                </p>
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
                  Press release only<span>act on the recall</span>
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
                  Notified directly<span>act on the recall</span>
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

        {impact && (
          <section className={styles.section} aria-labelledby="s0">
            <div className={styles.row}>
              <div>
                <h2 className={styles.title} id="s0">
                  Why order records
                </h2>
                <p className={styles.sub}>
                  A store’s own orders reach buyers fastest. Matching product
                  text covers what barcodes don’t.
                </p>
              </div>
              <div>
                <dl className={styles.impact}>
                  {impactFigures(impact).map((f) => (
                    <div className={styles.fig} key={f.label}>
                      <dt>
                        <Count className={styles.countUp} value={f.n} />
                      </dt>
                      <dd>{f.label}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.cite}>
                  Source: CPSC recalls since {sinceLabel(impact.since)}, counted
                  from the recalls in this app’s database.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="s2">
          <div className={styles.row}>
            <div>
              <h2 className={styles.title} id="s2">
                How it works
              </h2>
              <p className={styles.sub}>
                AI suggests, you approve, fixed rules move the money.
              </p>
              <p className={styles.legend}>
                Model = the AI · Rule = fixed code · Tool = a lookup or PayPal
                call · You = a person
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
      </main>

      <footer>
        <div className={`${styles.wrap} ${styles.footer}`}>
          Demo store. The merchant and order dates are made up; the recalls are
          real CPSC recalls, with brand names replaced. Not affiliated with CPSC or PayPal.
        </div>
      </footer>
    </>
  );
}
