import { Icon } from "@/components/Icon";
import { Seal } from "@/components/Seal";
import type { BuyerCase } from "@/lib/buyer";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

// A case the store's rules refused: nothing was sent and it is final. (A case PayPal could not
// complete is offered again instead, see isClaimable.)
export function Problem({ store, c }: { store: string; c: BuyerCase }) {
  return (
    <>
      <TopBand store={store}>
        <div>
          <span className={`${styles.status} ${styles.warn}`}>
            <Icon name="info" />
            Couldn&apos;t complete
          </span>
          <h1 className={`${styles.h1} ${styles.h1Mismatch}`}>
            We couldn&apos;t settle your {c.productName} recall
          </h1>
          <p className={styles.lede}>
            <b>Nothing was sent, and we&apos;re sorry about the hassle.</b> The
            store&apos;s rules didn&apos;t allow this choice.
          </p>
        </div>
        <Blob>
          <Seal kind="info" />
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
                {c.rationale ?? "The request couldn't be completed."}
              </p>
            </section>
            <section aria-labelledby="s2">
              <SectionTitle id="s2" icon="help">
                What you can do
              </SectionTitle>
              <p className={styles.order}>
                Please stop using the {c.productName} and ask {store} about it.
                The store can see exactly why on its dashboard.
              </p>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
