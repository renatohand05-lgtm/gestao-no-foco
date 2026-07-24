"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { gofControl } from "@/lib/design-system";
import { cn } from "@/lib/utils";
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
    <ExecutiveFilter label="Filtros">
      <ExecutiveFilterField label="Período de" htmlFor="dre-data-de">
        <input
          id="dre-data-de"
          type="date"
          value={dataDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataDe: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Período até" htmlFor="dre-data-ate">
        <input
          id="dre-data-ate"
          type="date"
          value={dataAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataAte: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Centro de Custo" htmlFor="dre-centro-custo">
        <select
          id="dre-centro-custo"
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

      <ExecutiveFilterField
        label="Categoria financeira"
        htmlFor="dre-categoria"
      >
        <select
          id="dre-categoria"
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

      <ExecutiveFilterField label="Plano de contas" htmlFor="dre-plano-conta">
        <select
          id="dre-plano-conta"
          value={currentPlanoContaId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ planoConta: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="">Todos os planos</option>
          {planosConta.map((plano) => (
            <option key={plano.id} value={plano.id}>
              {plano.nome}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
