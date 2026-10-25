"use client";

import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import type { BuyerCase } from "@/lib/buyer";
import {
  artFor,
  cpscLabel,
  formatDate,
  headline,
  loginHref,
  pronounFor,
  remedyAmount,
  remedyCopy,
} from "./data";
import styles from "./page.module.css";
import { Art, Blob, Reassure, RuleLine, SectionTitle, TopBand } from "./parts";
import { formatUsd } from "@/lib/policy";

// The notice for a single recall. The several-recalls view lives in SeveralFlow.
export function RecallFlow({
  token,
  store,
  recall,
}: {
  token: string;
  store: string;
  recall: BuyerCase;
}) {
  const kind = recall.offers[0];
  const remedy = remedyCopy(kind);
  const pronoun = pronounFor(recall.productName);
  const price = formatUsd(recall.priceCents);

  return (
    <>
      <TopBand store={store}>
        <div>
          <p className={styles.eyebrow}>
            <Icon name="info" />
            Safety recall notice
          </p>
          <p className={styles.meta}>
            <span className={styles.badge}>{cpscLabel(recall)}</span>
            <span>Recalled {formatDate(recall.recallDate)}</span>
          </p>
          <h1 className={styles.h1}>{headline(recall)}</h1>
          <p className={styles.lede}>
            <b>Please stop using {pronoun}.</b> You bought {pronoun} from {store}{" "}
            {recall.daysAgo} days ago. Here is what the recall says and how to settle it in one tap.
          </p>
        </div>
        <Blob>
          <Art kind={artFor(recall.sku)} alt={`Line drawing of ${recall.productName}`} />
        </Blob>
      </TopBand>

      <div className={styles.wrap}>
        <div className={`${styles.layout} ${styles.even}`}>
          <main className={styles.card}>
            <section aria-labelledby="s1">
              <SectionTitle id="s1" icon="info">
                What the recall says
              </SectionTitle>
              <span className={styles.qbar} aria-hidden="true" />
              <blockquote>&ldquo;{recall.hazard}&rdquo;</blockquote>
              <p className={styles.cap}>From the CPSC recall notice, {cpscLabel(recall)}</p>
              <p className={styles.aiNote}>
                <Tag kind={recall.draftedBy === "MODEL" ? "model" : "rule"} />
                <span>
                  {recall.draftedBy === "MODEL"
                    ? "Notice drafted by AI from the CPSC record"
                    : "Notice from a fixed template; the quote is from the CPSC record"}
                </span>
              </p>
            </section>

            <section aria-labelledby="s2">
              <SectionTitle id="s2" icon="pause">
                What to do now
              </SectionTitle>
              <p className={styles.stop}>
                <b>Please stop using {pronoun}</b>
                <span>
                  Keep {pronoun} away from where you sit or sleep until this is settled.
                </span>
              </p>
            </section>

            <section aria-labelledby="s3" className={styles.orderSection}>
              <SectionTitle id="s3" icon="box">
                Your order
              </SectionTitle>
              <p className={styles.order}>
                <b>{recall.productName}</b> · bought from {store} {recall.daysAgo} days ago · {price}
              </p>
            </section>
          </main>

          <div className={`${styles.card} ${styles.rightCard}`}>
            <section aria-labelledby="s4">
              <SectionTitle id="s4" icon="refund">
                How this is settled
              </SectionTitle>
              <div className={styles.fact}>
                <span className={styles.ico}>
                  <Icon name={remedy.icon} />
                </span>
                <div>
                  <b>{remedy.name}</b>
                  <span className={styles.d}>{remedy.detail}</span>
                </div>
                <span className={styles.amt}>{remedyAmount(recall, kind)}</span>
              </div>
              <RuleLine>{remedy.rule}</RuleLine>
              <Reassure className={styles.reassureMobile} />
            </section>

          <aside className={`${styles.sum} ${styles.fixable} ${styles.inCard}`} aria-label="Summary">
            <div className={styles.sumMeta}>
              <span className={styles.lab}>Your remedy</span>
              <span className={styles.amt}>{remedyAmount(recall, kind)}</span>
              <p className={styles.nm}>{remedy.name}</p>
              <p className={styles.od}>
                {recall.productName} · bought from {store} {recall.daysAgo} days ago · {price}
              </p>
            </div>
            <div className={styles.sumAct}>
              {/* Plain anchor: the login route redirects off-site, so no client navigation or prefetch. */}
              <a className={styles.btn} href={loginHref(token, recall.caseId, kind)}>
                Confirm with PayPal
              </a>
              <Reassure className={styles.reassureDesktop} />
            </div>
          </aside>
          </div>
        </div>
      </div>
    </>
  );
}
