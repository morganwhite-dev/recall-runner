import styles from "./Seal.module.css";

export type SealKind = "success" | "account" | "info" | "lost" | "wait";

// One badge family for every state page: the same ring (r54), badge (r43) and 6.5 stroke on a
// 120 box. The receipt seal is plum with a coral tick; the others are calm white badges with a
// plum mark and a dashed ring. Decorative: each page says its state in words beside it.
//   success: the receipt          account: the wrong PayPal account (with a try-again chip)
//   info:    a case the rules refused   lost: a page or link that isn't there (with a map pin)
//   wait:    the loading page (the minute hand turns)
export function Seal({ kind }: { kind: SealKind }) {
  if (kind === "success") {
    return (
      <svg className={styles.seal} viewBox="0 0 120 120" aria-hidden="true">
        <circle className={styles.ring} cx="60" cy="60" r="54" />
        <circle className={styles.badge} cx="60" cy="60" r="43" />
        <path
          className={`${styles.mark} ${styles.tick}`}
          d="M42 61l12 12 25-27"
          pathLength="1"
        />
        <path
          className={`${styles.spark} ${styles.sparkCoral}`}
          d="M104 9q1.8 5.2 7 7-5.2 1.8-7 7-1.8-5.2-7-7 5.2-1.8 7-7z"
        />
        <path
          className={styles.spark}
          d="M15 93q1.2 3.6 4.8 4.8-3.6 1.2-4.8 4.8-1.2-3.6-4.8-4.8 3.6-1.2 4.8-4.8z"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${styles.seal} ${styles.soft}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <circle className={styles.ring} cx="60" cy="60" r="54" />
      <g className={styles.body}>
        <circle className={styles.badge} cx="60" cy="60" r="43" />
        {kind === "account" && (
          <>
            <circle className={styles.mark} cx="56" cy="49" r="10" />
            <path
              className={styles.mark}
              d="M37 80c2.6-10 10-15.5 19-15.5s16.4 5.5 19 15.5"
            />
          </>
        )}
        {kind === "info" && (
          <path className={styles.mark} d="M60 40h.01M60 54v24" />
        )}
        {kind === "lost" && (
          <path
            className={styles.mark}
            d="M48 47a12 12 0 1 1 17 10.9c-3.4 1.6-5 4-5 7.6v2M60 79h.01"
          />
        )}
        {kind === "wait" && (
          <>
            <path className={styles.mark} d="M60 60l13 8" />
            <path className={`${styles.mark} ${styles.hand}`} d="M60 60V37" />
          </>
        )}
      </g>
      {kind === "account" && (
        <g className={styles.chip}>
          <circle cx="89" cy="89" r="17" />
          <g transform="translate(80 80) scale(0.75)">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </g>
        </g>
      )}
      {kind === "lost" && (
        <g className={styles.chip}>
          <circle cx="89" cy="89" r="17" />
          <path d="M89 99.5s-7.5-6.8-7.5-12.3a7.5 7.5 0 0 1 15 0c0 5.5-7.5 12.3-7.5 12.3z" />
          <circle cx="89" cy="87" r="2.4" />
        </g>
      )}
    </svg>
  );
}
