import { Icon, type IconName } from "@/components/Icon";
import type { CaseStatus } from "./data";
import delight from "./delight.module.css";
import styles from "./page.module.css";

const STATUS: Record<CaseStatus, { icon: IconName; className: string }> = {
  Settled: { icon: "done", className: `${styles.settled} ${delight.settled}` },
  Sent: { icon: "bell", className: styles.sent },
  Opened: { icon: "opened", className: styles.opened },
  "Waiting on PayPal": { icon: "clock", className: styles.waiting },
  Problem: { icon: "alert", className: styles.problem },
};

// Status is always a mark plus a word, never colour alone and never a pill: green filled tick for
// settled, a bell for sent, an open envelope for opened, a clock (dashed underline) for waiting and
// an alert for a problem. On the dark case header (onDark) the mark and word turn white.
export function StatusBadge({
  status,
  onDark = false,
}: {
  status: CaseStatus;
  onDark?: boolean;
}) {
  const { icon, className } = STATUS[status];
  return (
    <span
      className={`${styles.status} ${className} ${onDark ? styles.statusOnDark : ""}`}
    >
      <Icon name={icon} />
      {status}
    </span>
  );
}
