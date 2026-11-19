import { Icon } from "@/components/Icon";
import type { GuideBuyer } from "./data";
import styles from "./picker.module.css";

// "Pick a buyer": the sandbox buyers a demo visitor can sign in as, each with one scenario. A plain
// <details> element, so it works with the keyboard and without any script. A buyer whose page is
// not ready yet stays in the list with the reason, rather than disappearing.
export function BuyerPicker({ buyers }: { buyers: GuideBuyer[] }) {
  if (buyers.length < 2) return null;
  return (
    <details className={styles.picker}>
      <summary className={styles.summary}>Pick a buyer</summary>
      <ul className={styles.list}>
        {buyers.map((b) => (
          <li key={b.key} className={styles.item}>
            <p className={styles.head}>
              <b>{b.label}</b>
              <span>{b.name}</span>
            </p>
            <p className={styles.story}>{b.story}</p>
            {b.path ? (
              <a
                className={styles.open}
                href={b.path}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open buyer page <Icon name="ext" />
              </a>
            ) : (
              <p className={styles.wait}>{b.note}</p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
