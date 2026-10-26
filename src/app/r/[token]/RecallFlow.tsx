"use client";

import { ConfirmLink } from "@/components/ConfirmLink";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import type { BuyerCase } from "@/lib/buyer";
import {
  artFor,
  cpscLabel,
  formatDate,
  groupAmount,
  headline,
  howPaid,
  loginHref,
  pronounFor,
  remedyCopy,
} from "./data";
import styles from "./page.module.css";
import { Art, Blob, Reassure, RuleLine, SectionTitle, TopBand } from "./parts";
import { formatUsd } from "@/lib/policy";

// The notice for one recall, which may cover several of the buyer's orders of the same product.
// The recall offers a single remedy, so there is nothing to choose: one button settles it all.
// The several-recalls view lives in SeveralFlow.
export function RecallFlow({
  token,
  store,
  recalls,
}: {
  token: string;
  store: string;
  recalls: BuyerCase[]; // every order for this recall, all still open
}) {
  const recall = recalls[0];
  const kind = recall.offers[0];
  const remedy = remedyCopy(kind);
  const pronoun = pronounFor(recall.productName);
  const amount = groupAmount(recalls, kind);
  const several = recalls.length > 1;

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
            {several ? `in ${recalls.length} orders` : `${recall.daysAgo} days ago`}. Here is what the
            recall says and how to settle {several ? "them" : "it"} in one tap.
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
                {several ? "Your orders" : "Your order"}
              </SectionTitle>
              <ul className={styles.orders}>
                {recalls.map((c) => (
                  <li key={c.caseId}>
                    <span>
                      <b>{c.productName}</b> · bought {c.daysAgo} days ago · {formatUsd(c.priceCents)}
                    </span>
                    {howPaid(c, kind) && <span className={styles.how}>{howPaid(c, kind)}</span>}
                  </li>
                ))}
              </ul>
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
                <span className={styles.amt}>{amount}</span>
              </div>
              <RuleLine>{remedy.rule}</RuleLine>
              <Reassure className={styles.reassureMobile} />
            </section>

          <aside className={`${styles.sum} ${styles.fixable} ${styles.inCard}`} aria-label="Summary">
            <div className={styles.sumMeta}>
              <span className={styles.lab}>Your remedy</span>
              <span className={styles.amt}>{kind === "refund" ? amount : "No cost"}</span>
              <p className={styles.nm}>{remedy.name}</p>
              <p className={styles.od}>
                {recall.productName} ·{" "}
                {several ? `${recalls.length} orders from ${store}` : `bought from ${store} ${recall.daysAgo} days ago`}
              </p>
            </div>
            <div className={styles.sumAct}>
              {/* Plain anchor: the login route redirects off-site, so no client navigation or prefetch. */}
              <ConfirmLink className={styles.btn} href={loginHref(
                  token,
                  recalls.map((c) => ({ caseId: c.caseId, remedy: kind })),
                )}>
                Confirm with PayPal
              </ConfirmLink>
              <Reassure className={styles.reassureDesktop} />
            </div>
          </aside>
          </div>
        </div>
      </div>
    </>
  );
}
