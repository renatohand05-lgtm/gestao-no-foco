"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { VENDA_SORT_OPTIONS } from "@/lib/vendas/constants";
import type { SortOrder, VendaSortField } from "@/types/vendas";

type VendaSortProps = {
  tenantSlug: string;
  currentSort?: VendaSortField;
  currentOrder?: SortOrder;
};

export function VendaSort({
  tenantSlug,
  currentSort = "created_at",
  currentOrder = "desc",
}: VendaSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(sort: VendaSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder =
      currentSort === sort && currentOrder === "asc" ? "desc" : "asc";

    params.set("sort", sort);
    params.set("order", nextOrder);
    params.delete("page");

    startTransition(() => {
      router.push(`/${tenantSlug}/vendas?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Ordenar por:</span>
      {VENDA_SORT_OPTIONS.map((option) => (
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
