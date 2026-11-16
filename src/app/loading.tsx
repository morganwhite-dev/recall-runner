import { Icon } from "@/components/Icon";
import styles from "./state-pages.module.css";

// Shown while a page is loading. On the free Render plan the very first visit after a quiet spell
// can take about 30 seconds to wake the server; this is what a navigation shows in the meantime.
export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.card}>
        <p className={styles.code} aria-hidden="true">
          <Icon name="clockdash" />
        </p>
        <div className={styles.body}>
          <h1>Getting the demo ready…</h1>
          <p>
            The first load after a quiet spell can take up to 30 seconds. Thanks
            for waiting.
          </p>
          <span className={styles.progress} aria-hidden="true">
            <i />
          </span>
        </div>
      </div>
    </main>
  );
}
