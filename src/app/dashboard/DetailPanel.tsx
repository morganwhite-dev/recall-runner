import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import {
  buyerPagePath,
  formatMoney,
  HAZARD,
  messageFor,
  timelineFor,
  type BuyerCase,
} from "./data";
import { StatusBadge } from "./StatusBadge";
import styles from "./page.module.css";

function CaseHeading({ c, withAmount }: { c: BuyerCase; withAmount: boolean }) {
  return (
    <p className={styles.for}>
      <span className={styles.avatar} aria-hidden="true">
        {c.initials}
      </span>
      {c.name} · {withAmount && <>{formatMoney(c.amountCents)} · </>}
      <StatusBadge status={c.status} />
    </p>
  );
}

function Timeline({ c }: { c: BuyerCase }) {
  return (
    <>
      <h2 className={styles.panelTitle}>Why this happened</h2>
      <CaseHeading c={c} withAmount />
      <ol className={styles.steps}>
        {timelineFor(c).map((step) => (
          <li key={`${step.tag}-${step.text}`}>
            <Tag kind={step.tag} />
            <p>{step.text}</p>
            {step.code && <code>{step.code}</code>}
          </li>
        ))}
      </ol>
    </>
  );
}

export function MessagePreview({ c }: { c: BuyerCase }) {
  const m = messageFor(c);
  return (
    <section className={styles.message} aria-label="Message preview">
      <div className={styles.messageMeta}>
        <h2 className={styles.panelTitle}>Message preview</h2>
        <CaseHeading c={c} withAmount={false} />
        <dl className={styles.dl}>
          <dt>To</dt>
          <dd className={styles.mono}>{m.to}</dd>
          <dt>Sent</dt>
          <dd>{m.sent}</dd>
          <dt>Opened</dt>
          <dd>{m.opened}</dd>
          <dt>Remedy</dt>
          <dd>{m.remedy}</dd>
        </dl>
        <Link className={styles.btn} href={buyerPagePath(c)}>
          Open buyer page <Icon name="ext" />
        </Link>
      </div>
      <div className={styles.messageBody}>
        <p className={styles.subject}>{m.subject}</p>
        <div className={styles.body}>
          <p>{m.greeting}</p>
          <p>
            <q>“{HAZARD}”</q>
          </p>
          <p>
            {m.promise}
            <span className={`${styles.mono} ${styles.small}`}>{m.link}</span>
          </p>
        </div>
        <p className={styles.aiNote}>
          <Tag kind="model" />
          <span>
            Drafted by the AI from the CPSC record; hazard and remedy quoted
            word for word
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
