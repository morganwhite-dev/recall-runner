"use client";

import { useEffect, useRef, useState } from "react";
import { AutoRefresh } from "./AutoRefresh";
import { formatMoney, type BuyerCase } from "./data";
import styles from "./livesettle.module.css";

// Keeps the cases fresh while a payment waits on PayPal, and notices when one flips to Settled
// between two refreshes: it tells the grid which rows to flash and shows a toast.
export function LiveSettle({
  cases,
  onSettled,
}: {
  cases: BuyerCase[];
  onSettled: (ids: string[]) => void;
}) {
  const previous = useRef<Map<string, BuyerCase["status"]> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(cases.map((c) => [c.id, c.status]));
    if (!before) return; // first render: nothing has changed yet
    const done = cases.filter(
      (c) => c.status === "Settled" && before.get(c.id) === "Waiting on PayPal",
    );
    if (done.length === 0) return;
    onSettled(done.map((c) => c.id));
    const first = done[0];
    const what = first.path === "Refund" ? "refund" : "payout";
    setToast(
      done.length === 1
        ? `PayPal confirmed ${first.name.split(" ")[0]}'s ${what} · ${formatMoney(first.amountCents)} · just now`
        : `PayPal confirmed ${done.length} payments · just now`,
    );
    const clear = setTimeout(() => {
      onSettled([]);
      setToast(null);
    }, 4000);
    return () => clearTimeout(clear);
  }, [cases, onSettled]);

  return (
    <>
      <AutoRefresh active={cases.some((c) => c.awaitingPayPal)} />
      <div className={styles.region} role="status" aria-live="polite">
        {toast && <p className={styles.toast}>{toast}</p>}
      </div>
    </>
  );
}
