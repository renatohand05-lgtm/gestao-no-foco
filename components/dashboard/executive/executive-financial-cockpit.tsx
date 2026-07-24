"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Landmark,
  type LucideIcon,
} from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { EXECUTIVE_BLOCK } from "@/lib/dashboard/executive-ui";
import type {
  CashHealthStatus,
  ExecutiveFinancialCockpitData,
} from "@/lib/dashboard/executive-financial-cockpit-types";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveFinancialCockpitData;
  tenantSlug: string;
};

const HEALTH_UI: Record<
  CashHealthStatus,
  { badge: string; bar: string }
> = {
  saudavel: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  atencao: {
    badge:
      "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
    bar: "bg-orange-500",
  },
  critico: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  indisponivel: {
    badge: "bg-muted text-muted-foreground",
    bar: "bg-slate-400",
  },
};

function MoneyOrUnavailable({
  value,
}: {
  value: number | null;
}) {
  if (value == null || Number.isNaN(value)) {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        Dados indisponíveis
      </span>
    );
  }
  return (
    <span className="text-lg font-semibold tracking-tight tabular-nums text-foreground sm:text-xl">
      {formatCurrency(value)}
    </span>
  );
}

function KpiCell({
  label,
  value,
  supporting,
}: {
  label: string;
  value: number | null;
  supporting?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/40 bg-background/50 px-3.5 py-3">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1">
        <MoneyOrUnavailable value={value} />
      </div>
      {supporting ? (
        <p className={cn(exTypography.caption, "mt-1")}>{supporting}</p>
      ) : null}
    </div>
  );
}

function DrillLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:text-foreground dark:text-slate-300",
        exAnimations.focusRing,
      )}
    >
      {label}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/**
 * Cockpit Financeiro Executivo (Gate 17.2.1) — visão resumida + detalhes expansíveis.
 */
