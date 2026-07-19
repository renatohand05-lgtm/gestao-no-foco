import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import {
  formatCurrency,
  formatNumber,
} from "@/lib/dashboard/format";
import {
  ExecutiveCard,
  ExecutiveMetric,
  ExecutiveSection,
} from "@/components/executive";
import { exAnimations, exSpacing } from "@/lib/design-system";
import { META_STATUS_LABEL } from "@/lib/metas/projection";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";

type Props = {
  data: CommercialPanelData;
};

export function ComercialDailyTarget({ data }: Props) {
  const p = data.projecao;
  const mediaAtual =
    p.dias_uteis_decorridos > 0
      ? p.faturamento_realizado / p.dias_uteis_decorridos
      : 0;

  return (
    <ExecutiveSection
      title="Meta diária e ritmo"
      description={data.meta_diaria_regra}
    >
      <div
        className={cn(
          "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
          exSpacing[16],
        )}
      >
        <ExecutiveCard padding={16} className={exAnimations.slide}>
          <ExecutiveMetric
            size="primary"
            icon={COMERCIAL_METRIC_ICONS.gap}
            label="Restante da meta"
            value={
              p.restante_meta === null ? "—" : formatCurrency(p.restante_meta)
            }
            tone={
              p.restante_meta !== null && p.restante_meta > 0
                ? "warning"
                : "success"
            }
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.dias}
            label="Dias úteis restantes"
            value={formatNumber(p.dias_uteis_restantes)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16} className={exAnimations.slide}>
          <ExecutiveMetric
            size="primary"
            icon={COMERCIAL_METRIC_ICONS.ritmo}
            label="Necessário / dia útil"
            value={
              p.necessario_por_dia_util === null
                ? "—"
                : formatCurrency(p.necessario_por_dia_util)
            }
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.tendencia}
            label="Média atual (útil)"
            value={formatCurrency(mediaAtual)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16} className={exAnimations.slide}>
          <ExecutiveMetric
            icon={COMERCIAL_METRIC_ICONS.alerta}
            label="Status do ritmo"
            value={META_STATUS_LABEL[p.status]}
            hint={
              p.ritmo_diferenca_pp === null
                ? undefined
                : `Diff ritmo: ${p.ritmo_diferenca_pp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`
            }
          />
        </ExecutiveCard>
      </div>
    </ExecutiveSection>
  );
}
