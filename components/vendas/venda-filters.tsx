"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { GFSelect } from "@/components/gf/gf-select";
import { VENDA_STATUS_FILTER_OPTIONS } from "@/lib/vendas/constants";

type VendaFiltersProps = {
  tenantSlug: string;
  currentStatus?: string;
};

export function VendaFilters({
  tenantSlug,
  currentStatus = "all",
}: VendaFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/vendas?${queryString}`
          : `/${tenantSlug}/vendas`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1.5">
        <label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <GFSelect
          id="filter-status"
          value={currentStatus}
          disabled={isPending}
          onValueChange={(status) => updateParams({ status })}
          aria-label="Filtrar por status"
          triggerClassName="h-9 min-w-44"
          options={VENDA_STATUS_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>
    </div>
  );
}
