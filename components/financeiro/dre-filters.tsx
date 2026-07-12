"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { DreFilterOption } from "@/types/dre";

type Props = {
  tenantSlug: string;
  centrosCusto: DreFilterOption[];
  categorias: DreFilterOption[];
  planosConta: DreFilterOption[];
  currentCentroCustoId?: string;
  currentCategoriaId?: string;
  currentPlanoContaId?: string;
  dataDe?: string;
  dataAte?: string;
};

export function DreFilters({
  tenantSlug,
  centrosCusto,
  categorias,
  planosConta,
  currentCentroCustoId = "",
  currentCategoriaId = "",
  currentPlanoContaId = "",
  dataDe = "",
  dataAte = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectClassName =
    "flex h-9 w-full min-w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/financeiro/dre?${queryString}`
          : `/${tenantSlug}/financeiro/dre`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1.5">
        <label
          htmlFor="dre-data-de"
          className="text-xs font-medium text-muted-foreground"
        >
          Período de
        </label>
        <input
          id="dre-data-de"
          type="date"
          value={dataDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataDe: event.target.value || null })
          }
          className={selectClassName}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dre-data-ate"
          className="text-xs font-medium text-muted-foreground"
        >
          Período até
        </label>
        <input
          id="dre-data-ate"
          type="date"
          value={dataAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataAte: event.target.value || null })
          }
          className={selectClassName}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dre-centro-custo"
          className="text-xs font-medium text-muted-foreground"
        >
          Centro de Custo
        </label>
        <select
          id="dre-centro-custo"
          value={currentCentroCustoId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ centroCusto: event.target.value || null })
          }
          className={selectClassName}
        >
          <option value="">Todos os centros</option>
          {centrosCusto.map((centro) => (
            <option key={centro.id} value={centro.id}>
              {centro.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dre-categoria"
          className="text-xs font-medium text-muted-foreground"
        >
          Categoria financeira
        </label>
        <select
          id="dre-categoria"
          value={currentCategoriaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ categoria: event.target.value || null })
          }
          className={selectClassName}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dre-plano-conta"
          className="text-xs font-medium text-muted-foreground"
        >
          Plano de contas
        </label>
        <select
          id="dre-plano-conta"
          value={currentPlanoContaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ planoConta: event.target.value || null })
          }
          className={selectClassName}
        >
          <option value="">Todos os planos</option>
          {planosConta.map((plano) => (
            <option key={plano.id} value={plano.id}>
              {plano.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
