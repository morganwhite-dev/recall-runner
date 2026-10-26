import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { DemoGuideState } from "./data";
import styles from "./page.module.css";

// "What do I do next?" for someone trying the demo. Four steps, the current one highlighted, each
// ticked once it has really happened (read from the database, not remembered by the page).
export function DemoGuide({ guide, current }: { guide: DemoGuideState; current: string }) {
  const total = guide.campaigns.length;
  const approvedCount = guide.campaigns.filter((c) => c.approved).length;
  const next = guide.campaigns.find((c) => !c.approved);
  const onNext = next?.recallNumber === current;
  const done = [approvedCount === total, guide.paid, guide.paid, guide.settled];
  const active = done.findIndex((d) => !d);

  const steps = [
    {
      title: `Approve the ${total} campaigns`,
      text: `You are the store. ${approvedCount} of ${total} approved. Each one covers a different remedy: a refund, a replacement and a repair kit.`,
      action:
        next &&
        (onNext ? (
          <span className={styles.guideHint}>Press Approve campaign above.</span>
        ) : (
          <Link className={styles.guideLink} href={`/dashboard?campaign=${next.recallNumber}`}>
            Next: {next.label}
          </Link>
        )),
    },
    {
      title: "Open the buyer page",
      text: "Now you are the customer: Morgan Demo, the one buyer who can sign in. The other buyers are fictional.",
      action: guide.buyerPath && (
        <a className={styles.guideLink} href={guide.buyerPath} target="_blank" rel="noopener noreferrer">
          Open buyer page <Icon name="ext" />
        </a>
      ),
    },
    {
      title: "Confirm with PayPal",
      text: "Sign in with the sandbox buyer account from the README. PayPal sends the money.",
      action: null,
    },
    {
      title: "Watch it settle",
      text: "PayPal confirms by webhook, about a minute later. Refresh to see Settled.",
      action: guide.paid && !guide.settled && (
        <Link className={styles.guideLink} href={`/dashboard?campaign=${current}`}>
          Refresh
        </Link>
      ),
    },
  ];

  return (
    <section className={styles.guide} aria-label="Try the demo">
      <p className={styles.guideTitle}>
        Try the demo <span>about 2 minutes</span>
      </p>
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={done[i] ? styles.guideDone : i === active ? styles.guideNow : undefined}
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
