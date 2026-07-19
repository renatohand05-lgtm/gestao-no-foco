import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import { buildDashboardDrillDownHref } from "@/lib/dashboard/drill-down";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exShadow,
  exSize,
  exStack,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import type { ExColorTone } from "@/lib/design-system/colors";
import { cn } from "@/lib/utils";
import {
  CONFIANCA_LABEL,
  type CommercialPanelData,
} from "@/types/commercial-panel";
import type {
  DashboardFilters,
  DashboardKpiComparison,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { ComercialMetricIconKey } from "@/components/dashboard/comercial/comercial-metric-icons";
import type { BusinessKpiExplanation } from "@/lib/business-intelligence";

type Props = {
  tenantSlug: string;
  primary: DashboardPrimaryData;
  panel: CommercialPanelData;
  kpiExplanations?: BusinessKpiExplanation[];
};

function hint(
  explanations: BusinessKpiExplanation[] | undefined,
  key: string,
): string | undefined {
  return explanations?.find((e) => e.key === key)?.tooltip;
}

function explanationOf(
  explanations: BusinessKpiExplanation[] | undefined,
  key: string,
): BusinessKpiExplanation | undefined {
  return explanations?.find((e) => e.key === key);
}

function TrendBadge({ comparison }: { comparison: DashboardKpiComparison }) {
  if (comparison.variationPct === null) return null;
  const tone: ExColorTone =
    comparison.trend === "up"
      ? "success"
      : comparison.trend === "down"
        ? "danger"
        : "info";
  const Icon =
    comparison.trend === "up"
      ? ArrowUpRight
      : comparison.trend === "down"
        ? ArrowDownRight
        : ArrowRight;
  return (
    <ExecutiveBadge
      tone={tone}
      className="h-6 px-2 py-0 font-medium normal-case tracking-normal"
    >
      <span className={cn("inline-flex items-center gap-0.5", exTypography.micro)}>
        <DsIcon icon={Icon} size="xs" />
        {formatPercent(comparison.variationPct)}
      </span>
    </ExecutiveBadge>
  );
}

function Sparkline({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 20"
      className="h-5 w-full max-w-[4rem] opacity-40"
      aria-hidden
    >
      <path
        d="M1 14 C14 13, 22 6, 34 10 S52 16, 62 7 S74 4, 79 6"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={up === false ? "stroke-red-500/50" : "stroke-slate-400"}
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  hintText,
  detailText,
  href,
  icon,
  size = "secondary",
  tone = "neutral",
  comparison,
  staggerIndex = 0,
  sparkline,
}: {
  label: string;
  value: string;
  hintText?: string;
  detailText?: string;
  href?: string;
  icon: ComercialMetricIconKey;
  size?: "primary" | "secondary";
  tone?: ExColorTone;
  comparison?: DashboardKpiComparison;
  staggerIndex?: number;
  sparkline?: boolean;
}) {
  const Icon: LucideIcon = COMERCIAL_METRIC_ICONS[icon];
  const contextLine = hintText ?? detailText;
  const body = (
    <ExecutiveCard
      padding={size === "primary" ? 24 : 20}
      priority="info"
      className={cn(
        "group flex h-full flex-col",
        size === "primary" && exSize.kpiPrimary,
        size === "secondary" && exSize.kpiSecondary,
        exAnimations.fade,
        href &&
          cn(exAnimations.hoverLift, exAnimations.hoverScale, exShadow.cardHover),
      )}
      style={{ animationDelay: exStagger(staggerIndex) } as CSSProperties}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                tone === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10"
                  : "bg-slate-100/90 text-slate-500 dark:bg-white/5",
              )}
            >
              <DsIcon icon={Icon} size="sm" />
            </span>
            <p className={exTypography.label}>{label}</p>
          </div>
          {comparison ? <TrendBadge comparison={comparison} /> : null}
        </div>
        <div className="min-w-0 space-y-2">
          <p
            className={cn(
              size === "primary"
                ? exTypography.metricLg
                : exTypography.kpiSecondary,
              "truncate",
            )}
            title={value}
          >
            {value}
          </p>
          {contextLine ? (
            <p
              className={cn("line-clamp-2", exTypography.caption)}
              title={detailText ?? hintText}
            >
              {contextLine}
            </p>
          ) : null}
          {sparkline ? (
            <Sparkline up={comparison?.trend !== "down"} />
          ) : null}
        </div>
      </div>
    </ExecutiveCard>
  );
  if (!href) return body;
  return (
    <Link href={href} className={cn("block h-full", exAnimations.focusRing)}>
      {body}
    </Link>
  );
}

/**
 * KPIs premium — números protagonistas (Sprint 13.0).
 * Primários: Receita · Meta · Gap · Projeção · Atingimento
 * Secundários: Ticket · Vendas · Clientes · Ritmo · Confiança
 */
