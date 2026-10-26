"use client";

import { useState } from "react";
import { ConfirmLink } from "@/components/ConfirmLink";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import Link from "next/link";
import type { BuyerCase } from "@/lib/buyer";
import {
  artFor,
  cpscLabel,
  formatDate,
  isDone,
  loginHref,
  remedyAmount,
  remedyCopy,
  type RemedyKind,
} from "./data";
import { formatUsd } from "@/lib/policy";
import { Art } from "./parts";
import styles from "./SeveralFlow.module.css";

// Several recalls at once: three cards side by side on laptop, one at a time below 980px.
// Each recall keeps its own remedy choice; nothing is pre-selected.
export function SeveralFlow({
  token,
  store: STORE,
  recalls: RECALLS,
}: {
  token: string;
  store: string;
  recalls: BuyerCase[];
}) {
  const TOTAL = RECALLS.length;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<(RemedyKind | null)[]>(() => RECALLS.map(() => null));

  function go(next: number) {
    setIndex(next);
    window.scrollTo(0, 0);
  }

  function pick(k: number, kind: RemedyKind) {
    setPicked((prev) => prev.map((p, i) => (i === k ? kind : p)));
  }

  // The recalls still waiting for a choice, and the ones the buyer has picked a remedy for.
  // One PayPal sign-in settles all the picked ones.
  const open = RECALLS.filter((r) => r.status === "OPEN");
  const ready = RECALLS.flatMap((r, i) => {
    const remedy = picked[i];
    return r.status === "OPEN" && remedy ? [{ caseId: r.caseId, remedy }] : [];
  });
  const refundCents = ready
    .filter((p) => p.remedy === "refund")
    .reduce((sum, p) => sum + (RECALLS.find((r) => r.caseId === p.caseId)?.priceCents ?? 0), 0);
  const totalLabel = refundCents > 0 ? `${formatUsd(refundCents)} back` : "Free";

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <nav aria-label="Store">
          <div className={`${styles.wrap} ${styles.navRow}`}>
            <div className={styles.store}>
              <span className={styles.mark}>
                <Icon name="store" />
              </span>
              {STORE}
            </div>
            <p>
              <Icon name="info" />
              <span>Safety recall notice</span>
            </p>
          </div>
        </nav>
        <header className={`${styles.wrap} ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>
              <Icon name="info" />
              Safety recall notices
            </p>
            <h1 className={styles.h1}>
              {TOTAL === 1 ? "You have a recall" : `You have ${TOTAL} recalls`}
            </h1>
            <p className={styles.lede}>
              <b>Please stop using these items.</b> Each recall is settled on its own. Pick how you
              want to settle each one, then confirm with PayPal.
            </p>
          </div>
          <div className={styles.blob} aria-hidden="true">
            {RECALLS.map((r) => (
              <Art key={r.caseId} kind={artFor(r.sku)} alt={`Line drawing of ${r.productName}`} />
            ))}
          </div>
        </header>
      </div>

      <main className={styles.wrap}>
        <nav className={styles.pager} aria-label="Your recalls">
          <p className={styles.pos} aria-live="polite">
            Recall {index + 1} of {TOTAL}
          </p>
          <ol className={styles.segs} aria-hidden="true">
            {RECALLS.map((r, k) => (
              <li key={r.caseId} className={k <= index ? styles.on : undefined} />
            ))}
          </ol>
          <div className={styles.pg}>
            <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>
              <Icon name="left" />
              Back
            </button>
            <button type="button" disabled={index === TOTAL - 1} onClick={() => go(index + 1)}>
              Next
              <Icon name="right" />
            </button>
          </div>
        </nav>

        <div className={styles.stack}>
          <div className={styles.three}>
            {RECALLS.map((recall, k) => {
              const choice = picked[k];
              const done = isDone(recall);
              const claimable = recall.status === "OPEN";
              return (
                <article
                  key={recall.caseId}
                  className={`${styles.rc} ${k === index ? styles.current : ""}`}
                  aria-labelledby={`recall-${k}`}
                >
                  <div className={styles.r1}>
                    <span className={styles.thumb}>
                      <Art kind={artFor(recall.sku)} alt={`Line drawing of ${recall.productName}`} />
                    </span>
                    <span className={styles.stat}>
                      <Icon name={claimable ? "info" : done ? "check" : "pause"} />
                      {claimable ? "Needs your choice" : done ? "Done" : "Couldn't complete"}
                    </span>
                  </div>

                  <div className={styles.r2}>
                    <p className={styles.meta}>
                      <span className={styles.badge}>{cpscLabel(recall)}</span>
                      <span>Recalled {formatDate(recall.recallDate)}</span>
                    </p>
                    <h2 id={`recall-${k}`}>{recall.productName}</h2>
                    <p className={styles.sub}>
                      Bought {recall.daysAgo} days ago &middot; {formatUsd(recall.priceCents)}
                    </p>
                  </div>

                  <div className={styles.r3}>
                    <blockquote title={recall.hazard}>&ldquo;{recall.hazard}&rdquo;</blockquote>
                    <p className={styles.ai}>
                      <Tag kind={recall.draftedBy === "MODEL" ? "model" : "rule"} />
                      <span>
                        {recall.draftedBy === "MODEL"
                          ? "Notice drafted by AI from the CPSC record"
                          : "Notice from a fixed template; the quote is from the CPSC record"}
                      </span>
                    </p>
                  </div>

                  {claimable && (
                  <fieldset className={styles.opts}>
                    <legend className="sr-only">Choose a remedy for {recall.productName}</legend>
                    {recall.offers.map((kind) => (
                      <label key={kind} className={styles.copt}>
                        <input
                          type="radio"
                          name={`remedy-${k}`}
                          value={kind}
                          checked={choice === kind}
                          onChange={() => pick(k, kind)}
                        />
                        <span className={styles.rad}>
                          <Icon name="check" />
                        </span>
                        <span>
                          <b>{remedyCopy(kind).short}</b>
                          <span className="sr-only">. {remedyCopy(kind).detail}</span>
                        </span>
                        <span className={styles.a}>{remedyAmount(recall, kind)}</span>
                      </label>
                    ))}
                  </fieldset>
                  )}

                  <div className={styles.r5}>
                    <p className={styles.ruleline}>
                      <Tag kind="rule" />
                      <span>
                        <b>Chosen by fixed rules, not AI</b>
                        These options are offered by the recall
                      </span>
                    </p>
                  </div>

                  <div className={styles.mine}>
                    <span className={styles.mineLab}>Your remedy</span>
                    <span className={styles.mineAmt}>
                      {!claimable
                        ? recall.choice
                          ? remedyAmount(recall, recall.choice)
                          : "None"
                        : choice
                          ? remedyAmount(recall, choice)
                          : "Choose one"}
                    </span>
                    {!claimable && (
                      <Link className={styles.mineLink} href={`/r/${token}?case=${recall.caseId}`}>
                        {done ? "View your receipt" : "See what happened"}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {ready.length > 0 || open.length > 0 ? (
            <div className={`${styles.buy} ${styles.bar}`}>
              <div className={styles.buyMeta}>
                <span className={styles.lab}>
                  {ready.length === 0
                    ? "Choose a remedy for each recall you want to settle"
                    : ready.length === open.length
                      ? `All ${open.length} recall${open.length === 1 ? "" : "s"} chosen`
                      : `${ready.length} of ${open.length} chosen`}
                </span>
                <span className={styles.amt}>{ready.length === 0 ? "Choose one" : totalLabel}</span>
              </div>
              <div className={styles.act}>
                {ready.length > 0 ? (
                  // Plain anchor: the login route redirects off-site, so no client navigation or prefetch.
                  <ConfirmLink className={styles.btn} href={loginHref(token, ready)}>
                    {ready.length > 1 ? `Confirm all ${ready.length} with PayPal` : "Confirm with PayPal"}
                  </ConfirmLink>
                ) : (
                  <button type="button" className={styles.btn} disabled>
                    Choose a remedy
                  </button>
                )}
              </div>
            </div>
          ) : null}

          <p className={styles.reassure}>
            <Icon name="lock" />
            <span>You sign in with PayPal so only you can claim this. We never see your password.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
