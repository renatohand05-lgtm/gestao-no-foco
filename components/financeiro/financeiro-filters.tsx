"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { gofControl } from "@/lib/design-system";
import { FINANCEIRO_STATUS_FILTER_OPTIONS } from "@/lib/financeiro/constants";
import { cn } from "@/lib/utils";

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

  return (
    <ExecutiveFilter label="Filtros">
      {tipoOptions ? (
        <ExecutiveFilterField label="Tipo" htmlFor="filter-tipo">
          <select
            id="filter-tipo"
            value={currentTipo}
            disabled={isPending}
            onChange={(event) => updateParams({ tipo: event.target.value })}
            className={cn(gofControl, "w-full min-w-36")}
          >
            {tipoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ExecutiveFilterField>
      ) : null}

      {naturezaOptions ? (
        <ExecutiveFilterField label="Natureza" htmlFor="filter-natureza">
          <select
            id="filter-natureza"
            value={currentNatureza}
            disabled={isPending}
            onChange={(event) =>
              updateParams({ natureza: event.target.value })
            }
            className={cn(gofControl, "w-full min-w-36")}
          >
            {naturezaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ExecutiveFilterField>
      ) : null}

      <ExecutiveFilterField label="Status" htmlFor="filter-ativo">
        <select
          id="filter-ativo"
          value={currentAtivo}
          disabled={isPending}
          onChange={(event) => updateParams({ ativo: event.target.value })}
          className={cn(gofControl, "w-full min-w-36")}
        >
          {FINANCEIRO_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
