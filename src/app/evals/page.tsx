import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { loadAiResults, loadUnitResults } from "@/lib/evals";
import { CopyButton } from "./CopyButton";
import {
  AI_COUNT,
  AI_GROUPS,
  MONEY_COUNT,
  MONEY_GROUPS,
  pad,
  ringFor,
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

type Status = "pass" | "fail" | "none";

const STATUS_ICON = { pass: "check", fail: "alert", none: "clockdash" } as const;
const STATUS_WORD = { pass: "Passed.", fail: "Failed.", none: "Not run yet." } as const;

function Groups({
  groups,
  area,
  statusOf,
  noteOf,
}: {
  groups: TestGroup[];
  area: string;
  statusOf: (t: { n: number; text: string }) => Status;
  noteOf?: (t: { n: number; text: string }) => string | null;
}) {
  return (
    <div className={styles.groups}>
      {groups.map((g, gi) => {
        const statuses = g.tests.map(statusOf);
        const passed = statuses.filter((x) => x === "pass").length;
        return (
          <div
            key={g.id}
            className={styles.grp}
            style={{ "--i": gi, "--span": g.span } as CSSProperties}
            role="group"
            aria-labelledby={`g-${area}-${g.id}`}
          >
            <header className={styles.ghead}>
              <p className={styles.glabel} id={`g-${area}-${g.id}`}>
                <span className={styles.gico}>
                  <Icon name={g.icon} />
                </span>
                {g.label}
              </p>
              <span className={styles.gcount}>
                {passed}/{g.tests.length}
                <span className="sr-only"> passed</span>
              </span>
            </header>
            <span className={styles.meter} aria-hidden="true">
              {statuses.map((st, i) => (
                <i key={i} className={styles[st]} />
              ))}
            </span>
            <ol className={styles.rows}>
              {g.tests.map((t) => {
                const st = statusOf(t);
                const note = noteOf?.(t);
                return (
                  <li key={t.n}>
                    <span className={`${styles.st} ${styles[st]}`}>
                      <Icon name={STATUS_ICON[st]} />
                      <span className="sr-only">{STATUS_WORD[st]}</span>
                    </span>
                    <span className={styles.n}>{pad(t.n)}</span>
                    <span className={styles.t}>
                      {t.text}
                      {note && <span className={styles.note}> {note}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

async function Results() {
  const unit = loadUnitResults();
  const ai = await loadAiResults();

  // A test is passed only if a recorded run says so.
  const unitStatus = (t: { text: string }): Status => {
    const hit = unit?.tests.find((x) => x.name === t.text);
    return hit ? (hit.passed ? "pass" : "fail") : "none";
  };
  const aiStatus = (t: { n: number }): Status => {
    const c = ai?.cases[t.n];
    return c ? (c.passed === c.attempts ? "pass" : "fail") : "none";
  };
  const aiNote = (t: { n: number }) => {
    const c = ai?.cases[t.n];
    return c ? `${c.passed} of ${c.attempts} runs` : null;
  };

  const moneyStatuses = MONEY_GROUPS.flatMap((g) => g.tests.map(unitStatus));
  const aiStatuses = AI_GROUPS.flatMap((g) => g.tests.map(aiStatus));
  const all = [...moneyStatuses, ...aiStatuses];
  const passedCount = all.filter((x) => x === "pass").length;
  const failedCount = all.filter((x) => x === "fail").length;
  const moneyPassed = moneyStatuses.filter((x) => x === "pass").length;
  const aiPassed = aiStatuses.filter((x) => x === "pass").length;
  const ring = ringFor(all.map((x) => x === "pass"));
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const windowStatus = (n: number) => unitStatus({ text: MONEY_GROUPS.flatMap((g) => g.tests).find((t) => t.n === n)?.text ?? "" });

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
            aria-label={`${TOTAL_COUNT} tests in total. ${passedCount} passed, ${failedCount} failed, ${TOTAL_COUNT - passedCount - failedCount} not run.`}
          >
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <g transform="rotate(-90 100 100)" fill="none">
                <circle cx="100" cy="100" r={ring.radius} stroke="#E6D3EA" strokeWidth="18" strokeDasharray={ring.all} />
                <circle cx="100" cy="100" r={ring.radius} stroke="#3B1F3F" strokeWidth="18" strokeDasharray={ring.passed} />
              </g>
            </svg>
            <div className={styles.mid}>
              <b>
                {passedCount}/{TOTAL_COUNT}
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
                <dd>{failedCount}</dd>
              </div>
              <div>
                <dt>Run time</dt>
                <dd>{unit ? `${unit.durationMs} ms` : "n/a"}</dd>
              </div>
              <div>
                <dt>Last run</dt>
                <dd>{unit ? `${fmtDate(new Date(unit.ranAt))} UTC` : "never"}</dd>
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
            <p className={styles.cap}>
              Runs the {MONEY_COUNT} money-rule and identity tests on your machine. The {AI_COUNT} AI tests use the Anthropic API:{" "}
              <code>npm run eval</code>.
            </p>
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
                      <Icon name={STATUS_ICON[windowStatus(s.test)]} />
                      {windowStatus(s.test) === "pass" ? "Passed" : windowStatus(s.test) === "fail" ? "Failed" : "Not run"}
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
              <Icon name={moneyPassed === MONEY_COUNT ? "check" : "alert"} />
              {moneyPassed} of {MONEY_COUNT} passed
            </span>
          </div>
          <p className={styles.sdesc}>The fixed code that decides refunds, payouts, replacements and repairs, and checks who is asking.</p>
          <Groups groups={MONEY_GROUPS} area="money" statusOf={unitStatus} />
        </section>

        <section className={`${styles.sec} ${styles.ai}`} aria-labelledby="ai">
          <div className={styles.shead}>
            <Tag kind="model" />
            <h2 id="ai">AI matching and safety</h2>
            <span className={`${styles.pill} ${aiPassed === AI_COUNT ? styles.pass : styles.plan}`}>
              <Icon name={aiPassed === AI_COUNT ? "check" : ai ? "alert" : "clockdash"} />
              {ai ? `${aiPassed} of ${AI_COUNT} passed` : "not run yet"}
            </span>
          </div>
          <p className={styles.sdesc}>
            How the AI matches recalls, refuses near misses and ignores injected text.
            {ai && (
              <>
                {" "}
                Each test ran {ai.attempts} times on {ai.model} on {fmtDate(ai.ranAt)}, without saved answers.
              </>
            )}
          </p>
          <Groups groups={AI_GROUPS} area="ai" statusOf={aiStatus} noteOf={aiNote} />
        </section>
      </main>

      <footer className={styles.wrap}>
        <p className={styles.disclaimer}>
          Demo store. The merchant and order dates are made up; the recalls are real CPSC recalls, with brand names replaced. Not affiliated with CPSC or PayPal.
        </p>
      </footer>
    </>
  );
}

export default function EvalsPage() {
  return (
    <Suspense fallback={null}>
      <Results />
    </Suspense>
  );
}
