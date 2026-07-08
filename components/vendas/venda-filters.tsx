"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
        <select
          id="filter-status"
          value={currentStatus}
          disabled={isPending}
          onChange={(event) => updateParams({ status: event.target.value })}
          className="flex h-9 w-full min-w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {VENDA_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
