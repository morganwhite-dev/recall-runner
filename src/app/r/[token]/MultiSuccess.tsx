import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BuyerCase } from "@/lib/buyer";
import { formatUsd } from "@/lib/policy";
import { remedyCopy } from "./data";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

// One receipt for several recalls settled in a single PayPal sign-in.
export function MultiSuccess({
  token,
  store,
  cases,
  others,
}: {
  token: string;
  store: string;
  cases: BuyerCase[];
  others: boolean; // are there recalls still waiting for a choice?
}) {
  const moneyCents = cases
    .filter((c) => c.status === "REFUNDED" || c.status === "PAYOUT_SENT")
    .reduce((sum, c) => sum + (c.amountCents ?? c.priceCents), 0);
  const settledAll = cases.every((c) => c.settled || !["REFUNDED", "PAYOUT_SENT"].includes(c.status));

  const line = (c: BuyerCase) => {
    switch (c.status) {
      case "PAYOUT_SENT":
        return `${formatUsd(c.amountCents ?? c.priceCents)} sent by PayPal Payouts`;
      case "REFUNDED":
        return `${formatUsd(c.amountCents ?? c.priceCents)} refunded to your PayPal account`;
      case "REPLACEMENT_SHIPPED":
        return "Free replacement on its way, tracking added to your order";
      default:
        return remedyCopy("repair").detail;
    }
  };

  return (
    <>
      <TopBand store={store}>
        <div>
          <span className={styles.status}>
            <Icon name="check" />
            {settledAll ? "All done. Confirmed by PayPal" : "All done"}
          </span>
          {moneyCents > 0 && <p className={styles.big}>{formatUsd(moneyCents)}</p>}
          <h1 className={`${styles.h1} ${styles.h1Success}`}>
            {cases.length} recalls settled with one sign-in
          </h1>
          <p className={styles.lede}>
            <b>You only had to sign in with PayPal once.</b> You don&apos;t need to do anything
            else for these.
          </p>
        </div>
        <Blob>
          <Icon name="check" />
        </Blob>
      </TopBand>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <main className={styles.card}>
            <section aria-labelledby="s1">
              <SectionTitle id="s1" icon="clock">
                What happens next
              </SectionTitle>
              <ul className={styles.nextList}>
                {cases.map((c) => (
                  <li key={c.caseId}>
                    <span className={styles.ico}>
                      <Icon name="check" />
                    </span>
                    <span>
                      <b>{c.productName}:</b> {line(c)}
                    </span>
                  </li>
                ))}
                <li>
                  <span className={styles.ico}>
                    <Icon name="pause" />
                  </span>
                  <span>Please stop using the recalled items.</span>
                </li>
              </ul>
            </section>
            {others && (
              <section>
                <Link className={styles.link} href={`/r/${token}`}>
                  <Icon name="left" />
                  Back to your other recalls
                </Link>
              </section>
            )}
          </main>

          <aside className={`${styles.sum} ${styles.plain}`} aria-labelledby="rh">
            <h2 className={styles.receiptTitle} id="rh">
              Your receipt
            </h2>
            <dl className={styles.rcpt}>
              {cases.map((c) => (
                <div key={c.caseId}>
                  <dt>{c.productName}</dt>
                  <dd>
                    {c.amountCents && (c.status === "REFUNDED" || c.status === "PAYOUT_SENT")
                      ? formatUsd(c.amountCents)
                      : "Free"}
                    {c.paypalRef && <span className={styles.mono}> · {c.paypalRef}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
