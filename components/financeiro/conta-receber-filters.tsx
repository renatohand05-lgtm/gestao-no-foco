"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { gofControl } from "@/lib/design-system";
import { CONTA_RECEBER_STATUS_FILTER_OPTIONS } from "@/lib/financeiro/constants";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  currentStatus?: string;
  clientes: { id: string; nome: string }[];
  currentClienteId?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
};

export function ContaReceberFilters({
  tenantSlug,
  currentStatus = "all",
  clientes,
  currentClienteId = "",
  vencimentoDe = "",
  vencimentoAte = "",
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
          ? `/${tenantSlug}/financeiro/contas-receber?${queryString}`
          : `/${tenantSlug}/financeiro/contas-receber`,
      );
    });
  }

  return (
    <ExecutiveFilter label="Filtros">
      <ExecutiveFilterField label="Status" htmlFor="filter-status">
        <select
          id="filter-status"
          value={currentStatus}
          disabled={isPending}
          onChange={(event) =>
            updateParams({
              status: event.target.value === "all" ? null : event.target.value,
            })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          {CONTA_RECEBER_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Cliente" htmlFor="filter-cliente">
        <select
          id="filter-cliente"
          value={currentClienteId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ cliente: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        >
          <option value="">Todos os clientes</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </ExecutiveFilterField>

      <ExecutiveFilterField label="Vencimento de" htmlFor="filter-vencimento-de">
        <input
          id="filter-vencimento-de"
          type="date"
          value={vencimentoDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ vencimentoDe: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>

      <ExecutiveFilterField
        label="Vencimento até"
        htmlFor="filter-vencimento-ate"
      >
        <input
          id="filter-vencimento-ate"
          type="date"
          value={vencimentoAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ vencimentoAte: event.target.value || null })
          }
          className={cn(gofControl, "w-full min-w-36")}
        />
      </ExecutiveFilterField>
    </ExecutiveFilter>
  );
}
