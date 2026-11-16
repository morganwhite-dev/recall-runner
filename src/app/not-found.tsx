import Link from "next/link";
import styles from "./state-pages.module.css";

// Any address that doesn't exist: a plain page in the app's look instead of the framework's blank 404.
export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <div className={styles.body}>
          <h1>That page doesn&apos;t exist</h1>
          <p>
            The link may be old, or mistyped. You can start the demo from the home
            page.
          </p>
          <div className={styles.actions}>
            <Link className="button" href="/">
              Back to the home page
            </Link>
            <Link className={styles.second} href="/dashboard">
              Store dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
