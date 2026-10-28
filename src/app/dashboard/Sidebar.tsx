import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CampaignSwitch } from "./CampaignSwitch";
import type { CampaignOption } from "./data";
import styles from "./shell.module.css";

const GITHUB_URL = "https://github.com/morganwhite-dev/recall-runner";

// The plum column on the left: brand, the store, the campaign list and two links.
export function Sidebar({
  campaigns,
  current,
}: {
  campaigns: CampaignOption[];
  current: string;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Dashboard menu">
      <Link className={`${styles.logo} logo-turn`} href="/">
        <span className={styles.mark}>
          <Icon name="loop" />
        </span>
        Recall Runner
      </Link>
      <div className={styles.storeChip}>
        <i aria-hidden="true">BH</i>
        <div>
          <span>Store</span>
          <b>Brightnest Home</b>
        </div>
      </div>
      <CampaignSwitch options={campaigns} current={current} />
      <nav className={styles.links} aria-label="More">
        <Link href="/evals">Test results</Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          GitHub <Icon name="ext" />
        </a>
      </nav>
      <p className={styles.disclaimer}>
        Demo store. The merchant and order dates are made up; the recalls are
        real CPSC data. Not affiliated with CPSC or PayPal.
      </p>
    </aside>
  );
}
