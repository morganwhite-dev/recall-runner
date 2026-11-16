import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import { ART_PATHS, type ArtKind } from "@/components/ProductArt";
import styles from "./page.module.css";

export function Art({ kind, alt }: { kind: ArtKind; alt: string }) {
  return (
    <svg className={styles.art} viewBox="0 0 96 96" role="img" aria-label={alt}>
      {ART_PATHS[kind]}
    </svg>
  );
}

// The store bar: one dark row on every buyer view, above any alert.
export function StoreBar({ store }: { store: string }) {
  return (
    <div className={`${styles.top} on-dark`}>
      <nav aria-label="Store">
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.store}>
            <span className={styles.mark}>
              <Icon name="store" />
            </span>
            <span className={styles.storeName}>{store}</span>
          </div>
          <div className={styles.navRight}>
            {/* For anyone trying the demo: the customer view always has a way back to the store. */}
            <Link className={styles.navBack} href="/dashboard">
              Store dashboard
            </Link>
            <p>
              <Icon name="info" />
              <span>Safety recall notice</span>
            </p>
          </div>
        </div>
      </nav>
    </div>
  );
}

// The headline block under the store bar.
export function TopBand({ children }: { children: ReactNode }) {
  return (
    <header className={`${styles.wrap} ${styles.hero}`}>{children}</header>
  );
}

// A state word with its mark, never colour alone: the receipt states and the calm "something is off" ones.
export function StateMark({
  icon,
  children,
}: {
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.status} ${styles.warn}`}>
      <Icon name={icon} />
      {children}
    </span>
  );
}

// The rubber stamp on a printed receipt. Settled once PayPal has confirmed (or nothing needed
// confirming); otherwise it says it is still waiting.
export function SettledStamp({ settled }: { settled: boolean }) {
  return settled ? (
    <span className={styles.stamp}>
      <Icon name="tick" />
      Settled
    </span>
  ) : (
    <span className={`${styles.stamp} ${styles.stampWait}`}>
      <Icon name="clock" />
      Waiting on PayPal
    </span>
  );
}

// The printed receipt's head: store, what it is, and the day it was printed.
export function ReceiptHead({ store }: { store: string }) {
  // The store is in the US, so the printed day is the US Eastern day, not the server's UTC one.
  const printed = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
  return (
    <div className={styles.rHead}>
      <b>{store}</b>
      <span>Recall settlement</span>
      <span>Printed {printed}</span>
    </div>
  );
}

export function SectionTitle({
  id,
  icon,
  children,
}: {
  id: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <h2 className={styles.sectionTitle} id={id}>
      <span className={styles.ico}>
        <Icon name={icon} />
      </span>
      {children}
    </h2>
  );
}

export function RuleLine({ children }: { children: ReactNode }) {
  return (
    <p className={styles.ruleLine}>
      <Tag kind="rule" />
      <span>
        <b>Chosen by fixed rules, not AI</b>
        {children}
      </span>
    </p>
  );
}

export function Reassure({ className }: { className?: string }) {
  return (
    <p className={`${styles.reassure} ${className ?? ""}`}>
      <Icon name="lock" />
      <span>
        You sign in with PayPal so only you can claim this. We never see your
        password.
      </span>
    </p>
  );
}
