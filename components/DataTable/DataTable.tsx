"use client";

import React, { useMemo, useState } from "react";
import styles from "./DataTable.module.css";

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  /** Unique key that maps to a property on the row data */
  key: string;
  /** Header label */
  label: string;
  /** Whether the column is sortable. Defaults to false. */
  sortable?: boolean;
  /** Optional custom render function for the cell */
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  data: T[];
  /** Unique key field on each row. Defaults to "id". */
  rowKey?: string;
  /** Number of rows per page. Defaults to 10. */
  pageSize?: number;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
}

/**
 * Reusable data table matching Splose table patterns.
 *
 * Features:
 * - Sortable column headers (click to toggle asc/desc)
 * - Client-side pagination
 * - Status badge integration via custom render functions
 * - Purple active-sort indicator following Splose design
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey = "id",
  pageSize = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(0);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pageData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const sortIndicator = (key: string) => {
    if (sortKey !== key) return " \u2195";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.sortable ? styles.sortable : ""} ${sortKey === col.key ? styles.activeSort : ""}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.label}
                  {col.sortable && (
                    <span className={styles.sortIcon}>{sortIndicator(col.key)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.empty}>
                  No data available.
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  className={`${styles.tr} ${onRowClick ? styles.clickable : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
