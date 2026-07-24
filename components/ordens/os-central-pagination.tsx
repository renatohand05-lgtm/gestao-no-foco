import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  OS_CENTRAL_PER_PAGE_OPTIONS,
  type OsCentralPagination,
} from "@/lib/ordens/os-central-compose";
import { cn } from "@/lib/utils";

type Props = {
  pagination: OsCentralPagination;
  prevHref: string | null;
  nextHref: string | null;
  perPageHrefs: Record<number, string>;
};

export function OsCentralPaginationBar({
  pagination,
  prevHref,
  nextHref,
  perPageHrefs,
}: Props) {
  return (
    <nav
      className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação da lista de OS"
      data-os-block="central-pagination"
    >
      <p className="text-xs text-muted-foreground" role="status">
        {pagination.label}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Registros por página"
        >
          <span className="text-xs text-muted-foreground">Por página</span>
          {OS_CENTRAL_PER_PAGE_OPTIONS.map((n) => (
            <Link
              key={n}
              href={perPageHrefs[n] ?? "#"}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: pagination.perPage === n ? "default" : "outline",
                }),
                "h-8 min-w-8 px-2",
              )}
              aria-current={pagination.perPage === n ? "page" : undefined}
            >
              {n}
            </Link>
          ))}
        </div>

        {prevHref ? (
          <Link
            href={prevHref}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            rel="prev"
          >
            Anterior
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "pointer-events-none opacity-40",
            )}
            aria-disabled="true"
          >
            Anterior
          </span>
        )}

        <span className="text-xs tabular-nums text-muted-foreground">
          {pagination.page} / {pagination.totalPages}
        </span>

        {nextHref ? (
          <Link
            href={nextHref}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            rel="next"
          >
            Próximo
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "pointer-events-none opacity-40",
            )}
            aria-disabled="true"
          >
            Próximo
          </span>
        )}
      </div>
    </nav>
  );
}
