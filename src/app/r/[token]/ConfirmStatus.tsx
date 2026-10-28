"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import styles from "./page.module.css";

const SLOW_MS = 90 * 1000; // PayPal usually confirms within a minute

// The chip above the receipt headline. While a refund or payout waits for PayPal's webhook it is
// amber and says so; the page re-reads itself (AutoRefresh) and the chip turns green once PayPal
// confirms. If that takes longer than usual, it says the page will still update.
export function ConfirmStatus({
  label,
  state,
}: {
  label: string; // "All done", "Refund sent"
  state: "waiting" | "confirmed" | "none"; // "none": no money moved, PayPal sends no confirmation
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (state !== "waiting") return;
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const waiting = state === "waiting";
  const text = waiting
    ? slow
      ? "PayPal usually confirms within a minute. This page will update."
      : `${label} · PayPal is confirming…`
    : state === "confirmed"
      ? `${label} · Confirmed by PayPal`
      : label;
  return (
    <span
      className={`${styles.status} ${waiting ? styles.statusPending : ""}`}
      role="status"
    >
      <Icon name={waiting ? "clock" : "done"} />
      {text}
    </span>
  );
}
