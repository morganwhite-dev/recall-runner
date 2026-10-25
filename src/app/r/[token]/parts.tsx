import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Tag } from "@/components/Tag";
import type { ArtKind } from "./data";
import { STORE } from "./data";
import styles from "./page.module.css";

const ART: Record<ArtKind, ReactNode> = {
  warmer: (
    <>
      <rect x="22" y="40" width="52" height="40" rx="12" />
      <rect x="30" y="48" width="36" height="24" rx="7" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M36 30c-3-4 3-6 0-11M48 30c-3-4 3-6 0-11M60 30c-3-4 3-6 0-11" />
    </>
  ),
  battery: (
    <>
      <rect x="14" y="34" width="58" height="36" rx="9" />
      <path d="M72 45h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6" />
      <path d="M46 42l-7 10h9l-7 10" strokeWidth="2" />
      <path d="M30 70v8q0 6 8 6h14" strokeWidth="1.5" />
    </>
  ),
  dresser: (
    <>
      <rect x="20" y="14" width="56" height="64" rx="4" />
      <path d="M20 32h56M20 47h56M20 62h56M48 14v64" strokeWidth="1.5" />
      <path d="M30 23h8M58 23h8M30 40h8M58 40h8M30 55h8M58 55h8M30 70h8M58 70h8" />
      <path d="M26 78v8M70 78v8" />
    </>
  ),
};

export function Art({ kind, alt }: { kind: ArtKind; alt: string }) {
  return (
    <svg className={styles.art} viewBox="0 0 96 96" role="img" aria-label={alt}>
      {ART[kind]}
    </svg>
  );
}

// Lavender top field: store bar plus the hero grid (copy left, blob right).
export function TopBand({ children }: { children: ReactNode }) {
  return (
    <div className={styles.top}>
      <nav aria-label="Store">
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={styles.store}>
            <span className={styles.mark}>
              <Icon name="store" />
            </span>
            {STORE}
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
