import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  dense?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(16,17,20,0.035)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="scrollbar-thin overflow-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-[#fafaf9]/95 backdrop-blur dark:bg-ink-900/92">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "border-b border-black/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#858790] dark:border-white/10 dark:text-white/45",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "group transition",
                  onRowClick && "cursor-pointer hover:bg-black/[0.025] focus:bg-black/[0.035] focus:outline-none dark:hover:bg-white/[0.04]",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-black/[0.06] px-4 text-sm font-medium text-[#4f525a] dark:border-white/[0.06] dark:text-white/78",
                      dense ? "py-3" : "py-4",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
