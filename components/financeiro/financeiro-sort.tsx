"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { SortOrder } from "@/types/financeiro";

type SortOption = {
  value: string;
  label: string;
};

type FinanceiroSortProps = {
  tenantSlug: string;
  basePath: string;
  options: readonly SortOption[];
  currentSort?: string;
  currentOrder?: SortOrder;
};

export function FinanceiroSort({
  tenantSlug,
  basePath,
  options,
  currentSort,
  currentOrder = "asc",
}: FinanceiroSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder =
      currentSort === sort && currentOrder === "asc" ? "desc" : "asc";

    params.set("sort", sort);
    params.set("order", nextOrder);
    params.delete("page");

    startTransition(() => {
      router.push(
        `/${tenantSlug}/financeiro/${basePath}?${params.toString()}`,
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Ordenar por:</span>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={currentSort === option.value ? "default" : "outline"}
          disabled={isPending}
          onClick={() => updateSort(option.value)}
        >
          {option.label}
          {currentSort === option.value
            ? currentOrder === "asc"
              ? " ↑"
              : " ↓"
            : ""}
        </Button>
      ))}
    </div>
  );
}