export function ExecutiveFinancialCockpit({ data, tenantSlug }: Props) {
  const health = HEALTH_UI[data.saude];
  const empty = data.status === "unavailable";
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showCriticalBanner = data.saude === "critico";

  return (
    <section
      className={cn(
        EXECUTIVE_BLOCK.section,
        exRadius[16],
        exShadow.card,
        exAnimations.fade,
      )}
      aria-labelledby="cockpit-financeiro-titulo"
      data-dashboard-block="financial-cockpit"
      data-details-open={detailsOpen ? "true" : "false"}
    >
      <div className={EXECUTIVE_BLOCK.header}>
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
            <DsIcon icon={Landmark as LucideIcon} size="md" />
          </span>
          <div className="min-w-0">
            <h2 id="cockpit-financeiro-titulo" className={EXECUTIVE_BLOCK.title}>
              Cockpit Financeiro
            </h2>
            <p className={cn(exTypography.caption, "mt-0.5")}>
              {data.notice ??
                "Saldo e projeção — detalhes financeiros sob demanda."}
            </p>
          </div>
        </div>
        <span
          className={cn(EXECUTIVE_BLOCK.badge, health.badge)}
          title={data.saudeReason}
        >
          <span
            className={cn("size-1.5 rounded-full", health.bar)}
            aria-hidden
          />
          {data.saudeLabel}
        </span>
      </div>

      {empty ? (
        <div className="px-5 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground" role="status">
            Dados indisponíveis
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          {showCriticalBanner ? (
            <p
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              role="status"
            >
              {data.saudeReason}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCell label="Saldo atual" value={data.saldoAtual} />
            <KpiCell
              label="Caixa em 7 dias"
              value={data.dias7.saldoProjetado}
              supporting={
                data.dias7.saldoProjetado == null
                  ? undefined
                  : "Saldo projetado (fluxo)"
              }
            />
            <KpiCell
              label="Caixa em 30 dias"
              value={data.dias30.saldoProjetado}
              supporting={
                data.dias30.saldoProjetado == null
                  ? undefined
                  : data.receber30dVisaoParcial
                    ? "Visão parcial (fluxo)"
                    : "Saldo projetado (fluxo)"
              }
            />
            <div className="min-w-0 rounded-xl border border-border/40 bg-background/50 px-3.5 py-3">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Saúde do caixa
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                {data.saudeLabel}
              </p>
              <p className={cn(exTypography.caption, "mt-1 line-clamp-2")}>
                {data.saudeReason}
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              className={cn(
                "inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 text-left text-xs font-medium text-foreground hover:bg-muted/50 sm:w-auto",
                exAnimations.focusRing,
              )}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((v) => !v)}
            >
              {detailsOpen
                ? "Ocultar detalhes financeiros"
                : "Ver detalhes financeiros"}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  detailsOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {detailsOpen ? (
              <div
                id={detailsId}
                className="mt-3 space-y-3"
                data-cockpit-details="open"
              >
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/40 px-3.5 py-3">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Entradas 7 / 30 dias
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {data.dias7.entradasPrevistas != null
                        ? formatCurrency(data.dias7.entradasPrevistas)
                        : "Dados indisponíveis"}
                      <span className="mx-1 text-muted-foreground">/</span>
                      {data.dias30.entradasPrevistas != null
                        ? formatCurrency(data.dias30.entradasPrevistas)
                        : "Dados indisponíveis"}
                    </p>
                    {data.receber30dVisaoParcial ? (
                      <p className={cn(exTypography.caption, "mt-1")}>
                        Visão parcial — CR 30d sem janela nativa no resumo.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-border/40 px-3.5 py-3">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Saídas 7 / 30 dias
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {data.dias7.saidasPrevistas != null
                        ? formatCurrency(data.dias7.saidasPrevistas)
                        : "Dados indisponíveis"}
                      <span className="mx-1 text-muted-foreground">/</span>
                      {data.dias30.saidasPrevistas != null
                        ? formatCurrency(data.dias30.saidasPrevistas)
                        : "Dados indisponíveis"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/40 px-3.5 py-3">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Contas vencidas
                    </p>
                    {data.vencidas ? (
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        Pagar {data.vencidas.pagarQtd} ·{" "}
                        {formatCurrency(data.vencidas.pagarValor)}
                        <br />
                        <span className="text-xs font-medium text-muted-foreground">
                          Receber {data.vencidas.receberQtd} ·{" "}
                          {formatCurrency(data.vencidas.receberValor)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Dados indisponíveis
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border/40 px-3.5 py-3">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Maior compromisso (7 dias)
                    </p>
                    {data.maiorCompromisso7d ? (
                      <>
                        <p className="mt-1 truncate text-sm font-semibold tabular-nums">
                          {formatCurrency(data.maiorCompromisso7d.valor)}
                        </p>
                        <p
                          className={cn(
                            exTypography.caption,
                            "mt-0.5 line-clamp-2",
                          )}
                        >
                          {data.maiorCompromisso7d.fornecedorNome
                            ? `${data.maiorCompromisso7d.fornecedorNome} · `
                            : ""}
                          {data.maiorCompromisso7d.descricao}
                          {" · "}
                          {data.maiorCompromisso7d.dataVencimento}
                        </p>
                        {data.maiorCompromisso7d.valorSource ===
                        "valor_original" ? (
                          <p className={cn(exTypography.caption, "mt-1")}>
                            Valor original do título.
                          </p>
                        ) : (
                          <p className={cn(exTypography.caption, "mt-1")}>
                            Saldo pendente do título.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sem lançamentos futuros
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 pt-3">
                  <DrillLink
                    href={`/${tenantSlug}/financeiro/fluxo-caixa`}
                    label="Abrir fluxo de caixa"
                  />
                  <DrillLink
                    href={`/${tenantSlug}/financeiro/contas-pagar`}
                    label="Ver contas a pagar"
                  />
                  <DrillLink
                    href={`/${tenantSlug}/financeiro/contas-receber`}
                    label="Ver contas a receber"
                  />
                  <DrillLink
                    href={`/${tenantSlug}/financeiro/contas-pagar?status=vencido`}
                    label="Ver contas vencidas"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <DrillLink
                  href={`/${tenantSlug}/financeiro/fluxo-caixa`}
                  label="Abrir fluxo de caixa"
                />
                {data.saude === "critico" || data.saude === "atencao" ? (
                  <DrillLink
                    href={`/${tenantSlug}/financeiro/contas-pagar?status=vencido`}
                    label="Ver contas vencidas"
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function ExecutiveFinancialCockpitSkeleton() {
  return (
    <div
      className={cn(
        "h-40 border border-border/50 bg-card",
        exRadius[16],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando cockpit financeiro"
    />
  );
}
