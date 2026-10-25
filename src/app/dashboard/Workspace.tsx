"use client";

import { useState, type KeyboardEvent } from "react";
import { CaseGrid, type GridKind } from "./CaseGrid";
import type { BuyerCase } from "./data";
import { DetailPanel, MessagePreview } from "./DetailPanel";
import delight from "./delight.module.css";
import styles from "./page.module.css";

const TABS: { id: GridKind; label: string }[] = [
  { id: "cases", label: "Cases" },
  { id: "outbox", label: "Outbox" },
];

export function Workspace({
  cases: CASES,
  approved,
}: {
  cases: BuyerCase[];
  approved: boolean;
}) {
  const [tab, setTab] = useState<GridKind>("cases");
  const [selectedId, setSelectedId] = useState(CASES[0]?.id ?? "");
  const selected = CASES.find((c) => c.id === selectedId) ?? CASES[0];

  if (!selected) {
    return (
      <p className={styles.empty}>
        {approved
          ? "This campaign has no affected orders, so there's nobody to notify."
          : "Nothing here yet. Approve the campaign and we'll open a case for each affected order and notify the buyers. Nothing is sent or paid until you do."}
      </p>
    );
  }

  // Arrow keys, Home and End move between tabs and activate them.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (index + last) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }

  return (
    <div className={styles.split}>
      <section aria-label="Cases and outbox">
        <div className={styles.tabs} role="tablist" aria-label="Campaign views">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={delight.tab}
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.label} <span className={styles.count}>{CASES.length}</span>
            </button>
          ))}
        </div>

        <div
          className={styles.grid}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          <CaseGrid
            key={tab}
            kind={tab}
            rows={CASES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className={styles.gridFoot}>
            {tab === "cases" ? (
              <>
                <span>
                  1 to {CASES.length} of {CASES.length}
                </span>
                <span>Select a row to see why it happened</span>
              </>
            ) : (
              <span>
                Delivery: in-app outbox (demo). Real email is not sent.
              </span>
            )}
          </div>
        </div>

        <MessagePreview c={selected} />
      </section>

      <DetailPanel selected={selected} />
    </div>
  );
}
