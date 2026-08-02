import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import type { EccGoalsSlice } from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  goals: EccGoalsSlice;
};

export function ExecutiveGoalsPanel({ goals }: Props) {
  return (
    <ExecutiveSection
      title="Meta do mês"
      description="Atingimento e projeção evidenciada"
      panel
      actions={
        goals.abaixoRitmo === true ? (
          <ExecutiveBadge tone="warning" variant="soft">
            Abaixo do ritmo
          </ExecutiveBadge>
        ) : goals.available ? (
          <ExecutiveBadge tone="success" variant="outline">
            Meta em acompanhamento
          </ExecutiveBadge>
        ) : undefined
      }
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <ExecutiveCard padding={16} className="space-y-1">
          <p className={gofTypography.caption}>Meta</p>
          <p className="text-lg font-semibold tabular-nums">{goals.metaMesLabel}</p>
        </ExecutiveCard>
        <ExecutiveCard padding={16} className="space-y-1">
          <p className={gofTypography.caption}>Atingimento</p>
          <p className="text-lg font-semibold tabular-nums">
            {goals.percentualLabel}
          </p>
        </ExecutiveCard>
        <ExecutiveCard padding={16} className="space-y-1">
          <p className={gofTypography.caption}>Projeção</p>
          <p className="text-lg font-semibold tabular-nums">
            {goals.projecaoLabel}
          </p>
        </ExecutiveCard>
      </div>
      {!goals.available ? (
        <p className={cn(gofTypography.caption)}>
          Meta não cadastrada para o período atual. Cadastre em Configurações →
          Metas. Ausência de meta não é exibida como R$ 0,00.
        </p>
      ) : null}
    </ExecutiveSection>
  );
}
