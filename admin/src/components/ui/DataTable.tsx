import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  ArrowUpDown,
} from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  onSort?: (sortKey: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onToggleRow?: (key: string | number) => void;
  onToggleAll?: (checked: boolean) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyText = "No records found",
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  sortBy,
  onSort,
  selectable = false,
  selectedKeys,
  onToggleRow,
  onToggleAll,
}: DataTableProps<T>) {
  const allSelected =
    selectable &&
    rows.length > 0 &&
    rows.every((r) => selectedKeys?.has(rowKey(r)));
  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={Boolean(allSelected)}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                    className="rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7] cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 ${
                    col.className || ""
                  }`}
                >
                  {col.sortKey && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.sortKey!)}
                      className={`inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer ${
                        sortBy === col.sortKey
                          ? "text-[#4f6ef7] font-bold"
                          : ""
                      }`}
                    >
                      {col.header}
                      <ArrowUpDown size={11} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {selectable && (
                    <td className="px-4 py-3.5">
                      <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-red-500">
                    <AlertCircle size={22} />
                    <p className="text-xs font-medium">{error}</p>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                    <Inbox size={24} />
                    <p className="text-xs font-medium">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                const checked = selectedKeys?.has(key) ?? false;
                return (
                  <tr
                    key={key}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      checked ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${key}`}
                          checked={checked}
                          onChange={() => onToggleRow?.(key)}
                          className="rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7] cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.className || ""}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> (
            {total} total)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
