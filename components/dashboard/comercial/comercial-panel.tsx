"use client";

import { ComercialChannelSection } from "@/components/dashboard/comercial/comercial-channel-section";
import { ComercialCentersTable } from "@/components/dashboard/comercial/comercial-centers-table";
import { ComercialDailyEvolution } from "@/components/dashboard/comercial/comercial-daily-evolution";
import { ComercialDailyTarget } from "@/components/dashboard/comercial/comercial-daily-target";
import { ComercialExportActions } from "@/components/dashboard/comercial/comercial-export-actions";
import { ComercialHeatmap } from "@/components/dashboard/comercial/comercial-heatmap";
import { ComercialInsights } from "@/components/dashboard/comercial/comercial-insights";
import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import { ComercialPerformanceSummary } from "@/components/dashboard/comercial/comercial-performance-summary";
import { ComercialRankings } from "@/components/dashboard/comercial/comercial-rankings";
import { ComercialSectionBoundary } from "@/components/dashboard/comercial/comercial-section-boundary";
import {
  ComercialStatusBadge,
  mapComercialStatusPresentation,
} from "@/components/dashboard/comercial/comercial-status-badge";
import { ComercialTicketSummary } from "@/components/dashboard/comercial/comercial-ticket-summary";
import {
  ExecutiveCard,
  ExecutiveGauge,
  ExecutiveHero,
  ExecutiveMetric,
  ExecutiveProgress,
} from "@/components/executive";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import { exAnimations, exSpacing, exStack, exTypography } from "@/lib/design-system";
import { META_STATUS_LABEL } from "@/lib/metas/projection";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  tenantName: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
};

export function ComercialPanel({
  tenantSlug,
  tenantName,
  data,
  filters,
}: Props) {
  const p = data.projecao;
  const metaHref = p.meta
    ? `/${tenantSlug}/configuracoes/metas/${p.meta.id}/editar`
    : `/${tenantSlug}/configuracoes/metas/nova?competencia=${data.competencia.slice(0, 7)}`;

  const progressValue =
    p.status === "sem_meta" ? 0 : (p.percentual_atingido ?? 0);
  const { tone: progressTone, label: badgeLabel } =
    mapComercialStatusPresentation(p.status);

  const subtitle = `Competência ${data.competencia.slice(0, 7)}${
    data.centro_custo_id ? " · centro filtrado" : " · visão geral"
  }`;

  const projPrincipal = p.projecao_dias_uteis;

  return (
    <section className={exStack[24]} aria-label="Painel comercial executivo">
      <ExecutiveHero
        eyebrow="Comercial"
        title="Painel Comercial"
        subtitle={subtitle}
        actions={
          <ComercialSectionBoundary label="Exportações">
            <ComercialExportActions data={data} tenantName={tenantName} />
          </ComercialSectionBoundary>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-5">
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
                exSpacing[16],
              )}
            >
              <ExecutiveMetric
                size="primary"
                icon={COMERCIAL_METRIC_ICONS.meta}
                label="Meta do mês"
                value={
                  p.valor_meta === null ? "—" : formatCurrency(p.valor_meta)
                }
              />
              <ExecutiveMetric
                size="primary"
                icon={COMERCIAL_METRIC_ICONS.realizado}
                label="Realizado"
                value={formatCurrency(p.faturamento_realizado)}
                tone="primary"
              />
              <ExecutiveMetric
                size="primary"
                icon={COMERCIAL_METRIC_ICONS.gap}
                label="Restante"
                value={
                  p.restante_meta === null ? "—" : formatCurrency(p.restante_meta)
                }
                tone={
                  p.restante_meta !== null && p.restante_meta > 0
                    ? "warning"
                    : "success"
                }
              />
              <ExecutiveMetric
                size="primary"
                icon={COMERCIAL_METRIC_ICONS.projecao}
                label="Projeção (úteis)"
                value={formatCurrency(projPrincipal)}
                hint={META_STATUS_LABEL[p.status]}
              />
            </div>

            <ExecutiveProgress
              value={progressValue}
              label="Atingimento da meta"
              tone={progressTone}
              detail={
                p.valor_meta === null
                  ? "Cadastre uma meta para acompanhar o atingimento."
                  : `Realizado ${formatCurrency(p.faturamento_realizado)} de ${formatCurrency(p.valor_meta)}${
                      p.percentual_atingido !== null
                        ? ` · ${formatPercent(p.percentual_atingido)}`
                        : ""
                    }`
              }
            />
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row lg:flex-col">
            <ExecutiveGauge
              value={progressValue}
              label="Atingimento"
              statusLabel={badgeLabel}
              tone={progressTone}
              size={140}
            />
            <ComercialStatusBadge status={p.status} />
          </div>
        </div>
      </ExecutiveHero>

      <div className={exStack[24]}>
        <ComercialSectionBoundary label="Performance Comercial">
          <ComercialPerformanceSummary
            tenantSlug={tenantSlug}
            data={data}
            filters={filters}
            metaHref={metaHref}
          />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Meta diária">
          <ComercialDailyTarget data={data} />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Ticket médio">
          <ComercialTicketSummary
            tenantSlug={tenantSlug}
            data={data}
            filters={filters}
          />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Insights">
          <ComercialInsights data={data} />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Evolução diária">
          <ComercialDailyEvolution tenantSlug={tenantSlug} data={data} />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Heatmap">
          <ComercialHeatmap tenantSlug={tenantSlug} data={data} />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Rankings">
          <ComercialRankings
            tenantSlug={tenantSlug}
            data={data}
            filters={filters}
          />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Centros de custo">
          <ComercialCentersTable
            tenantSlug={tenantSlug}
            data={data}
            filters={filters}
          />
        </ComercialSectionBoundary>

        <ComercialSectionBoundary label="Canais">
          <ComercialChannelSection data={data} />
        </ComercialSectionBoundary>

        <ExecutiveCard padding={16} className={exAnimations.fade}>
          <details>
            <summary
              className={cn(
                "cursor-pointer",
                exTypography.label,
                exAnimations.focusRing,
              )}
            >
              Critérios e limitações
            </summary>
            <ul
              className={cn(
                "mt-2 list-disc space-y-1 pl-5",
                exTypography.caption,
              )}
            >
              <li>{data.probabilidade_motivo}</li>
              <li>{data.confianca_motivo}</li>
              <li>{data.meta_diaria_regra}</li>
              <li>{p.observacao_feriados}</li>
              <li>
                Serviços no ranking abrem o detalhe em Produtos & Serviços
                (`/produtos/[id]`), módulo compartilhado do catálogo.
              </li>
            </ul>
          </details>
        </ExecutiveCard>
      </div>
    </section>
  );
}
