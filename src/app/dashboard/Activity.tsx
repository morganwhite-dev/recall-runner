"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, type ActivityEvent } from "./data";
import styles from "./activity.module.css";

// Recent events for the campaign, newest first. Events that were not there on the previous
// refresh flash green once, so a settled payment is easy to spot.
export function Activity({ events }: { events: ActivityEvent[] }) {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set(events.map((e) => e.id));
    const before = seen.current;
    seen.current = ids;
    if (!before) return; // first render: nothing is "new"
    const added = new Set([...ids].filter((id) => !before.has(id)));
    if (added.size === 0) return;
    setFresh(added);
    const timer = setTimeout(() => setFresh(new Set()), 1500);
    return () => clearTimeout(timer);
  }, [events]);

  return (
    <section className={styles.activity} aria-labelledby="activity-title">
      <header>
        <h2 id="activity-title">Activity</h2>
        <p>
          Newest first, from the audit trail and PayPal&apos;s confirmations
        </p>
      </header>
      {events.length === 0 ? (
        <p className={styles.empty}>
          Nothing has happened yet. Approve the campaign to start.
        </p>
      ) : (
        <ol className={styles.list}>
          {events.map((e) => (
            <li
              key={e.id}
              className={fresh.has(e.id) ? styles.isNew : undefined}
            >
              <time dateTime={e.at}>{e.when}</time>
              <span
                className={`${styles.dot} ${styles[e.kind]}`}
                aria-hidden="true"
              />
              <span>{e.text}</span>
              {e.amountCents !== undefined && (
                <span
                  className={
                    e.kind === "settled" ? styles.money : styles.amount
                  }
                >
                  {formatMoney(e.amountCents)}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
