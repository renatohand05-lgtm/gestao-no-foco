"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type {
  FluxoCaixaFilterOption,
  FluxoCaixaStatusFilter,
} from "@/types/fluxo-caixa";

type Props = {
  tenantSlug: string;
  contas: FluxoCaixaFilterOption[];
  categorias: FluxoCaixaFilterOption[];
  centrosCusto: FluxoCaixaFilterOption[];
  currentContaId?: string;
  currentCategoriaId?: string;
  currentCentroCustoId?: string;
  currentStatus?: FluxoCaixaStatusFilter;
  dataDe?: string;
  dataAte?: string;
};

export function FluxoCaixaFilters({
  tenantSlug,
  contas,
  categorias,
  centrosCusto,
  currentContaId = "",
  currentCategoriaId = "",
  currentCentroCustoId = "",
  currentStatus = "all",
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

    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/financeiro/fluxo-caixa?${queryString}`
          : `/${tenantSlug}/financeiro/fluxo-caixa`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1.5">
        <label
          htmlFor="filter-conta"
          className="text-xs font-medium text-muted-foreground"
        >
          Conta Bancária
        </label>
        <select
          id="filter-conta"
          value={currentContaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ conta: event.target.value || null })
          }
          className={selectClassName}
        >
          <option value="">Todas as contas</option>
          {contas.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-categoria"
          className="text-xs font-medium text-muted-foreground"
        >
          Categoria
        </label>
        <select
          id="filter-categoria"
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
          htmlFor="filter-centro-custo"
          className="text-xs font-medium text-muted-foreground"
        >
          Centro de Custo
        </label>
        <select
          id="filter-centro-custo"
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
          htmlFor="filter-status"
          className="text-xs font-medium text-muted-foreground"
        >
          Status
        </label>
        <select
          id="filter-status"
          value={currentStatus}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value;
            updateParams({
              status: value === "all" ? null : value,
            });
          }}
          className={selectClassName}
        >
          <option value="all">Todos</option>
          <option value="realizado">Realizado</option>
          <option value="previsto">Previsto</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-data-de"
          className="text-xs font-medium text-muted-foreground"
        >
          Período de
        </label>
        <input
          id="filter-data-de"
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
          htmlFor="filter-data-ate"
          className="text-xs font-medium text-muted-foreground"
        >
          Período até
        </label>
        <input
          id="filter-data-ate"
          type="date"
          value={dataAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataAte: event.target.value || null })
          }
          className={selectClassName}
        />
      </div>
    </div>
  );
}
