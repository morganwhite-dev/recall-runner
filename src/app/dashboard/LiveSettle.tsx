"use client";

import { useEffect, useRef, useState } from "react";
import { AutoRefresh } from "./AutoRefresh";
import { formatMoney, type BuyerCase } from "./data";
import styles from "./livesettle.module.css";

const FLASH_MS = 1500;
const TOAST_MS = 10000; // long enough to read, and it has a Dismiss button

function toastText(done: BuyerCase[]): string {
  if (done.length > 1)
    return `PayPal confirmed ${done.length} cases · just now`;
  const c = done[0];
  const first = c.name.split(" ")[0];
  switch (c.path) {
    case "Refund":
      return `PayPal confirmed ${first}'s refund · ${formatMoney(c.amountCents)} · just now`;
    case "PayPal Payout":
      return `PayPal confirmed ${first}'s payout · ${formatMoney(c.amountCents)} · just now`;
    case "Replacement":
      return `Tracking added to ${first}'s PayPal order · just now`;
    default:
      return `${first}'s repair request was recorded · just now`;
  }
}

// Keeps the cases fresh while a payment waits on PayPal, and notices when a case becomes Settled
// between two refreshes: it tells the grid which rows to flash and shows a toast. The timers live
// in refs and are not reset by the next refresh, so a refresh can never leave the toast stuck.
export function LiveSettle({
  cases,
  onSettled,
}: {
  cases: BuyerCase[];
  onSettled: (ids: string[]) => void;
}) {
  const previous = useRef<Map<string, BuyerCase["status"]> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(
    () => () => {
      clearTimeout(flashTimer.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(cases.map((c) => [c.id, c.status]));
    if (!before) return; // first render: nothing has changed yet
    // Any case that was known and not Settled, and now is. (Replacements and repairs go straight
    // to Settled, so this is not limited to cases that were waiting on PayPal.)
    const done = cases.filter((c) => {
      const was = before.get(c.id);
      return c.status === "Settled" && was !== undefined && was !== "Settled";
    });
    if (done.length === 0) return;
    onSettled(done.map((c) => c.id));
    setToast(toastText(done));
    clearTimeout(flashTimer.current);
    clearTimeout(toastTimer.current);
    flashTimer.current = setTimeout(() => onSettled([]), FLASH_MS);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, [cases, onSettled]);

  return (
    <>
      <AutoRefresh active={cases.some((c) => c.awaitingPayPal)} />
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <p className={styles.toast}>
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </p>
        )}
      </div>
    </>
  );
}
