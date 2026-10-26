import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AutoRefresh } from "./AutoRefresh";
import type { DemoGuideState } from "./data";
import styles from "./page.module.css";

// "What do I do next?" for someone trying the demo. Four steps, the current one highlighted, each
// ticked once it has really happened (read from the database, not remembered by the page).
// The steps are about the featured (hand-warmers) recall. On any other campaign only a short pointer
// is shown, so the strip never describes a different recall from the one on screen.
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
      <section className={styles.guideNote} aria-label="Try the demo">
        {refresh}
        <Icon name="info" />
        <p>
          {f.approved
            ? "This recall was approved in advance for the demo. The walkthrough runs on the hand-warmers recall."
            : "Start the walkthrough on the hand-warmers recall."}
        </p>
        <Link
          className={styles.guideLink}
          href={`/dashboard?campaign=${f.recallNumber}`}
        >
          Go to the {f.label}
        </Link>
      </section>
    );
  }

  const done = [f.approved, guide.paid, guide.paid, guide.settled];
  const active = done.findIndex((d) => !d);

  const steps = [
    {
      title: "Approve the hand-warmers recall",
      text:
        guide.preApprovedCount > 0
          ? `You are the store. Approving opens its cases and notifies the buyers. The other ${guide.preApprovedCount} recalls (a replacement and a repair kit) were approved in advance.`
          : "You are the store. Approving opens its cases and notifies the buyers.",
      action: !f.approved && (
        <span className={styles.guideHint}>Press Approve campaign above.</span>
      ),
    },
    {
      title: "Open the buyer page",
      text: 'Now you are the customer: the sandbox buyer (marked "Sign in here" in the table), whose orders cover every remedy. The other buyers are fictional.',
      action: guide.buyerPath && (
        <a
          className={styles.guideLink}
          href={guide.buyerPath}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open buyer page <Icon name="ext" />
        </a>
      ),
    },
    {
      title: "Confirm with PayPal",
      text: "The sandbox buyer login is shown under the Confirm with PayPal button on the buyer page. Sign in with it and PayPal sends the money.",
      action: null,
    },
    {
      title: "Watch it settle",
      text: "PayPal confirms the payment, usually in under a minute. This page updates by itself.",
      action: null,
    },
  ];

  return (
    <section className={styles.guide} aria-label="Try the demo">
      {refresh}
      <p className={styles.guideTitle}>
        Try the demo <span>about 2 minutes</span>
      </p>
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={
              done[i]
                ? styles.guideDone
                : i === active
                  ? styles.guideNow
                  : undefined
            }
            aria-current={i === active ? "step" : undefined}
          >
            <span className={styles.guideNum}>
              {done[i] ? <Icon name="check" /> : i + 1}
              <span className="sr-only">{done[i] ? " (done)" : ""}</span>
            </span>
            <div>
              <b>{s.title}</b>
              <span>{s.text}</span>
              {s.action}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
