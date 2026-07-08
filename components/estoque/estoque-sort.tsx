"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { MOVIMENTACAO_SORT_OPTIONS } from "@/lib/estoque/constants";
import type { MovimentacaoSortField, SortOrder } from "@/types/estoque";

type EstoqueSortProps = {
  tenantSlug: string;
  currentSort?: MovimentacaoSortField;
  currentOrder?: SortOrder;
};

export function EstoqueSort({
  tenantSlug,
  currentSort = "created_at",
  currentOrder = "desc",
}: EstoqueSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(sort: MovimentacaoSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder =
      currentSort === sort && currentOrder === "desc" ? "asc" : "desc";

    params.set("sort", sort);
    params.set("order", nextOrder);
    params.delete("page");

    startTransition(() => {
      router.push(`/${tenantSlug}/estoque?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Ordenar por:</span>
      {MOVIMENTACAO_SORT_OPTIONS.map((option) => (
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
