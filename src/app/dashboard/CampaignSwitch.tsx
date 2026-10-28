import Link from "next/link";
import type { CampaignOption } from "./data";
import styles from "./shell.module.css";

// The campaigns in the sidebar. Plain links, so choosing one is a normal page load and the
// current one is marked for screen readers with aria-current.
export function CampaignSwitch({
  options,
  current,
}: {
  options: CampaignOption[];
  current: string;
}) {
  return (
    <nav aria-label="Campaigns">
      <p className={styles.label}>Campaigns</p>
      <ul className={styles.campaigns}>
        {options.map((o) => (
          <li key={o.recallNumber}>
            <Link
              className={styles.campaign}
              href={`/dashboard?campaign=${o.recallNumber}`}
              aria-current={o.recallNumber === current ? "page" : undefined}
            >
              <span className={styles.campaignTop}>
                <span className={styles.campaignName}>{o.name}</span>
                <span className={styles.campaignCount}>
                  {o.closed}/{o.total}
                </span>
              </span>
              <small>
                #{o.recallNumber} · {o.remedy} · {o.approval}
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
