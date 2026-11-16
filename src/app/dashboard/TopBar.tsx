import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CampaignSwitch } from "./CampaignSwitch";
import type { CampaignOption } from "./data";
import styles from "./shell.module.css";

const GITHUB_URL = "https://github.com/morganwhite-dev/recall-runner";

// The dark bar across the top (wordmark, the store, three links) and, under it, the campaigns as a
// row of tabs. Replaces the old left sidebar so the workspace gets the full width.
export function TopBar({
  campaigns,
  current,
}: {
  campaigns: CampaignOption[];
  current: string;
}) {
  return (
    <header className={styles.top}>
      <div className={`${styles.bar} on-dark`}>
        <div className={`${styles.barRow} ${styles.band}`}>
          <Link className={`${styles.logo} logo-turn`} href="/">
            <span className={styles.mark}>
              <Icon name="loop" />
            </span>
            Recall Runner
          </Link>
          <p className={styles.store}>
            <span>Store</span>
            <b>Brightnest Home</b>
          </p>
          <nav className={styles.links} aria-label="More">
            <Link href="/">Home</Link>
            <Link href="/evals">Test results</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              GitHub <Icon name="ext" />
            </a>
          </nav>
        </div>
      </div>
      <CampaignSwitch options={campaigns} current={current} />
    </header>
  );
}
