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
  AI_LAYOUT,
  MONEY_COUNT,
  MONEY_GROUPS,
  MONEY_LAYOUT,
  pad,
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
type T = { n: number; text: string };

const STATUS_ICON = {
  pass: "check",
  fail: "alert",
  none: "clockdash",
} as const;
const STATUS_WORD = {
  pass: "Passed",
  fail: "Failed",
  none: "Not run",
} as const;

// A mark and a word, never colour alone.
function Result({ st }: { st: Status }) {
  return (
    <span className={`${styles.res} ${styles[st]}`}>
      <span className={styles.box} aria-hidden="true">
        <Icon name={STATUS_ICON[st]} />
      </span>
      {STATUS_WORD[st]}
    </span>
  );
}

// Rows of cells; each cell stacks one or more group tables. Groups the layout does not name go
// full width at the end, so a new group is never dropped.
function arrange(groups: TestGroup[], layout: string[][][]) {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const used = new Set<string>();
  const rows = layout.map((row) =>
    row.map((cell) =>
      cell.flatMap((id) => {
        const g = byId.get(id);
        if (!g) return [];
        used.add(id);
        return [g];
      }),
    ),
  );
  for (const g of groups) if (!used.has(g.id)) rows.push([[g]]);
  return rows.filter((r) => r.some((c) => c.length));
}

