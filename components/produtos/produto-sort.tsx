"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PRODUTO_SORT_OPTIONS } from "@/lib/produtos/constants";
import type { ProdutoSortField, SortOrder } from "@/types/produtos";

type ProdutoSortProps = {
  tenantSlug: string;
  currentSort?: ProdutoSortField;
  currentOrder?: SortOrder;
};

export function ProdutoSort({
  tenantSlug,
  currentSort = "nome",
  currentOrder = "asc",
}: ProdutoSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(sort: ProdutoSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder =
      currentSort === sort && currentOrder === "asc" ? "desc" : "asc";

    params.set("sort", sort);
    params.set("order", nextOrder);
    params.delete("page");

    startTransition(() => {
      router.push(`/${tenantSlug}/produtos?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Ordenar por:</span>
      {PRODUTO_SORT_OPTIONS.map((option) => (
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
