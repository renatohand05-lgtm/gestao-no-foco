"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { GFSelect } from "@/components/gf/gf-select";
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
  currentCustoZerado?: boolean;
  currentPrecoZerado?: boolean;
};

export function ProdutoFilters({
  tenantSlug,
  currentTipo = "all",
  currentAtivo = "all",
  currentCategoria = "",
  currentCustoZerado = false,
  currentPrecoZerado = false,
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
        <GFSelect
          id="filter-tipo"
          value={currentTipo}
          disabled={isPending}
          onValueChange={(value) => updateParams({ tipo: value })}
          aria-label="Tipo"
          triggerClassName="min-w-40"
          options={PRODUTO_TIPO_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-ativo" className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <GFSelect
          id="filter-ativo"
          value={currentAtivo}
          disabled={isPending}
          onValueChange={(value) => updateParams({ ativo: value })}
          aria-label="Status"
          triggerClassName="min-w-36"
          options={PRODUTO_STATUS_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
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

      {currentTipo === "servico" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={currentCustoZerado ? "default" : "outline"}
            disabled={isPending}
            onClick={() =>
              updateParams({
                custoZerado: currentCustoZerado ? null : "1",
              })
            }
          >
            Custo zerado
          </Button>
          <Button
            type="button"
            size="sm"
            variant={currentPrecoZerado ? "default" : "outline"}
            disabled={isPending}
            onClick={() =>
              updateParams({
                precoZerado: currentPrecoZerado ? null : "1",
              })
            }
          >
            Preço zerado
          </Button>
        </div>
      ) : null}
    </div>
  );
}
