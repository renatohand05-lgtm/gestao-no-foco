"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  buildPageHref: (page: number) => string;
  className?: string;
  labels?: {
    previous?: string;
    next?: string;
    page?: (page: number, totalPages: number) => string;
  };
};

export function Pagination({
  page,
  totalPages,
  buildPageHref,
  className,
  labels,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const previousLabel = labels?.previous ?? "Anterior";
  const nextLabel = labels?.next ?? "Próxima";
  const pageLabel =
    labels?.page?.(page, totalPages) ?? `Página ${page} de ${totalPages}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{pageLabel}</p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            {previousLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildPageHref(page - 1)} />}
          >
            {previousLabel}
          </Button>
        )}
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            {nextLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildPageHref(page + 1)} />}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
