import type { Funnel as FunnelData, FunnelRecall } from "@/lib/funnel";
import { clip } from "./data";
import styles from "./funnel.module.css";

function Chip({
  r,
  kind,
  current,
}: {
  r: FunnelRecall;
  kind: "matched" | "refused";
  current: boolean;
}) {
  return (
    <li
      className={`${styles.chip} ${kind === "matched" ? styles.chipMatched : styles.chipRefused}`}
      aria-current={current ? "true" : undefined}
    >
      <b>#{r.recallNumber}</b>
      <span title={r.title}>{clip(r.title, 64)}</span>
      {r.reason && <small>{r.reason}</small>}
      {current && <em>This recall</em>}
    </li>
  );
}

// How the agent narrowed the recall feed down to this store's campaigns. The numbers come from the
// scan's saved decisions, so this card makes no AI call. The AI proposes a match, then fixed rules
// check it, which is why some recalls the AI looked at are still refused.
export function Funnel({
  funnel,
  current,
}: {
  funnel: FunnelData;
  current: string;
}) {
  const stages = [
    {
      n: funnel.checked,
      label: "CPSC recalls checked",
      note: "every recall in the feed snapshot",
    },
    {
      n: funnel.candidates,
      label: "shared words with a product",
      note: "a cheap word check decides which are worth an AI call",
    },
    {
      n: funnel.matched.length,
      label: "matched",
      note: `${funnel.refused.length} refused by the AI or the rules`,
    },
  ];
  return (
    <section className={styles.funnel} aria-labelledby="funnel-title">
      <div className={styles.head}>
        <h2 id="funnel-title">How the agent found these recalls</h2>
        <p>
          Last scan{" "}
          {funnel.scannedAt
            ? funnel.scannedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            : ""}
          . Read from saved decisions, no new AI calls.
        </p>
      </div>
      <ol className={styles.stages}>
        {stages.map((s) => (
          <li key={s.label}>
            <b>{s.n}</b>
            <span>{s.label}</span>
            <small>{s.note}</small>
          </li>
        ))}
      </ol>
      <div className={styles.lists}>
        <div>
          <h3>Matched</h3>
          <ul>
            {funnel.matched.map((r) => (
              <Chip
                key={r.recallNumber}
                r={r}
                kind="matched"
                current={r.recallNumber === current}
              />
            ))}
          </ul>
        </div>
        <div>
          <h3>Refused</h3>
          <ul>
            {funnel.refused.map((r) => (
              <Chip key={r.recallNumber} r={r} kind="refused" current={false} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
