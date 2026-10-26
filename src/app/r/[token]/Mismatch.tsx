import { Icon } from "@/components/Icon";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

export function Mismatch({ token, store }: { token: string; store: string }) {
  return (
    <>
      <TopBand store={store}>
        <div>
          <span className={`${styles.status} ${styles.warn}`}>
            <Icon name="info" />
            Account doesn&apos;t match
          </span>
          <h1 className={`${styles.h1} ${styles.h1Mismatch}`}>
            Hmm, that PayPal account isn&apos;t the one used for this order
          </h1>
          <p className={styles.lede}>
            <b>No harm done: nothing was charged and nothing was sent.</b> Your
            recall is still waiting for you.
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
                We check the PayPal account so only the person who bought the
                item can claim. The account you signed in with isn&apos;t the
                one on the order.
              </p>
            </section>
            <section aria-labelledby="s2">
              <SectionTitle id="s2" icon="help">
                What you can do
              </SectionTitle>
              <p className={styles.order}>
                Go back to your recalls and press Confirm with PayPal again, then
                sign in with the PayPal account you used when you bought from {store}.
                If you&apos;re trying the demo, use the sandbox buyer login shown on the store
                dashboard.
              </p>
            </section>
          </main>

          <aside
            className={`${styles.sum} ${styles.fixable} ${styles.stack}`}
            aria-label="Next step"
          >
            <div className={styles.sumMeta}>
              <span className={styles.lab}>Next step</span>
              <p className={styles.nm}>Try again with the right account</p>
            </div>
            <div className={styles.sumAct}>
              <a className={styles.btn} href={`/r/${token}`}>
                Back to my recalls
              </a>
              <p className={styles.helpRow}>
                <a className={styles.link} href="/dashboard">
                  <Icon name="help" />
                  Demo: find the sandbox login on the store dashboard
                </a>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
