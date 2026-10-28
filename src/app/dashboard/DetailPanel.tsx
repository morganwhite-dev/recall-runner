"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { amountLabel, remedyLabel, type BuyerCase } from "./data";
import panel from "./panel.module.css";
import { StatusBadge } from "./StatusBadge";
import styles from "./page.module.css";

function Timeline({ c }: { c: BuyerCase }) {
  const research = c.timeline.filter((s) => s.research);
  const steps = c.timeline.filter((s) => !s.research);
  return (
    <>
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
function Message({ c }: { c: BuyerCase }) {
  return (
    <>
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
    </>
  );
}

const TABS = [
  { id: "why", label: "Why this happened" },
  { id: "msg", label: "Message" },
] as const;

// The selected case: who it is, why it happened, the message they got, and one button.
export function DetailPanel({ selected }: { selected: BuyerCase }) {
  const [tab, setTab] = useState<"why" | "msg">("why");
  return (
    <aside className={panel.panel} aria-label="Case detail">
      <div className={panel.head}>
        <span className={panel.avatarBig} aria-hidden="true">
          {selected.initials}
        </span>
        <div>
          <h2>{selected.name}</h2>
          <p className={panel.headSub}>
            {selected.path} · {amountLabel(selected)} ·{" "}
            <StatusBadge status={selected.status} />
          </p>
        </div>
      </div>
      <div className={panel.tabs} role="tablist" aria-label="Case detail views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`detail-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="detail-body"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <i className={panel.slider} data-tab={tab} aria-hidden="true" />
      </div>
      <div
        className={panel.body}
        id="detail-body"
        role="tabpanel"
        aria-labelledby={`detail-tab-${tab}`}
        key={`${selected.id}-${tab}`}
      >
        {tab === "why" ? <Timeline c={selected} /> : <Message c={selected} />}
      </div>
      {selected.buyerPath && (
        <div className={panel.cta}>
          <Link
            className={selected.canSignIn ? panel.ctaYou : panel.ctaOther}
            href={selected.buyerPath}
          >
            {selected.canSignIn
              ? "Open buyer page"
              : "Preview (fictional buyer)"}{" "}
            <Icon name="ext" />
          </Link>
        </div>
      )}
    </aside>
  );
}
