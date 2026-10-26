"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./JudgeLogin.module.css";

// A labelled value with a Copy button. Uses the Clipboard API and falls back to a hidden textarea
// (some embedded browsers block the first). The value stays selectable text either way.
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(area);
    }
    if (!ok) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <code className={styles.value}>{value}</code>
      <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}
