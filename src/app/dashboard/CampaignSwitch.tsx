import Link from "next/link";
import type { CampaignOption } from "./data";
import styles from "./shell.module.css";

// The campaigns as a row of tabs under the top bar. Plain links, so choosing one is a normal page
// load and the current one is marked for screen readers with aria-current. On narrow screens the
// row scrolls sideways inside its own strip, never the page.
export function CampaignSwitch({
  options,
  current,
}: {
  options: CampaignOption[];
  current: string;
}) {
  return (
    <nav className={styles.campaignBar} aria-label="Campaigns">
      <div className={`${styles.campaignRow} ${styles.band}`}>
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
                  <span className="recall-no">#{o.recallNumber}</span> ·{" "}
                  {o.remedy} · {o.approval}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
