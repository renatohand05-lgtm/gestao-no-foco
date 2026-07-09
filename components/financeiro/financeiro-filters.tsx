"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { FINANCEIRO_STATUS_FILTER_OPTIONS } from "@/lib/financeiro/constants";

type FilterOption = {
  value: string;
  label: string;
};

type FinanceiroFiltersProps = {
  tenantSlug: string;
  basePath: string;
  currentAtivo?: string;
  tipoOptions?: readonly FilterOption[];
  currentTipo?: string;
  naturezaOptions?: readonly FilterOption[];
  currentNatureza?: string;
};

export function FinanceiroFilters({
  tenantSlug,
  basePath,
  currentAtivo = "all",
  tipoOptions,
  currentTipo = "all",
  naturezaOptions,
  currentNatureza = "all",
}: FinanceiroFiltersProps) {
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
          ? `/${tenantSlug}/financeiro/${basePath}?${queryString}`
          : `/${tenantSlug}/financeiro/${basePath}`,
      );
    });
  }

  const selectClassName =
    "flex h-9 w-full min-w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      {tipoOptions ? (
        <div className="space-y-1.5">
          <label
            htmlFor="filter-tipo"
            className="text-xs font-medium text-muted-foreground"
          >
            Tipo
          </label>
          <select
            id="filter-tipo"
            value={currentTipo}
            disabled={isPending}
            onChange={(event) => updateParams({ tipo: event.target.value })}
            className={selectClassName}
          >
            {tipoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {naturezaOptions ? (
        <div className="space-y-1.5">
          <label
            htmlFor="filter-natureza"
            className="text-xs font-medium text-muted-foreground"
          >
            Natureza
          </label>
          <select
            id="filter-natureza"
            value={currentNatureza}
            disabled={isPending}
            onChange={(event) =>
              updateParams({ natureza: event.target.value })
            }
            className={selectClassName}
          >
            {naturezaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="filter-ativo"
          className="text-xs font-medium text-muted-foreground"
        >
          Status
        </label>
        <select
          id="filter-ativo"
          value={currentAtivo}
          disabled={isPending}
          onChange={(event) => updateParams({ ativo: event.target.value })}
          className={selectClassName}
        >
          {FINANCEIRO_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
