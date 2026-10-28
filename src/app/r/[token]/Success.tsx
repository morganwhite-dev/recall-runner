import Link from "next/link";
import type { BuyerCase } from "@/lib/buyer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/Icon";
import { formatUsd } from "@/lib/policy";
import { ConfirmStatus } from "./ConfirmStatus";
import { pronounFor, remedyCopy } from "./data";
import styles from "./page.module.css";
import { Blob, RuleLine, SectionTitle, SuccessSeal, TopBand } from "./parts";

// What the buyer reads once their choice has been carried out. The wording depends on what
// actually happened (refund, payout past the 180-day window, replacement or repair kit).
function outcome(c: BuyerCase) {
  const money = formatUsd(c.amountCents ?? c.priceCents);
  switch (c.status) {
    case "PAYOUT_SENT":
      return {
        label: "Payment sent",
        big: money,
        title: "Your payment is on its way",
        lede: "This order is too old for a PayPal refund, so the store paid you directly.",
        next: `sent ${money} to the PayPal account you signed in with, using PayPal Payouts.`,
        timing:
          "Payouts usually arrive within minutes. Look for it in your PayPal activity.",
        kind: "refund" as const,
      };
    case "REPLACEMENT_SHIPPED":
      return {
        label: "Replacement on its way",
        big: null,
        title: "Your replacement is on its way",
        lede: "Tracking was added to your original PayPal order.",
        next: "is shipping you a replacement at no cost.",
        timing: "You don't need to do anything else.",
        kind: "replace" as const,
      };
    case "REPAIR_KIT_REQUESTED":
      return {
        label: "Repair kit requested",
        big: null,
        title: "Your repair kit is on its way",
        lede: "We recorded your request. The kit is free.",
        next: "recorded your free repair kit request.",
        timing: "You don't need to do anything else.",
        kind: "repair" as const,
      };
    default:
      return {
        label: "Refund sent",
        big: money,
        title: "Your refund is on its way",
        lede: "The store sent your money back to PayPal.",
        next: `sent ${money} back to the PayPal account you signed in with.`,
        timing: "PayPal refunds usually show in 3 to 5 business days.",
        kind: "refund" as const,
      };
  }
}

export function Success({
  token,
  store,
  c,
  others,
}: {
  token: string;
  store: string;
  c: BuyerCase;
  others: boolean; // does this buyer have other recalls to go back to?
}) {
  const o = outcome(c);
  const remedy = remedyCopy(o.kind);
  const pronoun = pronounFor(c.productName);
  // Only refunds and payouts get a confirmation from PayPal (its webhook).
  const money = c.status === "REFUNDED" || c.status === "PAYOUT_SENT";
  const settledAll = !money || c.settled;
  return (
    <>
      <AutoRefresh active={!settledAll} everyMs={3000} />
      <TopBand store={store}>
        <div>
          <ConfirmStatus
            label={o.label}
            state={!money ? "none" : c.settled ? "confirmed" : "waiting"}
          />
          {o.big && <p className={styles.big}>{o.big}</p>}
          <h1 className={`${styles.h1} ${styles.h1Success}`}>{o.title}</h1>
          <p className={styles.lede}>
            <b>{o.lede}</b> You don&apos;t need to do anything else.
          </p>
        </div>
        <Blob>
          <SuccessSeal />
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
                    {store} {o.next}
                  </span>
                </li>
                <li>
                  <span className={styles.ico}>
                    <Icon name="clock" />
                  </span>
                  <span>{o.timing}</span>
                </li>
                <li>
                  <span className={styles.ico}>
                    <Icon name="pause" />
                  </span>
                  <span>
                    Please stop using {pronoun === "them" ? "them" : "it"}.
                  </span>
                </li>
              </ul>
              <RuleLine>{c.rationale ?? remedy.rule}</RuleLine>
            </section>
            <section>
              <Link className={styles.link} href="/dashboard">
                <Icon name="ext" />
                See this on the store&apos;s dashboard
              </Link>
            </section>
            {others && (
              <section>
                <Link className={styles.link} href={`/r/${token}`}>
                  <Icon name="left" />
                  Back to your recalls
                </Link>
              </section>
            )}
          </main>

          <aside
            className={`${styles.sum} ${styles.plain}`}
            aria-labelledby="rh"
          >
            <h2 className={styles.receiptTitle} id="rh">
              Your receipt
            </h2>
            <dl className={styles.rcpt}>
              {c.orderRef && (
                <div>
                  <dt>Order</dt>
                  <dd className={styles.mono}>{c.orderRef}</dd>
                </div>
              )}
              <div>
                <dt>Item</dt>
                <dd>{c.productName}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{o.big ?? "Free"}</dd>
              </div>
              {c.paypalRef && (
                <div>
                  <dt>Reference</dt>
                  <dd className={styles.mono}>{c.paypalRef}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
