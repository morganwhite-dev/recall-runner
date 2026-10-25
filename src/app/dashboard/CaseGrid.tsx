"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ModuleRegistry,
  RowApiModule,
  RowSelectionModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Icon } from "@/components/Icon";
import {
  buyerPagePath,
  formatMoney,
  type BuyerCase,
} from "./data";
import { StatusBadge } from "./StatusBadge";
import styles from "./page.module.css";

ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
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
  rowHeight: 44,
  cellHorizontalPadding: 12,
  rowHoverColor: "#f8f4f6",
  selectedRowBackgroundColor: "#f2edef",
});

function BuyerCell({ data }: ICellRendererParams<BuyerCase>) {
  if (!data) return null;
  return (
    <span className={styles.who}>
      <span className={styles.avatar} aria-hidden="true">
        {data.initials}
      </span>
      {data.name}
    </span>
  );
}

function PathCell({ data }: ICellRendererParams<BuyerCase>) {
  if (!data) return null;
  return (
    <span className={styles.path}>
      <Icon name={data.path === "Refund" ? "refund" : "payout"} />
      {data.path}
    </span>
  );
}

function StatusCell({ data }: ICellRendererParams<BuyerCase>) {
  return data ? <StatusBadge status={data.status} /> : null;
}

function LinkCell({ data }: ICellRendererParams<BuyerCase>) {
  if (!data) return null;
  return (
    <Link className={styles.link} href={buyerPagePath(data)}>
      Open buyer page
    </Link>
  );
}

const cell = styles.cell;

const CASE_COLUMNS: ColDef<BuyerCase>[] = [
  {
    colId: "buyer",
    headerName: "Buyer",
    field: "name",
    cellRenderer: BuyerCell,
    flex: 1.5,
    minWidth: 190,
    cellClass: cell,
  },
  {
    colId: "paid",
    headerName: "Order paid",
    field: "daysAgo",
    valueFormatter: (p) => `${p.value} days ago`,
    flex: 1,
    minWidth: 120,
    cellClass: cell,
  },
  {
    colId: "path",
    headerName: "Remedy path",
    field: "path",
    cellRenderer: PathCell,
    flex: 1.2,
    minWidth: 150,
    cellClass: cell,
  },
  {
    colId: "amount",
    headerName: "Amount",
    field: "amountCents",
    valueFormatter: (p) => formatMoney(p.value),
    type: "rightAligned",
    flex: 0.8,
    minWidth: 100,
    cellClass: [cell, styles.cellRight, styles.num],
  },
  {
    colId: "status",
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCell,
    flex: 1,
    minWidth: 130,
    cellClass: cell,
  },
];

// Column minimums add up to less than the left column at 1280px, so the grid never scrolls sideways.
const OUTBOX_COLUMNS: ColDef<BuyerCase>[] = [
  { ...CASE_COLUMNS[0], flex: 1.2, minWidth: 150 },
  {
    colId: "to",
    headerName: "Sent to",
    field: "email",
    flex: 1.3,
    minWidth: 140,
    cellClass: [cell, styles.mono],
  },
  {
    colId: "sent",
    headerName: "Sent",
    field: "sent",
    flex: 0.8,
    minWidth: 88,
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
    minWidth: 76,
    cellClass: cell,
  },
  { ...CASE_COLUMNS[4], flex: 1, minWidth: 112 },
  {
    colId: "action",
    headerName: "Action",
    cellRenderer: LinkCell,
    sortable: false,
    headerClass: styles.hiddenHeader,
    flex: 1.2,
    minWidth: 150,
    cellClass: cell,
  },
];

export type GridKind = "cases" | "outbox";

interface CaseGridProps {
  kind: GridKind;
  rows: BuyerCase[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// Selection follows keyboard focus, so arrow keys move through the cases.
export function CaseGrid({ kind, rows, selectedId, onSelect }: CaseGridProps) {
  const columnDefs = useMemo(
    () => (kind === "cases" ? CASE_COLUMNS : OUTBOX_COLUMNS),
    [kind],
  );
  return (
    <div className={styles.agWrap}>
      <AgGridReact<BuyerCase>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        domLayout="autoHeight"
        headerHeight={40}
        rowHeight={44}
        suppressMovableColumns
        defaultColDef={{ sortable: true, resizable: false, suppressMovable: true }}
        rowSelection={{
          mode: "singleRow",
          checkboxes: false,
          enableClickSelection: true,
        }}
        onFirstDataRendered={(e) =>
          e.api.getRowNode(selectedId)?.setSelected(true)
        }
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
