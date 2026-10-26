"use client";

import { useState } from "react";
import { ConfirmLink } from "@/components/ConfirmLink";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import Link from "next/link";
import {
  artFor,
  cpscLabel,
  formatDate,
  groupAmount,
  howPaid,
  isClaimable,
  isDone,
  loginHref,
  remedyCopy,
  type RecallGroup,
  type RemedyKind,
} from "./data";
import { formatUsd } from "@/lib/policy";
import { Art } from "./parts";
import styles from "./SeveralFlow.module.css";

// Several recalls at once: three cards side by side on laptop, one at a time below 980px.
// A recall the buyer has several orders of is ONE card with one choice. A recall that offers only
// one remedy is already chosen: there is nothing to pick, only to confirm. One PayPal sign-in
// settles every recall that is ready.
export function SeveralFlow({
  token,
  store: STORE,
  groups: GROUPS,
}: {
  token: string;
  store: string;
  groups: RecallGroup[];
}) {
  const TOTAL = GROUPS.length;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<(RemedyKind | null)[]>(() =>
    GROUPS.map((g) => (g.cases[0].offers.length === 1 ? g.cases[0].offers[0] : null)),
  );

  function go(next: number) {
    setIndex(next);
    window.scrollTo(0, 0);
  }

  function pick(k: number, kind: RemedyKind) {
    setPicked((prev) => prev.map((p, i) => (i === k ? kind : p)));
  }

  // Recalls still waiting for a choice, and the picks that are ready (one per open order).
  const openGroups = GROUPS.filter((g) => g.cases.some(isClaimable));
  const ready = GROUPS.flatMap((g, i) => {
    const remedy = picked[i];
    return remedy
      ? g.cases.filter(isClaimable).map((c) => ({ caseId: c.caseId, remedy }))
      : [];
  });
  const readyGroups = GROUPS.filter((_, i) => picked[i] && GROUPS[i].cases.some(isClaimable));
  const refundCents = ready
    .filter((p) => p.remedy === "refund")
    .reduce(
      (sum, p) =>
        sum + (GROUPS.flatMap((g) => g.cases).find((c) => c.caseId === p.caseId)?.priceCents ?? 0),
      0,
    );
  const totalLabel = refundCents > 0 ? `${formatUsd(refundCents)} back` : "No cost to you";

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
              <b>Please stop using these items.</b>{" "}
              {TOTAL === 1
                ? "Confirm below to settle it."
                : "Where the recall offers a choice, pick one. Then confirm everything with one PayPal sign-in."}
            </p>
          </div>
          <div className={styles.blob} aria-hidden="true">
            {GROUPS.map((g) => (
              <Art
                key={g.recallNumber}
                kind={artFor(g.cases[0].sku)}
                alt={`Line drawing of ${g.cases[0].productName}`}
              />
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
            {GROUPS.map((g, k) => (
              <li key={g.recallNumber} className={k <= index ? styles.on : undefined} />
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
            {GROUPS.map((g, k) => {
              const recall = g.cases[0];
              const choice = picked[k];
              const open = g.cases.filter(isClaimable);
              const doneCases = g.cases.filter(isDone);
              const claimable = open.length > 0;
              const allDone = doneCases.length === g.cases.length;
              const single = recall.offers.length === 1;
              return (
                <article
                  key={g.recallNumber}
                  className={`${styles.rc} ${k === index ? styles.current : ""}`}
                  aria-labelledby={`recall-${k}`}
                >
                  <div className={styles.r1}>
                    <span className={styles.thumb}>
                      <Art kind={artFor(recall.sku)} alt={`Line drawing of ${recall.productName}`} />
                    </span>
                    <span className={styles.stat}>
                      <Icon name={claimable ? "info" : allDone ? "check" : "pause"} />
                      {claimable
                        ? open.some((c) => c.status === "FAILED")
                          ? "Try again"
                          : single
                            ? "Ready to confirm"
                            : "Needs your choice"
                        : allDone
                          ? "Done"
                          : "Couldn't complete"}
                    </span>
                  </div>

                  <div className={styles.r2}>
                    <p className={styles.meta}>
                      <span className={styles.badge}>{cpscLabel(recall)}</span>
                      <span>Recalled {formatDate(recall.recallDate)}</span>
                    </p>
                    <h2 id={`recall-${k}`}>{recall.productName}</h2>
                    <ul className={styles.orders}>
                      {g.cases.map((c) => (
                        <li key={c.caseId}>
                          Bought {c.daysAgo} days ago &middot; {formatUsd(c.priceCents)}
                          {claimable && choice && isClaimable(c) && howPaid(c, choice) && (
                            <span> &middot; {howPaid(c, choice)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
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

                  {claimable && single && (
                    <div className={styles.opts}>
                      <div className={`${styles.copt} ${styles.fixedOpt}`}>
                        <span className={styles.rad}>
                          <Icon name="check" />
                        </span>
                        <span>
                          <b>{remedyCopy(recall.offers[0]).short}</b>
                          <span className="sr-only">. {remedyCopy(recall.offers[0]).detail}</span>
                        </span>
                        <span className={styles.a}>{groupAmount(open, recall.offers[0])}</span>
                      </div>
                    </div>
                  )}
                  {claimable && !single && (
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
                          <span className={styles.a}>{groupAmount(open, kind)}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  <div className={styles.r5}>
                    <p className={styles.ruleline}>
                      <Tag kind="rule" />
                      <span>
                        <b>Chosen by fixed rules, not AI</b>
                        {single ? "The recall offers only this remedy" : "These options are offered by the recall"}
                      </span>
                    </p>
                  </div>

                  <div className={styles.mine}>
                    <span className={styles.mineLab}>Your remedy</span>
                    <span className={styles.mineAmt}>
                      {/* Money remedies show the amount; the others name the remedy, since "Free" is already on the option above. */}
                      {!claimable
                        ? recall.choice
                          ? recall.choice === "refund"
                            ? groupAmount(doneCases, recall.choice)
                            : remedyCopy(recall.choice).short
                          : "None"
                        : choice
                          ? choice === "refund"
                            ? groupAmount(open, choice)
                            : remedyCopy(choice).short
                          : "Choose one"}
                    </span>
                    {doneCases.length > 0 && (
                      <Link
                        className={styles.mineLink}
                        href={`/r/${token}?done=${doneCases.map((c) => c.caseId).join(",")}`}
                      >
                        View your receipt
                      </Link>
                    )}
                    {!claimable && !allDone && (
                      <Link
                        className={styles.mineLink}
                        href={`/r/${token}?case=${g.cases.find((c) => !isDone(c))?.caseId}`}
                      >
                        See what happened
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {openGroups.length > 0 ? (
            <div className={`${styles.buy} ${styles.bar}`}>
              <div className={styles.buyMeta}>
                <span className={styles.lab}>
                  {readyGroups.length === 0
                    ? "Choose a remedy for each recall you want to settle"
                    : readyGroups.length === openGroups.length
                      ? openGroups.length === 1
                        ? "Your recall is ready to confirm"
                        : `All ${openGroups.length} recalls ready`
                      : `${readyGroups.length} of ${openGroups.length} recalls ready`}
                </span>
                <span className={styles.amt}>{readyGroups.length === 0 ? "Choose one" : totalLabel}</span>
              </div>
              <div className={styles.act}>
                {ready.length > 0 ? (
                  // Plain anchor: the login route redirects off-site, so no client navigation or prefetch.
                  <ConfirmLink className={styles.btn} href={loginHref(token, ready)}>
                    {readyGroups.length > 1 ? `Confirm all ${readyGroups.length} with PayPal` : "Confirm with PayPal"}
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
