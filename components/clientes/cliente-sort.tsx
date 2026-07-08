"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CLIENTE_SORT_OPTIONS } from "@/lib/clientes/constants";
import type { ClienteSortField, SortOrder } from "@/types/clientes";

type ClienteSortProps = {
  tenantSlug: string;
  currentSort?: ClienteSortField;
  currentOrder?: SortOrder;
};

export function ClienteSort({
  tenantSlug,
  currentSort = "nome",
  currentOrder = "asc",
}: ClienteSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(sort: ClienteSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder =
      currentSort === sort && currentOrder === "asc" ? "desc" : "asc";

    params.set("sort", sort);
    params.set("order", nextOrder);
    params.delete("page");

    startTransition(() => {
      router.push(`/${tenantSlug}/clientes?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Ordenar por:</span>
      {CLIENTE_SORT_OPTIONS.map((option) => (
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
