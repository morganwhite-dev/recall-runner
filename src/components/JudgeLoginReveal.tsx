"use client";

import { useState } from "react";
import { CopyField } from "./CopyField";
import { revealJudgeLogin } from "./judge-actions";
import styles from "./JudgeLogin.module.css";

export function JudgeLoginReveal({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [login, setLogin] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  async function show() {
    try {
      const result = await revealJudgeLogin();
      setLogin(result);
      setFailed(result === null);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div
      className={`${styles.box} ${compact ? styles.compact : ""} ${className ?? ""}`}
      aria-label="Sandbox buyer login"
    >
      <p className={styles.title}>
        Sandbox buyer login <span>test account, fake money</span>
      </p>
      {login ? (
        <>
          <CopyField label="Email" value={login.email} />
          <CopyField label="Password" value={login.password} />
          {!compact && (
            <p className={styles.note}>
              Use these on PayPal&apos;s sandbox sign-in page after you press
              Confirm with PayPal.
            </p>
          )}
        </>
      ) : (
        <>
          <button type="button" className={styles.reveal} onClick={show}>
            Show sandbox login
          </button>
          {failed && (
            <p className={styles.note} role="status">
              The login could not be loaded. It is also in the README.
            </p>
          )}
        </>
      )}
    </div>
  );
}
