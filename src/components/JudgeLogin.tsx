import { CopyField } from "./CopyField";
import styles from "./JudgeLogin.module.css";

// The sandbox buyer's PayPal login, shown to judges so they never have to open the README.
// It is a PayPal SANDBOX test account (fake money). The values come from two environment
// variables, set on Render and in .env.local, so they are never committed to the public repo.
// Nothing is shown if either one is missing.
export function JudgeLogin({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const email = process.env.JUDGE_BUYER_EMAIL;
  const password = process.env.JUDGE_BUYER_PASSWORD;
  if (!email || !password) return null;
  return (
    <div
      className={`${styles.box} ${compact ? styles.compact : ""} ${className ?? ""}`}
      aria-label="Sandbox buyer login"
    >
      <p className={styles.title}>
        Sandbox buyer login <span>test account, fake money</span>
      </p>
      <CopyField label="Email" value={email} />
      <CopyField label="Password" value={password} />
      {!compact && (
        <p className={styles.note}>
          Use these on PayPal&apos;s sandbox sign-in page after you press
          Confirm with PayPal.
        </p>
      )}
    </div>
  );
}
