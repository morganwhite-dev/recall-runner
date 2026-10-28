"use client";

import { useState, type KeyboardEvent } from "react";
import type { GridApi } from "ag-grid-community";
import { CaseGrid, type GridKind } from "./CaseGrid";
import type { BuyerCase, CaseStatus } from "./data";
import { DetailPanel } from "./DetailPanel";
import delight from "./delight.module.css";
import styles from "./page.module.css";

const STATUSES: (CaseStatus | "All")[] = [
  "All",
  "Notified",
  "Waiting",
  "Settled",
  "Problem",
];

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
  // Start on the buyer who can really sign in, so the panel shows the case a judge will act on.
  const [selectedId, setSelectedId] = useState(
    (CASES.find((c) => c.canSignIn) ?? CASES[0])?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "All">("All");
  const [api, setApi] = useState<GridApi<BuyerCase> | null>(null);
  const [shown, setShown] = useState(CASES.length);
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
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <span className="sr-only">Search buyers</span>
              <input
                type="search"
                value={search}
                placeholder="Search buyers, path, status…"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div
              className={styles.chips}
              role="group"
              aria-label="Filter by status"
            >
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                >
                  {s}
                  <span>
                    {s === "All"
                      ? CASES.length
                      : CASES.filter((c) => c.status === s).length}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.exportBtn}
              disabled={!api}
              onClick={() =>
                api?.exportDataAsCsv({
                  fileName: `recall-runner-${tab}.csv`,
                  skipColumnHeaders: false,
                })
              }
            >
              Export CSV
            </button>
          </div>
          <p className={styles.legend}>
            <b>Notified</b> sent, not opened · <b>Waiting</b> opened, or paid
            and waiting for PayPal to confirm · <b>Settled</b> PayPal confirmed
            · <b>Problem</b> could not complete
          </p>
          {shown === 0 && (
            <p className={styles.noMatch} role="status">
              No cases match these filters. Clear the search or choose All.
            </p>
          )}
          <CaseGrid
            key={tab}
            kind={tab}
            rows={CASES}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            status={status}
            onApi={setApi}
            onShown={setShown}
          />
          <div className={styles.gridFoot}>
            {tab === "cases" ? (
              <>
                <span>
                  Showing {shown} of {CASES.length}
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
      </section>

      <DetailPanel selected={selected} />
    </div>
  );
}
