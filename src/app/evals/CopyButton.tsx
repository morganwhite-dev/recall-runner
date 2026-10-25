"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import styles from "./page.module.css";

// Copies with the Clipboard API, falls back to a hidden textarea, and does nothing visible if both fail.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    if (!(await copyText(text))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        className={styles.copy}
        type="button"
        data-copied={copied ? "" : undefined}
        aria-label={`Copy command ${text}`}
        onClick={onClick}
      >
        <span>
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Copied ${text}` : ""}
      </span>
    </>
  );
}