export function ExecutiveKpiGrid({
  tenantSlug,
  primary,
  panel,
  kpiExplanations,
}: Props) {
  const p = panel.projecao;
  const filters: DashboardFilters = primary.filters;
  const vendasHref = buildDashboardDrillDownHref(tenantSlug, "vendas", filters);
  const dreHref = buildDashboardDrillDownHref(tenantSlug, "dre", filters);
  const metaHref = p.meta
    ? `/${tenantSlug}/configuracoes/metas/${p.meta.id}/editar`
    : `/${tenantSlug}/configuracoes/metas/nova?competencia=${panel.competencia.slice(0, 7)}`;
  const ritmo =
    p.ritmo_atual === null
      ? "—"
      : `${formatPercent(p.ritmo_atual)} · esp. ${formatPercent(p.ritmo_esperado)}`;

  return (
    <ExecutiveSection title="Resultado do período" panel={false}>
      <div className={exStack[20]}>
        <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-4">
          <div className="col-span-2 lg:col-span-4">
          <KpiCard
            size="primary"
            staggerIndex={0}
            icon="realizado"
            href={dreHref}
            label="Receita"
            value={formatCurrency(primary.kpis.faturamento)}
            hintText={hint(kpiExplanations, "receita")}
            detailText={explanationOf(kpiExplanations, "receita")?.explanation}
            tone="primary"
            comparison={primary.comparisons.faturamento}
            sparkline
          />
          </div>
          <div className="lg:col-span-2">
          <KpiCard
            size="primary"
            staggerIndex={1}
            icon="meta"
            href={metaHref}
            label="Meta"
            value={
              p.valor_meta === null ? "—" : formatCurrency(p.valor_meta)
            }
            sparkline
          />
          </div>
          <div className="lg:col-span-2">
          <KpiCard
            size="primary"
            staggerIndex={2}
            icon="gap"
            href={vendasHref}
            label="Gap"
            value={
              p.restante_meta === null ? "—" : formatCurrency(p.restante_meta)
            }
            tone={
              p.restante_meta !== null && p.restante_meta > 0
                ? "warning"
                : "success"
            }
            sparkline
          />
          </div>
          <div className="lg:col-span-2">
          <KpiCard
            size="primary"
            staggerIndex={3}
            icon="projecao"
            label="Projeção"
            value={formatCurrency(p.projecao_dias_uteis)}
            sparkline
          />
          </div>
          <div className="lg:col-span-2">
          <KpiCard
            size="primary"
            staggerIndex={4}
            icon="atingimento"
            label="Atingimento"
            value={
              p.percentual_atingido === null
                ? "—"
                : formatPercent(p.percentual_atingido)
            }
            tone={
              p.percentual_atingido !== null && p.percentual_atingido >= 100
                ? "success"
                : "neutral"
            }
            sparkline
          />
          </div>
        </div>

        <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          <KpiCard
            staggerIndex={5}
            icon="ticket"
            href={vendasHref}
            label="Ticket"
            value={formatCurrency(primary.kpis.ticket_medio)}
            comparison={primary.comparisons.ticket_medio}
          />
          <KpiCard
            staggerIndex={6}
            icon="comparacao"
            href={vendasHref}
            label="Vendas"
            value={formatNumber(primary.kpis.quantidade_vendas)}
          />
          <KpiCard
            staggerIndex={7}
            icon="comparacao"
            href={buildDashboardDrillDownHref(tenantSlug, "clientes", filters)}
            label="Clientes"
            value={formatNumber(primary.kpis.quantidade_clientes)}
          />
          <KpiCard
            staggerIndex={8}
            icon="dias"
            label="Ritmo"
            value={ritmo}
            hintText="Atual · esperado"
          />
          <KpiCard
            staggerIndex={9}
            icon="atingimento"
            label="Confiança"
            value={CONFIANCA_LABEL[panel.confianca]}
            hintText={panel.confianca_motivo}
          />
        </div>
      </div>
    </ExecutiveSection>
  );
}

export function ExecutiveKpiGridSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Carregando indicadores"
    >
      <div className="h-4 w-40 rounded-full bg-slate-200/80 dark:bg-white/10" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "border border-slate-200/40 bg-white p-5 dark:border-white/10 dark:bg-card",
              exSize.kpiPrimary,
              exRadius[20],
              exAnimations.shimmer,
            )}
          >
            <div className="mb-6 h-3 w-16 rounded-full bg-slate-100 dark:bg-white/10" />
            <div className="h-9 w-28 rounded-lg bg-slate-100 dark:bg-white/10" />
            <div className="mt-4 h-4 w-16 rounded bg-slate-50 dark:bg-white/5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`s-${i}`}
            className={cn(
              "border border-slate-200/40 bg-white p-4 dark:border-white/10 dark:bg-card",
              exSize.kpiSecondary,
              exRadius[20],
              exAnimations.shimmer,
            )}
          />
        ))}
      </div>
    </div>
  );
}
