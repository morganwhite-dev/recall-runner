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

// Lavender top field: store bar plus the hero grid (copy left, blob right).
export function TopBand({ store, children }: { store: string; children: ReactNode }) {
  return (
    <div className={styles.top}>
      <nav aria-label="Store">
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.store}>
            <span className={styles.mark}>
              <Icon name="store" />
            </span>
            {store}
          </div>
          <p>
            <Icon name="info" />
            <span>Safety recall notice</span>
          </p>
        </div>
      </nav>
      <header className={`${styles.wrap} ${styles.hero}`}>{children}</header>
    </div>
  );
}

export function Blob({ children }: { children: ReactNode }) {
  return <div className={styles.blob}>{children}</div>;
}

export function SectionTitle({ id, icon, children }: { id: string; icon: IconName; children: ReactNode }) {
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
      <span>You sign in with PayPal so only you can claim this. We never see your password.</span>
    </p>
  );
}
