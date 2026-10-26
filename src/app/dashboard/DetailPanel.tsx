import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { amountLabel, remedyLabel, type BuyerCase } from "./data";
import delight from "./delight.module.css";
import { StatusBadge } from "./StatusBadge";
import styles from "./page.module.css";

function CaseHeading({ c, withAmount }: { c: BuyerCase; withAmount: boolean }) {
  return (
    <p className={styles.for}>
      <span className={styles.avatar} aria-hidden="true">
        {c.initials}
      </span>
      {c.name} · {withAmount && <>{amountLabel(c)} · </>}
      <StatusBadge status={c.status} />
    </p>
  );
}

function Timeline({ c }: { c: BuyerCase }) {
  const research = c.timeline.filter((s) => s.research);
  const steps = c.timeline.filter((s) => !s.research);
  return (
    <>
      <h2 className={styles.panelTitle}>Why this happened</h2>
      <CaseHeading c={c} withAmount />
      {research.length > 0 && (
        <details className={styles.more}>
          <summary>
            <Icon name="chev" />
            How the AI found this recall
            <span>{research.length} steps</span>
          </summary>
          <ul className={styles.researchList}>
            {research.map((step, i) => (
              <li key={`${i}-${step.text}`}>
                <Tag kind={step.tag} />
                <p title={step.text}>{step.text}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li
            key={`${i}-${step.tag}-${step.text}`}
            style={{ "--i": i } as CSSProperties}
          >
            <Tag kind={step.tag} />
            <p>{step.text}</p>
            {step.code && <code>{step.code}</code>}
          </li>
        ))}
      </ol>
    </>
  );
}

// The notice exactly as it was stored for this buyer, link included.
export function MessagePreview({ c }: { c: BuyerCase }) {
  return (
    <section className={styles.message} aria-label="Message preview">
      <div className={styles.messageMeta}>
        <h2 className={styles.panelTitle}>Message preview</h2>
        <CaseHeading c={c} withAmount={false} />
        <dl className={styles.dl}>
          <dt>To</dt>
          <dd className={styles.mono}>{c.email}</dd>
          <dt>Sent</dt>
          <dd>{c.sent}</dd>
          <dt>Opened</dt>
          <dd>{c.opened ? "Yes" : "No"}</dd>
          <dt>Remedy</dt>
          <dd>{remedyLabel(c)}</dd>
        </dl>
        {c.buyerPath && (
          <Link className={`${styles.btn} ${delight.lift}`} href={c.buyerPath}>
            Open buyer page <Icon name="ext" />
          </Link>
        )}
      </div>
      <div className={styles.messageBody}>
        <p className={styles.subject}>{c.subject || "No notice yet"}</p>
        <div className={styles.body}>
          {c.body.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <p className={styles.aiNote}>
          <Tag kind={c.draftedBy === "MODEL" ? "model" : "rule"} />
          <span>
            {c.draftedBy === "MODEL"
              ? "Drafted by the AI from the CPSC record; hazard and remedy quoted word for word"
              : "Written from a fixed template; hazard and remedy quoted word for word from the CPSC record"}
          </span>
        </p>
      </div>
    </section>
  );
}

// The timeline for the selected case. The message preview sits under the grid.
export function DetailPanel({ selected }: { selected: BuyerCase }) {
  return (
    <aside className={styles.panel} aria-label="Case detail">
      <Timeline c={selected} />
    </aside>
  );
}
