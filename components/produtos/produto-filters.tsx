"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PRODUTO_STATUS_FILTER_OPTIONS,
  PRODUTO_TIPO_FILTER_OPTIONS,
} from "@/lib/produtos/constants";

type ProdutoFiltersProps = {
  tenantSlug: string;
  currentTipo?: string;
  currentAtivo?: string;
  currentCategoria?: string;
};

export function ProdutoFilters({
  tenantSlug,
  currentTipo = "all",
  currentAtivo = "all",
  currentCategoria = "",
}: ProdutoFiltersProps) {
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
          ? `/${tenantSlug}/produtos?${queryString}`
          : `/${tenantSlug}/produtos`,
      );
    });
  }

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
          className="flex h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {PRODUTO_TIPO_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-ativo" className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          id="filter-ativo"
          value={currentAtivo}
          disabled={isPending}
          onChange={(event) => updateParams({ ativo: event.target.value })}
          className="flex h-9 w-full min-w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {PRODUTO_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-categoria" className="text-xs font-medium text-muted-foreground">
          Categoria
        </label>
        <div className="flex gap-2">
          <Input
            id="filter-categoria"
            defaultValue={currentCategoria}
            placeholder="Filtrar categoria"
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                updateParams({
                  categoria: (event.target as HTMLInputElement).value || null,
                });
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              const input = document.getElementById(
                "filter-categoria",
              ) as HTMLInputElement | null;
              updateParams({ categoria: input?.value || null });
            }}
          >
            Filtrar
          </Button>
        </div>
      </div>
    </div>
  );
}
