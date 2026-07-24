"use client";

import Link from "next/link";
import { useState } from "react";

import { OsCentralEmptyState } from "@/components/ordens/os-central-state";
import { OsLifecycleMenu } from "@/components/ordens/os-lifecycle-menu";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  formatTempoDesdeAbertura,
  prioridadeLabel,
  type OsCentralRow,
  type OsSlaTone,
} from "@/lib/ordens/os-central-compose";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  rows: OsCentralRow[];
  hasFilters?: boolean;
  canCancel?: boolean;
  canArquivar?: boolean;
  canExcluirRascunho?: boolean;
  canRestaurar?: boolean;
};

const SLA_UI: Record<OsSlaTone, string> = {
  ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  hoje: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  atrasada: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  sem_previsao: "bg-muted text-muted-foreground",
  terminal:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
};

function formatPrevisao(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 16).replace("T", " ");
}

export function OsCentralTable({
  tenantSlug,
  rows,
  hasFilters = false,
  canCancel = false,
  canArquivar = false,
  canExcluirRascunho = false,
  canRestaurar = false,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <OsCentralEmptyState tenantSlug={tenantSlug} hasFilters={hasFilters} />
    );
  }

  return (
    <div data-os-block="central-lista">
      {/* Mobile / tablet cards */}
      <ul className="space-y-3 lg:hidden" aria-label="Lista de ordens de serviço">
        {rows.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-xl border bg-card p-3.5",
              item.atrasada && "border-rose-400/50",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/${tenantSlug}/ordens/${item.id}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                #{item.numero}
              </Link>
              <span
                className={cn(
                  "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  SLA_UI[item.slaTone],
                )}
              >
                {item.slaLabel}
              </span>
            </div>
            <p className="mt-1 truncate text-sm">{item.cliente_nome ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {[item.placa, item.modelo].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge
                label={
                  OS_STATUS_LABELS[item.status as OsStatus] ?? item.status
                }
              />
              <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                {prioridadeLabel(item.prioridade)}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className="truncate font-medium">
                  {item.responsavel.nome}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(item.valor_total)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prevista</dt>
                <dd className="tabular-nums">
                  {formatPrevisao(item.previsao_entrega)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tempo desde abertura</dt>
                <dd className="tabular-nums">
                  {formatTempoDesdeAbertura(item.tempoDesdeAberturaHoras)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/${tenantSlug}/ordens/${item.id}`}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                )}
              >
                Abrir
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                  )}
                  aria-label={`Ações da OS #${item.numero}`}
                  aria-expanded={openMenuId === item.id}
                  onClick={() =>
                    setOpenMenuId(openMenuId === item.id ? null : item.id)
                  }
                >
                  ⋯
                </button>
                {openMenuId === item.id ? (
                  <div className="absolute left-0 z-10 mt-1 min-w-[200px] rounded-md border bg-background p-2 shadow-md">
                    <OsLifecycleMenu
                      tenantSlug={tenantSlug}
                      osId={item.id}
                      numero={item.numero}
                      clienteNome={item.cliente_nome}
                      placa={item.placa}
                      modelo={item.modelo}
                      status={item.status}
                      vendaId={item.venda_id}
                      arquivadoEm={item.arquivado_em}
                      canCancel={canCancel}
                      canArquivar={canArquivar}
                      canExcluirRascunho={canExcluirRascunho}
                      canRestaurar={canRestaurar}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">
            Lista operacional de ordens de serviço
          </caption>
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border/70">
              <th scope="col" className="py-2 pr-3 font-medium">
                Nº
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Cliente
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Veículo
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Responsável
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Status
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Prioridade
              </th>
              <th scope="col" className="py-2 pr-3 font-medium text-right">
                Valor
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Prevista
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Tempo desde abertura
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                SLA
              </th>
              <th scope="col" className="py-2 font-medium">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-border/40 align-top",
                  item.atrasada && "bg-rose-50/40 dark:bg-rose-950/10",
                )}
              >
                <td className="py-2.5 pr-3">
                  <Link
                    href={`/${tenantSlug}/ordens/${item.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    #{item.numero}
                  </Link>
                </td>
                <td className="max-w-[10rem] truncate py-2.5 pr-3">
                  {item.cliente_nome ?? "—"}
                </td>
                <td className="py-2.5 pr-3">
                  <div>{item.placa ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.modelo ?? ""}
                  </div>
                </td>
                <td className="max-w-[9rem] truncate py-2.5 pr-3 text-xs">
                  {item.responsavel.nome}
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge
                    label={
                      OS_STATUS_LABELS[item.status as OsStatus] ?? item.status
                    }
                  />
                  {item.arquivado_em ? (
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      Arquivada
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {prioridadeLabel(item.prioridade)}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                  {formatCurrency(item.valor_total)}
                </td>
                <td className="py-2.5 pr-3 text-xs tabular-nums">
                  {formatPrevisao(item.previsao_entrega)}
                </td>
                <td className="py-2.5 pr-3 text-xs tabular-nums">
                  {formatTempoDesdeAbertura(item.tempoDesdeAberturaHoras)}
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                      SLA_UI[item.slaTone],
                    )}
                  >
                    {item.slaLabel}
                  </span>
                </td>
                <td className="py-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                      aria-label={`Ações da OS #${item.numero}`}
                      aria-expanded={openMenuId === item.id}
                      onClick={() =>
                        setOpenMenuId(openMenuId === item.id ? null : item.id)
                      }
                    >
                      ⋯
                    </button>
                    {openMenuId === item.id ? (
                      <div className="absolute right-0 z-10 mt-1 min-w-[200px] rounded-md border bg-background p-2 shadow-md">
                        <Link
                          href={`/${tenantSlug}/ordens/${item.id}`}
                          className="mb-2 block text-sm underline"
                        >
                          Abrir detalhe
                        </Link>
                        <OsLifecycleMenu
                          tenantSlug={tenantSlug}
                          osId={item.id}
                          numero={item.numero}
                          clienteNome={item.cliente_nome}
                          placa={item.placa}
                          modelo={item.modelo}
                          status={item.status}
                          vendaId={item.venda_id}
                          arquivadoEm={item.arquivado_em}
                          canCancel={canCancel}
                          canArquivar={canArquivar}
                          canExcluirRascunho={canExcluirRascunho}
                          canRestaurar={canRestaurar}
                          compact
                        />
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
