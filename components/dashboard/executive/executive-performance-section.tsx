import {
  ExecutiveCard,
  ExecutiveMetric,
  ExecutiveSection,
} from "@/components/executive";
import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/dashboard/format";
import { exAnimations, exSpacing, exTypography } from "@/lib/design-system";
import { META_STATUS_LABEL } from "@/lib/metas/projection";
import { cn } from "@/lib/utils";
import {
  CONFIANCA_LABEL,
  PROBABILIDADE_LABEL,
  TENDENCIA_LABEL,
  type CommercialPanelData,
} from "@/types/commercial-panel";

type Props = {
  data: CommercialPanelData;
};

/**
 * Seção Performance Premium — ritmo, tendência, confiança (dados existentes).
 */
export function ExecutivePerformanceSection({ data }: Props) {
  const p = data.projecao;

  return (
    <ExecutiveSection
      title="Performance"
      description="Ritmo e confiança — depois da meta, antes da evolução."
      panel
    >
      <div
        className={cn(
          "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          exSpacing[16],
        )}
      >
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.ritmo}
            label="Ritmo esp. / atual"
            value={`${formatPercent(p.ritmo_esperado)} / ${
              p.ritmo_atual === null ? "—" : formatPercent(p.ritmo_atual)
            }`}
            hint={
              p.ritmo_diferenca_pp === null
                ? undefined
                : `Diff ${p.ritmo_diferenca_pp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`
            }
          />
        </ExecutiveCard>
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.tendencia}
            label="Tendência (7d)"
            value={TENDENCIA_LABEL[data.tendencia]}
            hint={
              data.tendencia_insuficiente
                ? "Amostra insuficiente"
                : data.tendencia_pct === null
                  ? undefined
                  : formatPercent(data.tendencia_pct)
            }
          />
        </ExecutiveCard>
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.confianca}
            label="Confiança"
            value={CONFIANCA_LABEL[data.confianca]}
            hint={data.confianca_motivo}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.probabilidade}
            label="Prob. atingir meta"
            value={PROBABILIDADE_LABEL[data.probabilidade]}
            hint={`Score ${data.probabilidade_score}/100`}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.alerta}
            label="Status do ritmo"
            value={META_STATUS_LABEL[p.status]}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.projecao}
            label="Proj. dias corridos"
            value={formatCurrency(p.projecao_dias_corridos)}
          />
        </ExecutiveCard>
        {p.comparacao ? (
          <>
            <ExecutiveCard padding={20} className={exAnimations.slide}>
              <ExecutiveMetric
                icon={COMERCIAL_METRIC_ICONS.comparacao}
                label="Realizado anterior"
                value={formatCurrency(p.comparacao.realizado_mes_anterior)}
              />
            </ExecutiveCard>
            <ExecutiveCard padding={20} className={exAnimations.slide}>
              <ExecutiveMetric
                label="Crescimento realizado"
                value={
                  p.comparacao.crescimento_realizado_pct === null
                    ? "—"
                    : formatPercent(p.comparacao.crescimento_realizado_pct)
                }
              />
            </ExecutiveCard>
          </>
        ) : null}
      </div>
      <p className={cn("mt-4", exTypography.caption)}>{data.meta_diaria_regra}</p>
    </ExecutiveSection>
  );
}
