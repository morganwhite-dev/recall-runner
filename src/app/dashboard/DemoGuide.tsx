import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AutoRefresh } from "@/components/AutoRefresh";
import { StartFreshDemo } from "@/components/StartFreshDemo";
import { formatMoney, type DemoGuideState } from "./data";
import styles from "./shell.module.css";

// "What do I do next?" for someone trying the demo, as one line across the top. Four steps, the
// current one highlighted, each ticked once it has really happened (read from the database, not
// remembered by the page). The steps are about the featured (hand-warmers) recall. On any other
// campaign only a short pointer is shown, so the strip never describes a different recall from the
// one on screen.
export function DemoGuide({
  guide,
  current,
  waiting,
  settledCents,
}: {
  guide: DemoGuideState;
  current: string;
  waiting: boolean; // a payment on this page is waiting for PayPal's confirmation
  settledCents: number; // money PayPal has confirmed moving on this campaign
}) {
  const f = guide.featured;
  const onFeatured = f.recallNumber === current;
  // Polls from approval until PayPal confirms, and re-reads on return to this tab, which is how the
  // dashboard sees the buyer pay in the other tab. The only AutoRefresh on the page with onFocus.
  const refresh = (
    <AutoRefresh active={waiting || (f.approved && !guide.settled)} onFocus />
  );

  if (!onFeatured) {
    return (
      <section
        className={`${styles.note} ${styles.band}`}
        aria-label="Try the demo"
      >
        {refresh}
        <Icon name="info" />
        <p>
          {f.approved
            ? "This recall was approved in advance for the demo. The walkthrough runs on the hand-warmers recall."
            : "Start the walkthrough on the hand-warmers recall."}
        </p>
        <Link href={`/dashboard?campaign=${f.recallNumber}`}>
          Go to the {f.label}
        </Link>
      </section>
    );
  }

  // Opening the buyer page is ticked from the notice's opened time. A judge who goes straight to
  // a receipt (?case=) never marks it opened, so paying ticks it too and the steps stay in order.
  const done = [
    f.approved,
    guide.opened || guide.paid,
    guide.paid,
    guide.settled,
  ];
  const active = done.findIndex((d) => !d);
  const doneCount = done.filter(Boolean).length;
  const steps = [
    { title: "Approve the hand-warmers recall", short: "Approve" },
    { title: "Open the buyer page", short: "Open buyer page" },
    { title: "Confirm with PayPal", short: "Confirm with PayPal" },
    { title: "Watch it settle", short: "Watch it settle" },
  ];
  // Kept short so the line fits beside the steps; the full text is also the tooltip.
  const hints = [
    "Press Approve campaign in the recall header.",
    "You are the sandbox buyer now. Press Open buyer page.",
    "Press “Confirm with PayPal”. “Show sandbox login” has the test account.",
    "PayPal confirms in under a minute. This page updates itself.",
  ];

  return (
    <section
      className={`${styles.stepper} ${styles.band}`}
      aria-label="Try the demo"
    >
      {refresh}
      <p className={styles.stepperTitle}>
        Try the demo <span>about 2 minutes</span>
      </p>
      <ol className={`${styles.steps} ${active < 0 ? styles.stepsDone : ""}`}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={`${styles.step} ${done[i] ? styles.stepDone : ""} ${i === active ? styles.stepNow : ""}`}
            aria-current={i === active ? "step" : undefined}
            title={s.title}
          >
            <span className={styles.stepNum}>
              {done[i] ? <Icon name="tick" /> : i + 1}
              <span className="sr-only">{done[i] ? " (done)" : ""}</span>
            </span>
            <span className={styles.stepLabel}>{s.short}</span>
          </li>
        ))}
      </ol>
      <div
        className={`${styles.stepperAct} ${active < 0 ? styles.stepperActDone : ""}`}
      >
        {active === 1 && guide.buyerPath ? (
          <a
            className={styles.stepperLink}
            href={guide.buyerPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open buyer page <Icon name="ext" />
          </a>
        ) : active >= 0 ? (
          <>
            <span className={styles.stepperHint} title={hints[active]}>
              {hints[active]}
            </span>
            {/* For a judge who closed the buyer tab before confirming. */}
            {active === 2 && guide.buyerPath && (
              <a
                className={styles.stepperSub}
                href={guide.buyerPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open buyer page <Icon name="ext" />
              </a>
            )}
          </>
        ) : (
          <>
            <span className={styles.stepperHint}>
              {settledCents > 0
                ? `Done. The buyer signed in once and PayPal moved ${formatMoney(settledCents)}.`
                : "Done. The buyer signed in once and PayPal confirmed it."}
            </span>
            <StartFreshDemo
              look={{
                label: "Replay demo",
                pendingLabel: "Resetting… about 20 seconds",
                icon: "loop",
                className: styles.stepperLink,
              }}
            />
            <Link className={styles.stepperSub} href="/#s2">
              How it works
            </Link>
          </>
        )}
      </div>
      <i
        className={styles.progressLine}
        style={{
          width: `${Math.min(100, ((doneCount + (active >= 0 ? 0.5 : 0)) / 4) * 100)}%`,
        }}
        aria-hidden="true"
      />
    </section>
  );
}
