"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { GFSelect } from "@/components/gf/gf-select";
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
        <GFSelect
          id="dre-centro-custo"
          value={currentCentroCustoId || undefined}
          disabled={isPending}
          onValueChange={(value) =>
            updateParams({ centroCusto: value || null })
          }
          placeholder="Todos os centros"
          aria-label="Centro de Custo"
          triggerClassName="min-w-36"
          options={centrosCusto.map((centro) => ({
            value: centro.id,
            label: centro.nome,
          }))}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField
        label="Categoria financeira"
        htmlFor="dre-categoria"
      >
        <GFSelect
          id="dre-categoria"
          value={currentCategoriaId || undefined}
          disabled={isPending}
          onValueChange={(value) =>
            updateParams({ categoria: value || null })
          }
          placeholder="Todas as categorias"
          aria-label="Categoria financeira"
          triggerClassName="min-w-36"
          options={categorias.map((categoria) => ({
            value: categoria.id,
            label: categoria.nome,
          }))}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Plano de contas" htmlFor="dre-plano-conta">
        <GFSelect
          id="dre-plano-conta"
          value={currentPlanoContaId || undefined}
          disabled={isPending}
          onValueChange={(value) =>
            updateParams({ planoConta: value || null })
          }
          placeholder="Todos os planos"
          aria-label="Plano de contas"
          triggerClassName="min-w-36"
          options={planosConta.map((plano) => ({
            value: plano.id,
            label: plano.nome,
          }))}
        />
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
