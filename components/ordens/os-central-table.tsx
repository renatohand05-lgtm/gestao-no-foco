"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ExecutiveBadge,
  type ExecutiveBadgeTone,
} from "@/components/executive";
import { OsCentralEmptyState } from "@/components/ordens/os-central-state";
import { OsLifecycleMenu } from "@/components/ordens/os-lifecycle-menu";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { gofCardSurface } from "@/lib/design-system/primitives";
import { formatCurrency } from "@/lib/format";
import {
  formatTempoDesdeAbertura,
  prioridadeLabel,
  type OsCentralRow,
  type OsSlaTone,
} from "@/lib/ordens/os-central-compose";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import { labelWorkOrderStatus } from "@/lib/segments/copy.ts";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  rows: OsCentralRow[];
  hasFilters?: boolean;
  canCancel?: boolean;
  canArquivar?: boolean;
  canExcluirRascunho?: boolean;
  canRestaurar?: boolean;
  copy?: {
    workOrder: string;
    workOrders: string;
    newWorkOrder: string;
    emptyWorkOrdersTitle: string;
    emptyWorkOrdersBody: string;
    showVehicles?: boolean;
    vehicleLabel?: string;
    statusLabels?: Record<string, string>;
  };
};

const SLA_TONE: Record<OsSlaTone, ExecutiveBadgeTone> = {
  ok: "success",
  hoje: "info",
  atrasada: "danger",
  sem_previsao: "neutral",
  terminal: "neutral",
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
  copy,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const showVehicles = copy?.showVehicles !== false;
  const statusOf = (status: string) =>
    copy?.statusLabels
      ? labelWorkOrderStatus(status, { statusLabels: copy.statusLabels })
      : (OS_STATUS_LABELS[status as OsStatus] ?? status);

  if (rows.length === 0) {
    return (
      <OsCentralEmptyState
        tenantSlug={tenantSlug}
        hasFilters={hasFilters}
        copy={copy}
      />
    );
  }

  return (
    <div data-os-block="central-lista">
      <ul className="space-y-3 lg:hidden" aria-label={copy?.workOrders ?? "Lista de ordens de serviço"}>
        {rows.map((item) => (
          <li
            key={item.id}
            className={cn(
              gofCardSurface,
              "p-3.5",
              item.atrasada && "ring-1 ring-[var(--brand-danger)]/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/${tenantSlug}/ordens/${item.id}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                #{item.numero}
              </Link>
              <ExecutiveBadge tone={SLA_TONE[item.slaTone]} variant="soft">
                {item.slaLabel}
              </ExecutiveBadge>
            </div>
            <p className="mt-1 truncate text-sm">{item.cliente_nome ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {showVehicles
                ? [item.placa, item.modelo].filter(Boolean).join(" · ") || "—"
                : item.responsavel.nome}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge label={statusOf(item.status)} />
              <ExecutiveBadge tone="neutral" variant="soft">
                {prioridadeLabel(item.prioridade)}
              </ExecutiveBadge>
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
                  aria-label={`Ações do ${copy?.workOrder ?? "registro"} #${item.numero}`}
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

      <div className={cn(gofCardSurface, "hidden overflow-hidden p-0 lg:block")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Lista operacional de {copy?.workOrders ?? "ordens de serviço"}
            </caption>
            <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/80 text-xs text-muted-foreground backdrop-blur-sm">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Nº
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Cliente
                </th>
                  {showVehicles ? (
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {copy?.vehicleLabel ?? "Veículo"}
                </th>
                  ) : null}
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Responsável
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Prioridade
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Valor
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Prevista
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Tempo desde abertura
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  SLA
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/40 align-top last:border-0",
                    "motion-safe:transition-colors motion-safe:duration-150 hover:bg-muted/30",
                    item.atrasada && "bg-[var(--brand-danger)]/[0.04]",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/${tenantSlug}/ordens/${item.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      #{item.numero}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5">
                    {item.cliente_nome ?? "—"}
                  </td>
                  {showVehicles ? (
                  <td className="px-3 py-2.5">
                    <div>{item.placa ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.modelo ?? ""}
                    </div>
                  </td>
                  ) : null}
                  <td className="max-w-[9rem] truncate px-3 py-2.5 text-xs">
                    {item.responsavel.nome}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge label={statusOf(item.status)} />
                    {item.arquivado_em ? (
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        Arquivada
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {prioridadeLabel(item.prioridade)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                    {formatCurrency(item.valor_total)}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {formatPrevisao(item.previsao_entrega)}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {formatTempoDesdeAbertura(item.tempoDesdeAberturaHoras)}
                  </td>
                  <td className="px-3 py-2.5">
                    <ExecutiveBadge tone={SLA_TONE[item.slaTone]} variant="soft">
                      {item.slaLabel}
                    </ExecutiveBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative">
                      <button
                        type="button"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                        aria-label={`Ações do ${copy?.workOrder ?? "registro"} #${item.numero}`}
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
    </div>
  );
}
