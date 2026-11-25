import Link from "next/link";
import { ART_PATHS } from "@/components/ProductArt";
import { Count } from "@/components/Count";
import { StartFreshDemo } from "@/components/StartFreshDemo";
import { Icon, type IconName } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { Tag, type TagKind } from "@/components/Tag";
import { DEMO_STEPS } from "@/lib/demo-config";
import { loadImpact, type Impact } from "@/lib/impact";
import { REFUND_WINDOW_DAYS } from "@/lib/policy";
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

// What each mark means, in the words the legend has always used.
const LEGEND: { tag: TagKind; means: string }[] = [
  { tag: "model", means: "the AI" },
  { tag: "rule", means: "fixed code" },
  { tag: "tool", means: "a lookup or PayPal call" },
  { tag: "you", means: "a person" },
];

// The four paths in src/lib/policy.ts (decideRemedy). The window comes from the same constant.
const ROUTES: { name: string; when: string; money: string }[] = [
  {
    name: "Refund",
    when: `Paid within ${REFUND_WINDOW_DAYS} days`,
    money: "Back to the PayPal payment",
  },
  {
    name: "Payout",
    when: `Paid more than ${REFUND_WINDOW_DAYS} days ago`,
    money: "Sent by PayPal Payouts",
  },
  {
    name: "Replacement",
    when: "Remedy is a new unit",
    money: "Tracking added to the order",
  },
  { name: "Repair kit", when: "Remedy is a repair", money: "No money moves" },
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

// The three figures in the impact strip. Each reads one count from the recalls table. `zero` is
// what stands in for the number when it is 0, so the line reads as a sentence, not a bug.
type Figure = { n: number; label: string; zero?: string };
const impactFigures = (i: Impact): Figure[] => [
  { n: i.soldOnline, label: `of ${i.total} recalls involved online sales` },
  {
    n: i.amazon,
    label: `of ${i.total} were sold on a major online marketplace`,
  },
  {
    n: i.barcodeListed,
    label: `of ${i.total} listed a barcode number, so text matching is needed`,
    zero: "None",
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
      <header className={`${styles.bar} on-dark`}>
        <nav aria-label="Primary" className={styles.wrap}>
          <Link className={`${styles.logo} logo-turn`} href="/">
            <span className={styles.mark} aria-hidden="true">
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
        </nav>
      </header>

      <main className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="title">
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>PayPal hackathon demo</p>
            <h1 className={styles.h1} id="title">
              Recalled products, refunded through PayPal
            </h1>
            <p className={styles.lede}>
              An AI agent watches the US government recall feed, finds a store’s
              affected buyers in its PayPal orders, and lets each buyer settle
              in one sign-in.
            </p>
            <p className={styles.heroStat}>
              Only about 6% of buyers act on a recall announced by press
              release. About 50% act when notified directly.{" "}
              <span>CPSC data, FY2013–16</span>
            </p>
            <div className={styles.cta}>
              <StartFreshDemo />
              <p>
                Resets the demo store: real recalls waiting for your approval
                and sandbox PayPal orders. About 20 seconds.
              </p>
            </div>
          </div>

          <aside className={styles.board} aria-label="Example case">
            <p className={styles.boardHead}>
              <span>Example</span>
              <span className={`${styles.mono} recall-no`}>CPSC #27011</span>
            </p>
            <div className={styles.boardBody}>
              <div className={styles.caseHead}>
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
                  {ART_PATHS.warmer}
                </svg>
                <div>
                  <h2 className={styles.caseTitle}>
                    Rechargeable hand warmers recall
                  </h2>
                  <p className={styles.remedy}>
                    Remedy: <b>refund · $34.00 each</b>
                  </p>
                </div>
              </div>

              <dl className={styles.metrics}>
                <div>
                  <dt>Status</dt>
                  <dd className={styles.metricStatus}>
                    <Icon name="tick" />
                    Approved
                  </dd>
                </div>
                <div>
                  <dt>Orders affected</dt>
                  <dd>6</dd>
                </div>
                <div>
                  <dt>Notified</dt>
                  <dd>6</dd>
                </div>
                <div>
                  <dt>Settled</dt>
                  <dd>2</dd>
                </div>
              </dl>

              {/* The money moment: one settled case printed as a receipt. */}
              <div className={styles.receipt}>
                <dl className={styles.leaders}>
                  <div>
                    <dt>Buyer</dt>
                    <dd>Morgan Demo</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>202 days ago</dd>
                  </div>
                  <div>
                    <dt>Refund window</dt>
                    <dd>{REFUND_WINDOW_DAYS} days</dd>
                  </div>
                  <div>
                    <dt>Path</dt>
                    <dd>PayPal Payouts</dd>
                  </div>
                </dl>
                <div className={styles.total}>
                  <span className={styles.totalAmt}>$34.00</span>
                  <span className={styles.stamp}>
                    <StatusPill>Settled</StatusPill>
                  </span>
                </div>
              </div>

              <div className={styles.ruleline}>
                <Tag kind="rule" />
                <div>
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
            </div>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="s-try">
          <h2 className={styles.h2} id="s-try">
            How to try the demo
          </h2>
          <ol className={styles.tryIt}>
            {DEMO_STEPS.map((step, i) => (
              <li key={step.title}>
                <span className={styles.tryN} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <b>{step.title}</b>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className={impact ? styles.split : undefined}>
          <section className={styles.section} aria-labelledby="s1">
            <h2 className={styles.h2} id="s1">
              Why notify directly
            </h2>
            <div className={styles.stats}>
              <div>
                <p className={styles.big}>6%</p>
                <p>
                  Press release only<span>act on the recall</span>
                </p>
              </div>
              <div className={styles.statHi}>
                <p className={styles.big}>
                  <span aria-hidden="true">~</span>
                  <span className="sr-only">About </span>50%
                </p>
                <p>
                  Notified directly<span>act on the recall</span>
                </p>
              </div>
            </div>
            <p className={styles.cite}>
              About 6% of buyers act on a recall announced only by press
              release; about 50% act when notified directly. (CPSC data,
              FY2013–16, as cited by consumer groups)
            </p>
          </section>

          {impact && (
            <section className={styles.section} aria-labelledby="s0">
              <h2 className={styles.h2} id="s0">
                Why order records
              </h2>
              <p className={styles.sub}>
                A store’s own orders reach buyers fastest. Matching product text
                covers what barcodes don’t.
              </p>
              <dl className={styles.impact}>
                {impactFigures(impact).map((f) => (
                  <div key={f.label}>
                    <dt>
                      {f.n === 0 && f.zero ? (
                        f.zero
                      ) : (
                        <Count className={styles.countUp} value={f.n} />
                      )}
                    </dt>
                    <dd>{f.label}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.cite}>
                Source: CPSC recalls since {sinceLabel(impact.since)}, counted
                from the recalls in this app’s database.
              </p>
            </section>
          )}
        </div>

        <section className={styles.section} aria-labelledby="s2">
          <h2 className={styles.h2} id="s2">
            How it works
          </h2>
          <p className={styles.sub}>
            AI suggests, you approve, fixed rules move the money.
          </p>
          <ol className={styles.line}>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className={styles.stop} aria-hidden="true">
                  {i + 1}
                </span>
                <Tag kind={step.tag} />
                <h3>{step.title}</h3>
                {step.cap && <p>{step.cap}</p>}
              </li>
            ))}
          </ol>
          <p className={styles.legend}>
            {LEGEND.map((l) => (
              <span key={l.tag}>
                <Tag kind={l.tag} /> = {l.means}
              </span>
            ))}
          </p>
        </section>

        <section className={styles.section} aria-labelledby="s4">
          <h2 className={styles.h2} id="s4">
            Where the money goes
          </h2>
          <ul className={styles.routes}>
            {ROUTES.map((r) => (
              <li key={r.name}>
                <b>{r.name}</b>
                <span>{r.when}</span>
                <span className={styles.routeMoney}>{r.money}</span>
              </li>
            ))}
          </ul>
          <p className={styles.legend}>
            <span>
              <Tag kind="rule" /> Fixed code picks the path. The AI never does.
            </span>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="s3">
          <h2 className={styles.h2} id="s3">
            What PayPal does here
          </h2>
          <p className={styles.sub}>All calls run in the PayPal sandbox.</p>
          <ul className={styles.pp}>
            {PAYPAL.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} />
                <div>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          Demo store. The merchant and order dates are made up; the recalls are
          real CPSC recalls, with brand names replaced. Not affiliated with CPSC
          or PayPal.
        </div>
      </footer>
    </>
  );
}
