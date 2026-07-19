import Link from "next/link";

import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import {
  ExecutiveCard,
  ExecutiveMetric,
  ExecutiveSection,
} from "@/components/executive";
import { buildDashboardDrillDownHref } from "@/lib/dashboard/drill-down";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/dashboard/format";
import { exAnimations, exSpacing, exStack, exTypography } from "@/lib/design-system";
import { META_STATUS_LABEL } from "@/lib/metas/projection";
import { cn } from "@/lib/utils";
import {
  CONFIANCA_LABEL,
  PROBABILIDADE_LABEL,
  TENDENCIA_LABEL,
  type CommercialPanelData,
} from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type { ComercialMetricIconKey } from "@/components/dashboard/comercial/comercial-metric-icons";
import type { ExColorTone } from "@/lib/design-system/colors";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
  metaHref: string;
};

function MetricCard({
  label,
  value,
  href,
  hint,
  icon,
  size = "secondary",
  tone = "neutral",
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
  icon?: ComercialMetricIconKey;
  size?: "primary" | "secondary";
  tone?: ExColorTone;
}) {
  const Icon = icon ? COMERCIAL_METRIC_ICONS[icon] : undefined;
  const body = (
    <ExecutiveCard
      padding={size === "primary" ? 20 : 16}
      className={cn(
        "h-full",
        exAnimations.slide,
        href && exAnimations.hoverLift,
      )}
    >
      <ExecutiveMetric
        label={label}
        value={value}
        hint={hint}
        icon={Icon}
        size={size}
        tone={tone}
      />
    </ExecutiveCard>
  );
  if (!href) return body;
  return (
    <Link href={href} className={cn("block h-full", exAnimations.focusRing)}>
      {body}
    </Link>
  );
}

export function ComercialPerformanceSummary({
  tenantSlug,
  data,
  filters,
  metaHref,
}: Props) {
  const p = data.projecao;
  const monthFilters: DashboardFilters = {
    ...filters,
    dataDe: data.dataDe,
    dataAte: data.dataAte,
  };
  const vendasHref = buildDashboardDrillDownHref(
    tenantSlug,
    "vendas",
    monthFilters,
  );

  return (
    <ExecutiveSection
      title="Performance Comercial"
      description="Indicadores primários em destaque; secundários em leitura compacta."
    >
      <div className={exStack[20]}>
        {p.status === "sem_meta" ? (
          <ExecutiveCard
            padding={20}
            accent="info"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className={exTypography.label}>Sem meta mensal</p>
              <p className={exTypography.caption}>
                Cadastre a meta para ativar gap, ritmo e probabilidade.
              </p>
            </div>
            <Link
              href={metaHref}
              className={cn(
                "inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white",
                exAnimations.hoverPress,
                exAnimations.focusRing,
              )}
            >
              Cadastrar meta mensal
            </Link>
          </ExecutiveCard>
        ) : null}

        <div>
          <p className={cn("mb-3", exTypography.label)}>Primários</p>
          <div
            className={cn(
              "grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5",
              exSpacing[16],
            )}
          >
            <MetricCard
              size="primary"
              icon="meta"
              href={metaHref}
              label="Meta"
              value={
                p.valor_meta === null ? "—" : formatCurrency(p.valor_meta)
              }
            />
            <MetricCard
              size="primary"
              icon="realizado"
              href={vendasHref}
              label="Realizado"
              value={formatCurrency(p.faturamento_realizado)}
              hint="DRE receita bruta"
              tone="primary"
            />
            <MetricCard
              size="primary"
              icon="atingimento"
              label="Atingimento"
              value={
                p.percentual_atingido === null
                  ? "—"
                  : formatPercent(p.percentual_atingido)
              }
            />
            <MetricCard
              size="primary"
              icon="projecao"
              label="Projeção (úteis)"
              value={formatCurrency(p.projecao_dias_uteis)}
            />
            <MetricCard
              size="primary"
              icon="dias"
              label="Necessário / dia útil"
              value={
                p.necessario_por_dia_util === null
                  ? "—"
                  : formatCurrency(p.necessario_por_dia_util)
              }
            />
          </div>
        </div>

        <div>
          <p className={cn("mb-3", exTypography.label)}>Secundários</p>
          <div
            className={cn(
              "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              exSpacing[12],
            )}
          >
            <MetricCard
              icon="projecao"
              label="Proj. dias corridos"
              value={formatCurrency(p.projecao_dias_corridos)}
            />
            <MetricCard
              icon="gap"
              href={vendasHref}
              label="Diferença p/ meta"
              value={
                p.restante_meta === null ? "—" : formatCurrency(p.restante_meta)
              }
              hint="Gap residual vs meta"
            />
            <MetricCard
              icon="ritmo"
              label="Ritmo esp. / atual"
              value={`${formatPercent(p.ritmo_esperado)} / ${
                p.ritmo_atual === null ? "—" : formatPercent(p.ritmo_atual)
              }`}
            />
            <MetricCard
              icon="tendencia"
              label="Tendência (7d)"
              value={TENDENCIA_LABEL[data.tendencia]}
              hint={
                data.tendencia_insuficiente
                  ? "Menos de 3 dias com movimento"
                  : data.tendencia_pct === null
                    ? "Sem base"
                    : formatPercent(data.tendencia_pct)
              }
            />
            <MetricCard
              icon="confianca"
              label="Confiança"
              value={CONFIANCA_LABEL[data.confianca]}
              hint={data.confianca_motivo}
            />
            <MetricCard
              icon="probabilidade"
              label="Prob. atingir meta"
              value={PROBABILIDADE_LABEL[data.probabilidade]}
              hint={`Score ${data.probabilidade_score}/100 · estimativa gerencial`}
            />
            <MetricCard
              icon="alerta"
              label="Status"
              value={META_STATUS_LABEL[p.status]}
            />
          </div>
        </div>

        {p.comparacao ? (
          <ExecutiveCard padding={16}>
            <p className={exTypography.label}>Comparação vs mês anterior</p>
            <div className={cn("mt-3 grid sm:grid-cols-3", exSpacing[16])}>
              <ExecutiveMetric
                icon={COMERCIAL_METRIC_ICONS.comparacao}
                label="Realizado anterior"
                value={formatCurrency(p.comparacao.realizado_mes_anterior)}
              />
              <ExecutiveMetric
                label="Projeção vs anterior"
                value={
                  p.comparacao.projecao_vs_anterior_pct === null
                    ? "—"
                    : formatPercent(p.comparacao.projecao_vs_anterior_pct)
                }
              />
              <ExecutiveMetric
                label="Crescimento realizado"
                value={
                  p.comparacao.crescimento_realizado_pct === null
                    ? "—"
                    : formatPercent(p.comparacao.crescimento_realizado_pct)
                }
              />
            </div>
          </ExecutiveCard>
        ) : null}
      </div>
    </ExecutiveSection>
  );
}
