"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  CsvExportModule,
  ExternalFilterModule,
  ModuleRegistry,
  QuickFilterModule,
  RowApiModule,
  RowSelectionModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { amountLabel, type BuyerCase, type CaseStatus } from "./data";
import { StatusBadge } from "./StatusBadge";
import styles from "./page.module.css";

ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  CsvExportModule,
  ExternalFilterModule,
  QuickFilterModule,
  RowApiModule,
  RowSelectionModule,
]);

// Plum look through the AG Grid theming API: 40px header, 44px rows.
const gridTheme = themeQuartz.withParams({
  fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
  fontSize: 14,
  foregroundColor: "#1f1a21",
  backgroundColor: "#ffffff",
  accentColor: "#3b1f3f",
  borderColor: "#e0d9dd",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  columnBorder: false,
  headerHeight: 40,
  headerBackgroundColor: "#f2edef",
  headerTextColor: "#5a525c",
  headerFontSize: 12,
  headerFontWeight: 600,
  rowHeight: 50,
  cellHorizontalPadding: 12,
  rowHoverColor: "#fbf7f9",
  selectedRowBackgroundColor: "#f8f2f5",
});

function BuyerCell({ data }: ICellRendererParams<BuyerCase>) {
  if (!data) return null;
  return (
    <span className={styles.who}>
      <span className={styles.avatar} aria-hidden="true">
        {data.initials}
      </span>
      <span className={styles.whoText}>
        {data.name}
        {data.canSignIn && (
          <span className={styles.you}>You · sign in here</span>
        )}
      </span>
    </span>
  );
}

// Path on the first line, how long ago the order was paid under it.
function PathCell({ data }: ICellRendererParams<BuyerCase>) {
  if (!data) return null;
  return (
    <span className={styles.pathTwo}>
      <b>{data.path}</b>
      <span>{data.daysAgo} days ago</span>
    </span>
  );
}

function StatusCell({ data }: ICellRendererParams<BuyerCase>) {
  return data ? <StatusBadge status={data.status} /> : null;
}

const cell = styles.cell;

const CASE_COLUMNS: ColDef<BuyerCase>[] = [
  {
    colId: "buyer",
    headerName: "Buyer",
    field: "name",
    cellRenderer: BuyerCell,
    flex: 1.6,
    minWidth: 150,
    cellClass: cell,
  },
  {
    colId: "path",
    headerName: "Path",
    field: "path",
    cellRenderer: PathCell,
    flex: 1.2,
    minWidth: 120,
    cellClass: cell,
  },
  {
    colId: "amount",
    headerName: "Amount",
    field: "amountCents",
    valueFormatter: (p) => (p.data ? amountLabel(p.data) : ""),
    type: "rightAligned",
    flex: 0.7,
    minWidth: 76,
    cellClass: [cell, styles.cellRight, styles.num],
  },
  {
    colId: "status",
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCell,
    flex: 1.2,
    minWidth: 130,
    cellClass: cell,
  },
];

const BUYER_COLUMN = CASE_COLUMNS[0];
const STATUS_COLUMN = CASE_COLUMNS[3];

// The outbox lists who each notice went to; the detail panel's button replaces the old Action column.
const OUTBOX_COLUMNS: ColDef<BuyerCase>[] = [
  { ...BUYER_COLUMN, flex: 1.4, minWidth: 150 },
  {
    colId: "to",
    headerName: "Sent to",
    field: "email",
    flex: 1.3,
    minWidth: 130,
    cellClass: [cell, styles.mono],
  },
  {
    colId: "sent",
    headerName: "Sent",
    field: "sent",
    flex: 0.8,
    minWidth: 80,
    cellClass: cell,
  },
  {
    colId: "opened",
    headerName: "Opened",
    field: "opened",
    // Without this AG Grid infers a boolean column and draws a checkbox instead of the word.
    cellDataType: false,
    valueFormatter: (p) => (p.value ? "Yes" : "No"),
    flex: 0.7,
    minWidth: 70,
    cellClass: cell,
  },
  { ...STATUS_COLUMN, flex: 1.1, minWidth: 120 },
];

export type GridKind = "cases" | "outbox";

interface CaseGridProps {
  kind: GridKind;
  rows: BuyerCase[];
  selectedId: string;
  onSelect: (id: string) => void;
  // Narrowing the list: free-text search (AG Grid's quick filter) and an exact status.
  search: string;
  status: CaseStatus | "All";
  // Hands the toolbar the grid's API (for CSV export) and how many rows are showing.
  onApi: (api: GridApi<BuyerCase>) => void;
  onShown: (shown: number) => void;
}

// Selection follows keyboard focus, so arrow keys move through the cases.
export function CaseGrid({
  kind,
  rows,
  selectedId,
  onSelect,
  search,
  status,
  onApi,
  onShown,
}: CaseGridProps) {
  const columnDefs = useMemo(
    () => (kind === "cases" ? CASE_COLUMNS : OUTBOX_COLUMNS),
    [kind],
  );
  const apiRef = useRef<GridApi<BuyerCase> | null>(null);

  // The status filter lives outside the grid, so tell the grid when it changes.
  useEffect(() => {
    apiRef.current?.onFilterChanged();
  }, [status]);
  return (
    <div className={styles.agWrap}>
      <AgGridReact<BuyerCase>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        domLayout="autoHeight"
        headerHeight={40}
        rowHeight={50}
        suppressMovableColumns
        defaultColDef={{
          sortable: true,
          resizable: false,
          suppressMovable: true,
        }}
        rowSelection={{
          mode: "singleRow",
          checkboxes: false,
          enableClickSelection: true,
        }}
        quickFilterText={search}
        isExternalFilterPresent={() => status !== "All"}
        doesExternalFilterPass={(node) => node.data?.status === status}
        onGridReady={(e) => {
          apiRef.current = e.api;
          onApi(e.api);
        }}
        onFilterChanged={(e) => {
          onShown(e.api.getDisplayedRowCount());
          // If the selected buyer was filtered out, the panel follows the first one still showing.
          if (!e.api.getRowNode(selectedId)?.displayed) {
            e.api.getDisplayedRowAtIndex(0)?.setSelected(true);
          }
        }}
        onFirstDataRendered={(e) => {
          e.api.getRowNode(selectedId)?.setSelected(true);
          onShown(e.api.getDisplayedRowCount());
        }}
        onRowSelected={(e) => {
          if (e.node.isSelected() && e.data) onSelect(e.data.id);
        }}
        onCellFocused={(e) => {
          if (e.rowIndex == null || e.rowPinned) return;
          e.api.getDisplayedRowAtIndex(e.rowIndex)?.setSelected(true);
        }}
      />
    </div>
  );
}
