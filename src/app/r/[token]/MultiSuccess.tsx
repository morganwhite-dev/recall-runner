import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/Icon";
import type { BuyerCase } from "@/lib/buyer";
import { formatUsd } from "@/lib/policy";
import { ConfirmStatus } from "./ConfirmStatus";
import { groupByRecall, receiptHeadline, remedyCopy } from "./data";
import styles from "./page.module.css";
import { Blob, SectionTitle, SuccessSeal, TopBand } from "./parts";

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
  const isMoney = (c: BuyerCase) =>
    c.status === "REFUNDED" || c.status === "PAYOUT_SENT";
  const centsOf = (list: BuyerCase[]) =>
    list
      .filter(isMoney)
      .reduce((sum, c) => sum + (c.amountCents ?? c.priceCents), 0);
  const moneyCents = centsOf(cases);
  const settledAll = cases.every((c) => c.settled || !isMoney(c));
  const anyMoney = cases.some(isMoney);
  // Several orders of one recall are one line here, as they were one card when choosing.
  const groups = groupByRecall(cases);
  const { title, covered } = receiptHeadline(cases);

  // One recall's line. Its orders share a remedy, but a refund for a recent order and a payout
  // for one past 180 days can sit side by side.
  const line = (list: BuyerCase[]) => {
    const money = list.filter(isMoney);
    if (money.length > 0) {
      const total = formatUsd(centsOf(money));
      const payouts = money.filter((c) => c.status === "PAYOUT_SENT").length;
      if (payouts === 0) return `${total} refunded to your PayPal account`;
      if (payouts === money.length) return `${total} sent by PayPal Payouts`;
      return `${total} back to your PayPal account, by refund and PayPal Payouts`;
    }
    return list[0].status === "REPLACEMENT_SHIPPED"
      ? list.length > 1
        ? "Free replacements on their way, tracking added to your orders"
        : "Free replacement on its way, tracking added to your order"
      : remedyCopy("repair").detail;
  };
  const ordersNote = (list: BuyerCase[]) =>
    list.length > 1 ? ` · ${list.length} orders` : "";

  return (
    <>
      <AutoRefresh active={!settledAll} everyMs={3000} />
      <TopBand store={store}>
        <div>
          <ConfirmStatus
            label="All done"
            state={!anyMoney ? "none" : settledAll ? "confirmed" : "waiting"}
          />
          {moneyCents > 0 && (
            <p className={styles.big}>{formatUsd(moneyCents)}</p>
          )}
          <h1 className={`${styles.h1} ${styles.h1Success}`}>
            {title}
          </h1>
          <p className={styles.lede}>
            <b>You only had to sign in with PayPal once.</b> You don&apos;t need
            to do anything else for these.{covered && <> {covered}</>}
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
                {groups.map((g) => (
                  <li key={g.recallNumber}>
                    <span className={styles.ico}>
                      <Icon name="check" />
                    </span>
                    <span>
                      <b>{g.cases[0].productName}:</b> {line(g.cases)}
                      {ordersNote(g.cases)}
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
                  Back to your other recalls
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
              {groups.map((g) => {
                const refs = g.cases.flatMap((c) =>
                  c.paypalRef ? [c.paypalRef] : [],
                );
                return (
                  <div key={g.recallNumber}>
                    <dt>
                      {g.cases[0].productName}
                      {ordersNote(g.cases)}
                    </dt>
                    <dd>
                      {g.cases.some(isMoney)
                        ? formatUsd(centsOf(g.cases))
                        : "Free"}
                      {refs.length > 0 && (
                        <span className={styles.mono}> · {refs.join(", ")}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
