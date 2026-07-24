"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Landmark,
  type LucideIcon,
} from "lucide-react";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  ExecutiveSkeleton,
  type ExecutiveBadgeTone,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import type {
  CashHealthStatus,
  ExecutiveFinancialCockpitData,
} from "@/lib/dashboard/executive-financial-cockpit-types";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  gofFocusRing,
  gofGrid,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveFinancialCockpitData;
  tenantSlug: string;
};

const HEALTH_UI: Record<
  CashHealthStatus,
  { tone: ExecutiveBadgeTone; bar: string }
> = {
  saudavel: {
    tone: "success",
    bar: "bg-success",
  },
  atencao: {
    tone: "warning",
    bar: "bg-warning",
  },
  critico: {
    tone: "danger",
    bar: "bg-danger",
  },
  indisponivel: {
    tone: "neutral",
    bar: "bg-muted-foreground/50",
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
    <div
      className={cn(
        "min-w-0 border border-border/40 bg-background/50 px-3.5 py-3",
        gofRadius.lg,
      )}
    >
      <p className={cn(gofTypography.caption, "uppercase tracking-wide")}>
        {label}
      </p>
      <div className="mt-1">
        <MoneyOrUnavailable value={value} />
      </div>
      {supporting ? (
        <p className={cn(gofTypography.caption, "mt-1")}>{supporting}</p>
      ) : null}
    </div>
  );
}

function DrillLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground",
        gofFocusRing,
      )}
    >
      {label}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/**
 * Cockpit Financeiro Executivo — Design System oficial (Gate 19.1).
 */
export function ExecutiveFinancialCockpit({ data, tenantSlug }: Props) {
  const health = HEALTH_UI[data.saude];
  const empty = data.status === "unavailable";
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showCriticalBanner = data.saude === "critico";

  return (
    <div data-dashboard-block="financial-cockpit" className={gofMotion.fade}>
      <div data-details-open={detailsOpen ? "true" : "false"}>
        <ExecutiveSection
          title="Cockpit Financeiro"
          description={
            data.notice ??
            "Saldo e projeção — detalhes financeiros sob demanda."
          }
          panel
          actions={
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center bg-muted/70 text-muted-foreground",
                  gofRadius.md,
                )}
              >
                <DsIcon icon={Landmark as LucideIcon} size="md" />
              </span>
              <span title={data.saudeReason}>
                <ExecutiveBadge tone={health.tone} variant="soft">
                  <span
                    className={cn("mr-1.5 size-1.5 rounded-full", health.bar)}
                    aria-hidden
                  />
                  {data.saudeLabel}
                </ExecutiveBadge>
              </span>
            </div>
          }
        >
          {empty ? (
            <ExecutiveEmptyState
              title="Dados indisponíveis"
              description="Não foi possível carregar o cockpit financeiro neste momento."
              className="py-6"
            />
          ) : (
            <div className="space-y-3">
              {showCriticalBanner ? (
                <p
                  className={cn(
                    "border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger",
                    gofRadius.md,
                  )}
                  role="status"
                >
                  {data.saudeReason}
                </p>
              ) : null}

              <div className={gofGrid.metrics}>
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
                <div
                  className={cn(
                    "min-w-0 border border-border/40 bg-background/50 px-3.5 py-3",
                    gofRadius.lg,
                  )}
                >
                  <p
                    className={cn(gofTypography.caption, "uppercase tracking-wide")}
                  >
                    Saúde do caixa
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    {data.saudeLabel}
                  </p>
                  <p className={cn(gofTypography.caption, "mt-1 line-clamp-2")}>
                    {data.saudeReason}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 w-full items-center justify-between gap-2 border border-border/60 bg-muted/30 px-3 text-left text-xs font-medium text-foreground hover:bg-muted/50 sm:w-auto",
                    gofRadius.md,
                    gofFocusRing,
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
                    <div className={gofGrid.metrics}>
                      <ExecutiveCard padding={12}>
                        <p
                          className={cn(
                            gofTypography.caption,
                            "uppercase tracking-wide",
                          )}
                        >
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
                          <p className={cn(gofTypography.caption, "mt-1")}>
                            Visão parcial — CR 30d sem janela nativa no resumo.
                          </p>
                        ) : null}
                      </ExecutiveCard>
                      <ExecutiveCard padding={12}>
                        <p
                          className={cn(
                            gofTypography.caption,
                            "uppercase tracking-wide",
                          )}
                        >
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
                      </ExecutiveCard>
                      <ExecutiveCard padding={12}>
                        <p
                          className={cn(
                            gofTypography.caption,
                            "uppercase tracking-wide",
                          )}
                        >
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
                      </ExecutiveCard>
                      <ExecutiveCard padding={12}>
                        <p
                          className={cn(
                            gofTypography.caption,
                            "uppercase tracking-wide",
                          )}
                        >
                          Maior compromisso (7 dias)
                        </p>
                        {data.maiorCompromisso7d ? (
                          <>
                            <p className="mt-1 truncate text-sm font-semibold tabular-nums">
                              {formatCurrency(data.maiorCompromisso7d.valor)}
                            </p>
                            <p
                              className={cn(
                                gofTypography.caption,
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
                              <p className={cn(gofTypography.caption, "mt-1")}>
                                Valor original do título.
                              </p>
                            ) : (
                              <p className={cn(gofTypography.caption, "mt-1")}>
                                Saldo pendente do título.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Sem lançamentos futuros
                          </p>
                        )}
                      </ExecutiveCard>
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
        </ExecutiveSection>
      </div>
    </div>
  );
}

export function ExecutiveFinancialCockpitSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Carregando cockpit financeiro"
    >
      <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
      <ExecutiveSkeleton heightClassName="h-28" widthClassName="w-full" />
    </div>
  );
}
