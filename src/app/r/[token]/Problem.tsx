import { Icon } from "@/components/Icon";
import type { BuyerCase } from "@/lib/buyer";
import { HELP_HREF } from "./data";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

// A case that ended without money or a kit moving (the rules said no, or PayPal returned an error).
export function Problem({ store, c }: { store: string; c: BuyerCase }) {
  const failed = c.status === "FAILED";
  return (
    <>
      <TopBand store={store}>
        <div>
          <span className={`${styles.status} ${styles.warn}`}>
            <Icon name="info" />
            Could not complete
          </span>
          <h1 className={`${styles.h1} ${styles.h1Mismatch}`}>
            We couldn&apos;t settle your {c.productName} recall
          </h1>
          <p className={styles.lede}>
            <b>Nothing was sent.</b>{" "}
            {failed
              ? "PayPal returned an error. Please contact the store; we have a record of your request."
              : "The store's rules did not allow this choice."}
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
                What happened
              </SectionTitle>
              <p className={styles.order}>
                {c.rationale ?? "The request could not be completed."}
              </p>
            </section>
            <section aria-labelledby="s2">
              <SectionTitle id="s2" icon="help">
                What you can do
              </SectionTitle>
              <p className={styles.order}>
                Please stop using the {c.productName} and{" "}
                <a className={styles.link} href={HELP_HREF}>
                  contact {store}
                </a>
                . They can look into it.
              </p>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
