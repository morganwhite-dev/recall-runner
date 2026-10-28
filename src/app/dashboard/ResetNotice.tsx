"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { StartFreshDemo } from "@/components/StartFreshDemo";
import { COOLDOWN_MS, secondsLabel, type ResetNotice as Notice } from "@/lib/reset-notice";
import styles from "./shell.module.css";

// The banner for a "Start fresh demo" that did not start one. Cooldown: someone else reset the demo
// a moment ago, so this visitor is looking at their run; the countdown runs here and the button
// turns on when it ends. Error: the reset failed. Shown above the demo strip.
export function ResetNotice({ notice }: { notice: Notice }) {
  const initial = notice.kind === "cooldown" ? notice.leftMs : 0;
  const [leftMs, setLeftMs] = useState(initial);

  // Counts down from the time the server worked out, using this browser's clock from here on.
  useEffect(() => {
    if (initial <= 0) return;
    const end = Date.now() + initial;
    const id = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setLeftMs(left);
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [initial]);

  if (notice.kind === "error") {
    return (
      <p className={`${styles.resetNotice} ${styles.band}`} role="alert">
        <Icon name="info" />
        The demo couldn’t reset. Please try again in a minute.
      </p>
    );
  }

  const waiting = leftMs > 0;
  return (
    <div className={`${styles.resetNotice} ${styles.band}`} role="status">
      <Icon name="info" />
      <p>
        {waiting
          ? `Someone started a fresh demo ${secondsLabel(COOLDOWN_MS - leftMs)} ago — you’re seeing their run. You can start your own in ${Math.ceil(leftMs / 1000)} s.`
          : "You can start your own fresh demo now."}
      </p>
      <StartFreshDemo
        disabled={waiting}
        look={{
          label: "Start my own",
          className: styles.stepperLink,
        }}
      />
    </div>
  );
}