function Groups({
  groups,
  layout,
  area,
  statusOf,
  noteOf,
}: {
  groups: TestGroup[];
  layout: string[][][];
  area: string;
  statusOf: (t: T) => Status;
  noteOf?: (t: T) => string | null;
}) {
  return (
    <div className={styles.ledger}>
      {arrange(groups, layout).map((row, ri) => (
        <div
          key={ri}
          className={`${styles.lrow} ${row.length === 1 ? styles.full : ""}`}
        >
          {row.map((cell, ci) => (
            <div key={ci} className={styles.cell}>
              {cell.map((g) => {
                const passed = g.tests.filter(
                  (t) => statusOf(t) === "pass",
                ).length;
                return (
                  <table
                    key={g.id}
                    className={styles.tbl}
                    id={`g-${area}-${g.id}`}
                  >
                    <caption>
                      <span className={styles.capRow}>
                        <span className={styles.cap}>
                          <Icon name={g.icon} />
                          {g.label}
                        </span>
                        <span className={styles.ccount}>
                          {passed}/{g.tests.length}
                          <span className="sr-only"> passed</span>
                        </span>
                      </span>
                    </caption>
                    <colgroup>
                      <col className={styles.cn} />
                      <col />
                      <col className={styles.cr} />
                    </colgroup>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Test number</th>
                        <th scope="col">What it checks</th>
                        <th scope="col">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.tests.map((t) => {
                        const note = noteOf?.(t);
                        return (
                          <tr key={t.n}>
                            <td className={styles.n}>{pad(t.n)}</td>
                            <td className={styles.t}>
                              {t.text}
                              {note && (
                                <span className={styles.note}>{note}</span>
                              )}
                            </td>
                            <td className={styles.r}>
                              <Result st={statusOf(t)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })}
            </div>
          ))}
        </div>
      ))}
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
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const windowStatus = (n: number) =>
    unitStatus({
      text:
        MONEY_GROUPS.flatMap((g) => g.tests).find((t) => t.n === n)?.text ?? "",
    });
  const refundStops = WINDOW_STOPS.filter((s) => s.remedy === "refund").length;

  const verdict = (passed: number, total: number, ran: boolean): Status =>
    !ran ? "none" : passed === total ? "pass" : "fail";

  const score = [
    {
      key: "money",
      passed: moneyPassed,
      total: MONEY_COUNT,
      ran: !!unit,
      what: "money and app tests pass",
      tag: "rule" as const,
    },
    {
      key: "ai",
      passed: aiPassed,
      total: AI_COUNT,
      ran: !!ai,
      what: "AI checks pass",
      tag: "model" as const,
    },
  ];

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
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/dashboard">Dashboard</Link>
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
      </header>

      <main className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="title">
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>
              <Icon name="code" />
              {RUN.file}
            </p>
            <h1 className={styles.h1} id="title">
              Test results
            </h1>
            <p className={styles.lede}>
              <b>Fixed rules move the money; the AI only reads and explains.</b>{" "}
              Both are tested separately.
            </p>
          </div>

          <aside
            className={`${styles.run} on-dark`}
            aria-labelledby="run-title"
          >
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
            <p className={styles.runCap}>
              Runs the {MONEY_COUNT} money-rule and identity tests on your
              machine. The {AI_COUNT} AI tests use the Anthropic API:{" "}
              <code>npm run eval</code>.
            </p>
          </aside>
        </section>

        <section
          className={styles.score}
          aria-label={`Result of the last run. ${TOTAL_COUNT} tests in total. ${passedCount} passed, ${failedCount} failed, ${TOTAL_COUNT - passedCount - failedCount} not run.`}
        >
          {score.map((s) => (
            <div key={s.key} className={styles.fig}>
              <Tag kind={s.tag} />
              <p className={styles.big}>
                <b>
                  {s.passed} of {s.total}
                </b>{" "}
                <span>{s.what}</span>
              </p>
              <span className={styles.meter} aria-hidden="true">
                <i
                  style={
                    { "--f": s.total ? s.passed / s.total : 0 } as CSSProperties
                  }
                />
              </span>
              <Result st={verdict(s.passed, s.total, s.ran)} />
            </div>
          ))}
          <dl className={styles.meta} aria-label="Summary of the last run">
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
        </section>

        <section className={styles.section} aria-labelledby="wtitle">
          <h2 className={styles.h2} id="wtitle">
            The 180-day window
          </h2>
          <p className={styles.sub}>
            Four of the money rules, on one timeline. Inside 180 days the buyer
            is refunded. After that, PayPal Payouts.
          </p>
          <div
            className={styles.window}
            style={
              {
                "--stops": WINDOW_STOPS.length,
                "--refund": refundStops,
              } as CSSProperties
            }
          >
            <p className={styles.cut}>Window closes after day 180</p>
            <ol className={styles.win}>
              {WINDOW_STOPS.map((s, i) => (
                <li
                  key={s.day}
                  className={`${styles.stop} ${s.remedy === "refund" ? styles.refund : styles.payout} ${
                    i === refundStops ? styles.after : ""
                  }`}
                >
                  <span className={styles.track} aria-hidden="true" />
                  <p className={styles.day}>{s.day}</p>
                  <p className={styles.out}>
                    <Icon name={s.remedy} />
                    {s.remedy === "refund" ? "Refund" : "PayPal Payout"}
                  </p>
                  <p className={styles.why}>{s.why}</p>
                  <p className={styles.proof}>
                    <span>Test {pad(s.test)}</span>
                    <Result st={windowStatus(s.test)} />
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="money">
          <div className={styles.shead}>
            <h2 className={styles.h2} id="money">
              Money rules
            </h2>
            <div className={styles.sline}>
              <Tag kind="rule" />
              <p className={styles.sdesc}>
                The fixed code that decides refunds, payouts, replacements and
                repairs, and checks who is asking.
              </p>
              <p className={styles.stally}>
                {moneyPassed} of {MONEY_COUNT} passed
              </p>
            </div>
          </div>
          <Groups
            groups={MONEY_GROUPS}
            layout={MONEY_LAYOUT}
            area="money"
            statusOf={unitStatus}
          />
        </section>

        <section className={styles.section} aria-labelledby="ai">
          <div className={styles.shead}>
            <h2 className={styles.h2} id="ai">
              AI matching and safety
            </h2>
            <div className={styles.sline}>
              <Tag kind="model" />
              <p className={styles.sdesc}>
                How the AI matches recalls, refuses near misses and ignores
                injected text.
                {ai && (
                  <>
                    {" "}
                    Each test ran {ai.attempts} times on{" "}
                    <span className={styles.mono}>{ai.model}</span> on{" "}
                    <span className={styles.mono}>{fmtDate(ai.ranAt)}</span>,
                    without saved answers.
                  </>
                )}
              </p>
              <p className={styles.stally}>
                {ai ? `${aiPassed} of ${AI_COUNT} passed` : "not run yet"}
              </p>
            </div>
          </div>
          <Groups
            groups={AI_GROUPS}
            layout={AI_LAYOUT}
            area="ai"
            statusOf={aiStatus}
            noteOf={aiNote}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <p className={styles.wrap}>
          Demo store. The merchant and order dates are made up; the recalls are
          real CPSC recalls, with brand names replaced. Not affiliated with CPSC
          or PayPal.
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
