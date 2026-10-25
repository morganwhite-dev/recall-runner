"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { CampaignOption } from "./data";
import styles from "./page.module.css";

export function CampaignSwitch({
  options,
  current,
}: {
  options: CampaignOption[];
  current: string;
}) {
  const router = useRouter();
  return (
    <label className={styles.switch}>
      <span className={styles.switchLabel}>Campaign</span>
      <select
        value={current}
        onChange={(e) => router.push(`/dashboard?campaign=${e.target.value}`)}
      >
        {options.map((o) => (
          <option key={o.recallNumber} value={o.recallNumber}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chev" />
    </label>
  );
}
