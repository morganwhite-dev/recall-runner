import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AutoRefresh } from "./AutoRefresh";
import type { DemoGuideState } from "./data";
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
}: {
  guide: DemoGuideState;
  current: string;
  waiting: boolean; // a payment on this page is waiting for PayPal's confirmation
}) {
  const f = guide.featured;
  const onFeatured = f.recallNumber === current;
  const refresh = (
    <AutoRefresh active={waiting || (guide.paid && !guide.settled)} />
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

  const done = [f.approved, guide.paid, guide.paid, guide.settled];
  const active = done.findIndex((d) => !d);
  const doneCount = done.filter(Boolean).length;
  const steps = [
    { title: "Approve the hand-warmers recall", short: "Approve" },
    { title: "Open the buyer page", short: "Open buyer page" },
    { title: "Confirm with PayPal", short: "Confirm with PayPal" },
    { title: "Watch it settle", short: "Watch it settle" },
  ];
  const hints = [
    "Press Approve campaign in the recall header. It opens the cases and notifies the buyers.",
    "You are the customer now: the sandbox buyer, marked “You · sign in here” in the table. Press Open buyer page.",
    "On the buyer page, press Confirm with PayPal. “Show sandbox login” under it gives you the test account.",
    "PayPal confirms the payment, usually in under a minute. This page updates by itself.",
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
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={`${styles.step} ${done[i] ? styles.stepDone : ""} ${i === active ? styles.stepNow : ""}`}
            aria-current={i === active ? "step" : undefined}
            title={s.title}
          >
            <span className={styles.stepNum}>
              {done[i] ? <Icon name="check" /> : i + 1}
              <span className="sr-only">{done[i] ? " (done)" : ""}</span>
            </span>
            {s.short}
          </li>
        ))}
      </ol>
      <div className={styles.stepperAct}>
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
          <span>{hints[active]}</span>
        ) : (
          <span>All four steps done.</span>
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
