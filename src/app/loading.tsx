import styles from "./state-pages.module.css";

// Shown while a page is loading. On the free Render plan the very first visit after a quiet spell
// can take about 30 seconds to wake the server; this is what a navigation shows in the meantime.
export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.card}>
        <span className="spinner" aria-hidden="true" />
        <h1>Getting the demo ready…</h1>
        <p>The first load after a quiet spell can take up to 30 seconds. Thanks for waiting.</p>
      </div>
    </main>
  );
}
