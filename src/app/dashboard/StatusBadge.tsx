import { Icon, type IconName } from "@/components/Icon";
import type { CaseStatus } from "./data";
import styles from "./page.module.css";

const STATUS: Record<CaseStatus, { icon: IconName; className: string }> = {
  Settled: { icon: "check", className: "pill" },
  Notified: { icon: "bell", className: styles.notified },
  Waiting: { icon: "clock", className: styles.waiting },
};

// Status is always an icon plus a word: solid for settled, outline for notified, dashed for waiting.
export function StatusBadge({ status }: { status: CaseStatus }) {
  const { icon, className } = STATUS[status];
  return (
    <span className={`${styles.status} ${className}`}>
      <Icon name={icon} />
      {status}
    </span>
  );
}
