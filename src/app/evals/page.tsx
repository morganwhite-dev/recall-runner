import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { CopyButton } from "./CopyButton";
import {
  AI_COUNT,
  AI_GROUPS,
  MONEY_COUNT,
  MONEY_GROUPS,
  pad,
  RING,
  RUN,
  TOTAL_COUNT,
  WINDOW_STOPS,
  type TestGroup,
} from "./data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Test results | Recall Runner",
  robots: { index: false, follow: false },
};

const GITHUB_URL = "https://github.com/morganwhite-dev/recall-runner";

function Groups({ groups, planned }: { groups: TestGroup[]; planned?: boolean }) {
  return (
    <div className={styles.groups}>
      {groups.map((g) => (
        <div key={g.id} className={styles.grp} role="group" aria-labelledby={`g-${planned ? "ai" : "money"}-${g.id}`}>
          <p className={styles.glabel} id={`g-${planned ? "ai" : "money"}-${g.id}`}>
            <Icon name={g.icon} />
            {g.label}
          </p>
          <ol className={styles.rows}>
            {g.tests.map((t) => (
              <li key={t.n}>
                <span className={styles.st}>
                  <Icon name={planned ? "clockdash" : "check"} />
                  <span className="sr-only">{planned ? "Planned, not run yet." : "Passed."}</span>
                </span>
                <span className={styles.n}>{pad(t.n)}</span>
                <span className={styles.t}>{t.text}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

export default function EvalsPage() {
  return (
    <>
      <header className={`${styles.field} ${styles.top} on-plum`}>
        <div className={styles.wrap}>
          <Link className={styles.logo} href="/">
            <span className={styles.mark}>
              <Icon name="loop" />
            </span>
            Recall Runner
          </Link>
          <nav aria-label="Main">
            <ul>
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link href="/evals" aria-current="page">
                  Test results
                </Link>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                  <Icon name="ext" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className={styles.wrap}>
        <section className={styles.hero} aria-label="Result of the last run and how to reproduce it">
          <div
            className={styles.ring}
            role="img"
            aria-label={`${TOTAL_COUNT} tests in total. ${MONEY_COUNT} money-rule tests passed. ${AI_COUNT} AI tests planned, not run yet.`}
          >
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <g transform="rotate(-90 100 100)" fill="none">
                <circle cx="100" cy="100" r={RING.radius} stroke="#E6D3EA" strokeWidth="18" strokeDasharray={RING.plannedFill} />
                <circle cx="100" cy="100" r={RING.radius} stroke="#5B2A66" strokeWidth="2" strokeDasharray={RING.plannedLine} />
                <circle cx="100" cy="100" r={RING.radius} stroke="#3B1F3F" strokeWidth="18" strokeDasharray={RING.passed} />
              </g>
            </svg>
            <div className={styles.mid}>
              <b>
                {MONEY_COUNT}/{MONEY_COUNT}
              </b>
              <span>passing</span>
            </div>
          </div>

          <div>
            <span className={styles.qbar} aria-hidden="true" />
            <p className={styles.eyebrow}>
              <Icon name="code" />
              {RUN.file}
            </p>
            <h1 className={styles.h1}>Test results</h1>
            <p className={styles.lede}>
              <b>Fixed rules move the money; the AI only reads and explains.</b> Both are tested separately.
            </p>
            <dl className={styles.figs} aria-label="Summary of the last run">
              <div>
                <dt>Failing</dt>
                <dd>{RUN.failing}</dd>
              </div>
              <div>
                <dt>Run time</dt>
                <dd>{RUN.runTime}</dd>
              </div>
              <div>
                <dt>Last run</dt>
                <dd>{RUN.lastRun}</dd>
              </div>
            </dl>
          </div>

          <aside className={`${styles.run} on-plum`} aria-labelledby="run-title">
            <h2 id="run-title">
              <Icon name="code" />
              Run it yourself
            </h2>
            <div className={styles.cmd}>
              <code>
                <i aria-hidden="true">$</i>
                {RUN.command}
              </code>
              <CopyButton text={RUN.command} />
            </div>
            <p className={styles.cap}>Runs the {MONEY_COUNT} money-rule tests on your machine.</p>
          </aside>
        </section>

        <section className={styles.window} aria-labelledby="wtitle">
          <h2 id="wtitle">The 180-day window</h2>
          <p>Four of the money rules, on one timeline. Inside 180 days the buyer is refunded. After that, PayPal Payouts.</p>
          <ol className={styles.win}>
            {WINDOW_STOPS.flatMap((s, i) => {
              const stop = (
                <li key={s.day} className={`${styles.stop} ${s.remedy === "refund" ? styles.refund : styles.payout}`}>
                  <p className={styles.day}>{s.day}</p>
                  <p className={styles.out}>
                    <Icon name={s.remedy} />
                    {s.remedy === "refund" ? "Refund" : "PayPal Payout"}
                  </p>
                  <p className={styles.why}>{s.why}</p>
                  <p className={styles.proof}>
                    Test {pad(s.test)}{" "}
                    <span className={styles.ok}>
                      <Icon name="check" />
                      Passed
                    </span>
                  </p>
                </li>
              );
              // The cut sits between the last refund stop and the first payout stop.
              return WINDOW_STOPS[i + 1]?.remedy === "payout" && s.remedy === "refund"
                ? [
                    stop,
                    <li key="cut" className={styles.cut} aria-hidden="true">
                      <span>Window closes after day 180</span>
                    </li>,
                  ]
                : [stop];
            })}
          </ol>
        </section>

        <section className={styles.sec} aria-labelledby="money">
          <div className={styles.shead}>
            <Tag kind="rule" />
            <h2 id="money">Money rules</h2>
            <span className={`${styles.pill} ${styles.pass}`}>
              <Icon name="check" />
              {MONEY_COUNT} of {MONEY_COUNT} passed
            </span>
          </div>
          <p className={styles.sdesc}>The fixed code that decides refunds, payouts, replacements and repairs.</p>
          <Groups groups={MONEY_GROUPS} />
        </section>

        <section className={`${styles.sec} ${styles.ai}`} aria-labelledby="ai">
          <div className={styles.shead}>
            <Tag kind="model" />
            <h2 id="ai">AI matching and safety</h2>
            <span className={`${styles.pill} ${styles.plan}`}>
              <Icon name="clockdash" />
              {AI_COUNT} planned, not run yet
            </span>
          </div>
          <p className={styles.sdesc}>How the AI matches recalls, refuses near misses and ignores injected text. Building in Phase 3.</p>
          <Groups groups={AI_GROUPS} planned />
        </section>
      </main>

      <footer className={styles.wrap}>
        <p className={styles.disclaimer}>
          Demo store. The merchant and order dates are made up; the recalls are real CPSC data. Not affiliated with CPSC or PayPal.
        </p>
      </footer>
    </>
  );
}
