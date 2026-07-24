"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { gofControl } from "@/lib/design-system";
import { cn } from "@/lib/utils";
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
    <ExecutiveFilter label="Filtros">
      <ExecutiveFilterField label="Conta Bancária" htmlFor="filter-conta">
        <select
          id="filter-conta"
          value={currentContaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ conta: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="">Todas as contas</option>
          {contas.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.nome}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Categoria" htmlFor="filter-categoria">
        <select
          id="filter-categoria"
          value={currentCategoriaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ categoria: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField
        label="Centro de Custo"
        htmlFor="filter-centro-custo"
      >
        <select
          id="filter-centro-custo"
          value={currentCentroCustoId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ centroCusto: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="">Todos os centros</option>
          {centrosCusto.map((centro) => (
            <option key={centro.id} value={centro.id}>
              {centro.nome}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Status" htmlFor="filter-status">
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
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="all">Todos</option>
          <option value="realizado">Realizado</option>
          <option value="previsto">Previsto</option>
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Período de" htmlFor="filter-data-de">
        <input
          id="filter-data-de"
          type="date"
          value={dataDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataDe: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Período até" htmlFor="filter-data-ate">
        <input
          id="filter-data-ate"
          type="date"
          value={dataAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataAte: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
