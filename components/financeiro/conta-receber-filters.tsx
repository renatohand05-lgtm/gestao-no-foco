"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CONTA_RECEBER_STATUS_FILTER_OPTIONS } from "@/lib/financeiro/constants";

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
          ? `/${tenantSlug}/financeiro/contas-receber?${queryString}`
          : `/${tenantSlug}/financeiro/contas-receber`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
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
          onChange={(event) =>
            updateParams({
              status: event.target.value === "all" ? null : event.target.value,
            })
          }
          className={selectClassName}
        >
          {CONTA_RECEBER_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-cliente"
          className="text-xs font-medium text-muted-foreground"
        >
          Cliente
        </label>
        <select
          id="filter-cliente"
          value={currentClienteId}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ cliente: event.target.value || null })
          }
          className={selectClassName}
        >
          <option value="">Todos os clientes</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-vencimento-de"
          className="text-xs font-medium text-muted-foreground"
        >
          Vencimento de
        </label>
        <input
          id="filter-vencimento-de"
          type="date"
          value={vencimentoDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ vencimentoDe: event.target.value || null })
          }
          className={selectClassName}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="filter-vencimento-ate"
          className="text-xs font-medium text-muted-foreground"
        >
          Vencimento até
        </label>
        <input
          id="filter-vencimento-ate"
          type="date"
          value={vencimentoAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ vencimentoAte: event.target.value || null })
          }
          className={selectClassName}
        />
      </div>
    </div>
  );
}
