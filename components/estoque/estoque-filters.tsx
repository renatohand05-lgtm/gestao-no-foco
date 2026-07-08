"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  MOVIMENTACAO_ORIGEM_OPTIONS,
  MOVIMENTACAO_TIPO_FILTER_OPTIONS,
} from "@/lib/estoque/constants";

type EstoqueFiltersProps = {
  tenantSlug: string;
  currentTipo?: string;
  currentOrigem?: string;
};

export function EstoqueFilters({
  tenantSlug,
  currentTipo = "all",
  currentOrigem = "all",
}: EstoqueFiltersProps) {
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
          ? `/${tenantSlug}/estoque?${queryString}`
          : `/${tenantSlug}/estoque`,
      );
    });
  }

  const selectClassName =
    "flex h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1.5">
        <label htmlFor="filter-tipo" className="text-xs font-medium text-muted-foreground">
          Tipo
        </label>
        <select
          id="filter-tipo"
          value={currentTipo}
          disabled={isPending}
          onChange={(event) => updateParams({ tipo: event.target.value })}
          className={selectClassName}
        >
          {MOVIMENTACAO_TIPO_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-origem" className="text-xs font-medium text-muted-foreground">
          Origem
        </label>
        <select
          id="filter-origem"
          value={currentOrigem}
          disabled={isPending}
          onChange={(event) => updateParams({ origem: event.target.value })}
          className={selectClassName}
        >
          <option value="all">Todas as origens</option>
          {MOVIMENTACAO_ORIGEM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
