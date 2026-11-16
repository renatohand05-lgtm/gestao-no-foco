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
  const prevNextClass = cn(
    buttonVariants({ size: "sm", variant: "outline" }),
    "max-md:h-11 max-md:w-full",
  );
  const disabledClass = cn(prevNextClass, "pointer-events-none opacity-40");

  return (
    <nav
      className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação da lista de OS"
      data-os-block="central-pagination"
    >
      <p
        className="text-xs text-muted-foreground max-sm:order-3 max-sm:text-center"
        role="status"
      >
        {pagination.label}
      </p>

      <div className="flex flex-wrap items-center gap-2 max-sm:contents">
        <div
          className="flex items-center gap-1 max-sm:order-2 max-sm:justify-center"
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

        <div className="flex items-center gap-2 max-sm:order-1 max-sm:grid max-sm:grid-cols-[1fr_auto_1fr]">
          {prevHref ? (
            <Link href={prevHref} className={prevNextClass} rel="prev">
              Anterior
            </Link>
          ) : (
            <span className={disabledClass} aria-disabled="true">
              Anterior
            </span>
          )}

          <span className="text-xs tabular-nums text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>

          {nextHref ? (
            <Link href={nextHref} className={prevNextClass} rel="next">
              Próximo
            </Link>
          ) : (
            <span className={disabledClass} aria-disabled="true">
              Próximo
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
