import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RECEIPT, REMEDIES, SETTLED, STORE } from "./data";
import styles from "./page.module.css";
import { Blob, RuleLine, SectionTitle, TopBand } from "./parts";

export function Success({ token }: { token: string }) {
  const r = SETTLED;
  return (
    <>
      <TopBand>
        <div>
          <span className={styles.status}>
            <Icon name="check" />
            Refund sent
          </span>
          <p className={styles.big}>{r.price}</p>
          <h1 className={`${styles.h1} ${styles.h1Success}`}>Your refund is on its way</h1>
          <p className={styles.lede}>
            <b>PayPal refunds usually show in 3 to 5 business days.</b> You don&apos;t need to do
            anything else.
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
                <li>
                  <span className={styles.ico}>
                    <Icon name="check" />
                  </span>
                  <span>
                    {STORE} sent {r.price} to the PayPal account you signed in with.
                  </span>
                </li>
                <li>
                  <span className={styles.ico}>
                    <Icon name="clock" />
                  </span>
                  <span>PayPal refunds usually show in 3 to 5 business days.</span>
                </li>
                <li>
                  <span className={styles.ico}>
                    <Icon name="pause" />
                  </span>
                  <span>Please stop using the hand warmers.</span>
                </li>
              </ul>
              <RuleLine>{REMEDIES.refund.rule}</RuleLine>
            </section>
            <section>
              <Link className={styles.link} href={`/r/${token}?view=several`}>
                <Icon name="left" />
                Back to your recalls
              </Link>
            </section>
          </main>

          <aside className={`${styles.sum} ${styles.plain}`} aria-labelledby="rh">
            <h2 className={styles.receiptTitle} id="rh">
              Your receipt
            </h2>
            <dl className={styles.rcpt}>
              <div>
                <dt>Order</dt>
                <dd>{RECEIPT.order}</dd>
              </div>
              <div>
                <dt>Item</dt>
                <dd>{r.item}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{r.price}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd className={styles.mono}>{RECEIPT.reference}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
