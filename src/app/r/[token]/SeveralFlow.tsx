"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { PAYPAL_LOGIN_HREF, RECALLS, REMEDIES, remedyAmount, STORE, type RemedyKind } from "./data";
import { Art } from "./parts";
import styles from "./SeveralFlow.module.css";

const TOTAL = RECALLS.length;

// Several recalls at once: three cards side by side on laptop, one at a time below 980px.
// Each recall keeps its own remedy choice; nothing is pre-selected.
export function SeveralFlow() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<(RemedyKind | null)[]>(() => RECALLS.map(() => null));

  function go(next: number) {
    setIndex(next);
    window.scrollTo(0, 0);
  }

  function pick(k: number, kind: RemedyKind) {
    setPicked((prev) => prev.map((p, i) => (i === k ? kind : p)));
  }

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
            <h1 className={styles.h1}>You have {TOTAL} recalls</h1>
            <p className={styles.lede}>
              <b>Please stop using these items.</b> Each recall is settled on its own. Pick how you
              want to settle each one, then confirm with PayPal.
            </p>
          </div>
          <div className={styles.blob} aria-hidden="true">
            {RECALLS.map((r) => (
              <Art key={r.cpsc} kind={r.art} alt={r.artAlt} />
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
              <li key={r.cpsc} className={k <= index ? styles.on : undefined} />
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
              return (
                <article
                  key={recall.cpsc}
                  className={`${styles.rc} ${k === index ? styles.current : ""}`}
                  aria-labelledby={`recall-${k}`}
                >
                  <div className={styles.r1}>
                    <span className={styles.thumb}>
                      <Art kind={recall.art} alt={recall.artAlt} />
                    </span>
                    <span className={styles.stat}>
                      <Icon name="info" />
                      Needs your choice
                    </span>
                  </div>

                  <div className={styles.r2}>
                    <p className={styles.meta}>
                      <span className={styles.badge}>{recall.cpsc}</span>
                      <span>Recalled {recall.date}</span>
                    </p>
                    <h2 id={`recall-${k}`}>{recall.name}</h2>
                    <p className={styles.sub}>
                      Bought {recall.daysAgo} days ago &middot; {recall.price}
                    </p>
                  </div>

                  <div className={styles.r3}>
                    <blockquote title={recall.hazard}>&ldquo;{recall.hazard}&rdquo;</blockquote>
                    <p className={styles.ai}>
                      <Tag kind="model" />
                      <span>Notice drafted by AI from the CPSC record</span>
                    </p>
                  </div>

                  <fieldset className={styles.opts}>
                    <legend className="sr-only">Choose a remedy for {recall.name}</legend>
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
                          <b>{REMEDIES[kind].short}</b>
                          <span className="sr-only">. {REMEDIES[kind].detail}</span>
                        </span>
                        <span className={styles.a}>{remedyAmount(recall, kind)}</span>
                      </label>
                    ))}
                  </fieldset>

                  <div className={styles.r5}>
                    <p className={styles.ruleline}>
                      <Tag kind="rule" />
                      <span>
                        <b>Chosen by fixed rules, not AI</b>
                        These options are offered by the recall
                      </span>
                    </p>
                  </div>

                  <div className={styles.buy}>
                    <div className={styles.buyMeta}>
                      <span className={styles.lab}>Your remedy</span>
                      <span className={styles.amt}>
                        {choice ? remedyAmount(recall, choice) : "Choose one"}
                      </span>
                    </div>
                    <div className={styles.act}>
                      {choice ? (
                        // Plain anchor: the login route redirects off-site, so no client navigation or prefetch.
                        // TODO: pass this recall's token once the login route accepts one.
                        <a className={styles.btn} href={PAYPAL_LOGIN_HREF}>
                          Confirm with PayPal
                        </a>
                      ) : (
                        <button type="button" className={styles.btn} disabled>
                          Choose a remedy
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <p className={styles.reassure}>
            <Icon name="lock" />
            <span>You sign in with PayPal so only you can claim this. We never see your password.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
