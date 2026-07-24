import { cn } from "@/lib/utils";
import {
  gofMotion,
  gofTypography,
} from "@/lib/design-system/foundation";
import { gofCardSurface } from "@/lib/design-system/primitives";
import { ExecutiveEmptyState } from "@/components/executive/ExecutiveEmptyState";
import { ExecutiveLoading } from "@/components/executive/ExecutiveLoading";

export type ExecutiveTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
};

type Props<T> = {
  columns: ExecutiveTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  className?: string;
  emptyMessage?: string;
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;
  loading?: boolean;
  maxHeightClassName?: string;
};

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * ExecutiveTable — header sticky, hover, empty, loading (Gate 19.0.2).
 */
export function ExecutiveTable<T>({
  columns,
  rows,
  getRowId,
  className,
  emptyMessage = "Nenhum registro.",
  density = "comfortable",
  stickyHeader = true,
  loading = false,
  maxHeightClassName,
}: Props<T>) {
  const cellPad = density === "compact" ? "px-3 py-2" : "px-4 py-3";

  if (loading) {
    return (
      <div
        className={cn(gofCardSurface, "p-8", className)}
        aria-busy="true"
        aria-live="polite"
      >
        <ExecutiveLoading fill label="Carregando tabela…" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <ExecutiveEmptyState
        title={emptyMessage}
        description="Ajuste os filtros ou cadastre o primeiro item."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        gofCardSurface,
        "overflow-hidden p-0",
        gofMotion.fade,
        className,
      )}
    >
      <div
        className={cn(
          "overflow-x-auto",
          maxHeightClassName && "overflow-y-auto",
          maxHeightClassName,
        )}
      >
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead
            className={cn(
              stickyHeader && "sticky top-0 z-10",
              "border-b border-border/60 bg-muted/80 backdrop-blur-sm",
            )}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    cellPad,
                    gofTypography.caption,
                    "whitespace-nowrap text-muted-foreground",
                    alignClass[col.align ?? "left"],
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                className={cn(
                  "border-b border-border/40 last:border-0",
                  "motion-safe:transition-colors motion-safe:duration-150",
                  "hover:bg-muted/30",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      cellPad,
                      gofTypography.body,
                      "max-w-[20rem] truncate align-middle",
                      alignClass[col.align ?? "left"],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
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
