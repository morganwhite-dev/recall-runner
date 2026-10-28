import { Icon, type IconName } from "@/components/Icon";
import type { CaseStatus } from "./data";
import delight from "./delight.module.css";
import styles from "./page.module.css";

const STATUS: Record<CaseStatus, { icon: IconName; className: string }> = {
  Settled: { icon: "check", className: `pill ${delight.settled}` },
  Sent: { icon: "bell", className: styles.sent },
  Opened: { icon: "check", className: styles.opened },
  "Waiting on PayPal": { icon: "clock", className: styles.waiting },
  Problem: { icon: "alert", className: styles.problem },
};

// Status is always an icon plus a word: solid for settled, outline for sent, blue for opened, dashed for waiting.
export function StatusBadge({ status }: { status: CaseStatus }) {
  const { icon, className } = STATUS[status];
  return (
    <span className={`${styles.status} ${className}`}>
      <Icon name={icon} />
      {status}
    </span>
  );
}
