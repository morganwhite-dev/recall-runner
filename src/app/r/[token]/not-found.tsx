import Link from "next/link";
import { Icon } from "@/components/Icon";
import styles from "./page.module.css";
import { Blob, SectionTitle, TopBand } from "./parts";

// Shown when a buyer link has no active recalls: the notice hasn't been sent yet, or the demo was reset.
export default function BuyerLinkInactive() {
  return (
    <div className={styles.page}>
      <TopBand store="Brightnest Home">
        <div>
          <span className={`${styles.status} ${styles.warn}`}>
            <Icon name="info" />
            Link not active
          </span>
          <h1 className={`${styles.h1} ${styles.h1Mismatch}`}>This recall link isn&apos;t active right now</h1>
          <p className={styles.lede}>
            <b>Nothing was charged and nothing was sent.</b> The notice may not have been sent yet, or
            it was replaced by a newer one.
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
              <SectionTitle id="s1" icon="help">
                What you can do
              </SectionTitle>
              <p className={styles.order}>
                If a store sent you this link, ask them to send it again. If you&apos;re trying the demo,
                the store may have been reset: start again from the home page, then approve the campaign
                on the dashboard to open the buyer links.
              </p>
            </section>
            <section>
              <Link className={styles.link} href="/">
                <Icon name="left" />
                Back to the home page
              </Link>
            </section>
          </main>
        </div>
      </div>
      <footer>
        <div className={styles.wrap}>
          Demo store. The merchant and order dates are made up; the recalls are real CPSC data. Not
          affiliated with CPSC or PayPal.
        </div>
      </footer>
    </div>
  );
}
