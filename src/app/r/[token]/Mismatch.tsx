import { Icon } from "@/components/Icon";
import { HELP_HREF, PAYPAL_LOGIN_HREF, STORE } from "./data";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

export function Mismatch() {
  return (
    <>
      <TopBand>
        <div>
          <span className={`${styles.status} ${styles.warn}`}>
            <Icon name="info" />
            Account doesn&apos;t match
          </span>
          <h1 className={`${styles.h1} ${styles.h1Mismatch}`}>
            This PayPal account doesn&apos;t match the one used for this order
          </h1>
          <p className={styles.lede}>
            <b>Nothing was charged and nothing was sent.</b> Your recall is still waiting for you.
          </p>
        </div>
        <Blob>
          <Icon name="info" />
        </Blob>
      </TopBand>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <main className={styles.card}>
            <section aria-labelledby="s1">
              <SectionTitle id="s1" icon="info">
                Why this happened
              </SectionTitle>
              <p className={styles.order}>
                We check the PayPal account so only the person who bought the item can claim. The
                account you signed in with is not the one on the order.
              </p>
            </section>
            <section aria-labelledby="s2">
              <SectionTitle id="s2" icon="help">
                What you can do
              </SectionTitle>
              <p className={styles.order}>
                Sign in again with the PayPal account you used when you bought from {STORE}. If you
                are not sure which one that is, we can help.
              </p>
            </section>
          </main>

          <aside className={`${styles.sum} ${styles.fixable} ${styles.stack}`} aria-label="Next step">
            <div className={styles.sumMeta}>
              <span className={styles.lab}>Next step</span>
              <p className={styles.nm}>Try again with the right account</p>
            </div>
            <div className={styles.sumAct}>
              <a className={styles.btn} href={PAYPAL_LOGIN_HREF}>
                Try a different PayPal account
              </a>
              <p className={styles.helpRow}>
                <a className={styles.link} href={HELP_HREF}>
                  <Icon name="help" />
                  Need help?
                </a>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
