import Link from "next/link";

import {
  ExecutiveButton,
  ExecutiveEmptyState,
  ExecutiveSection,
  MetricCard,
} from "@/components/executive";
import { formatCurrency } from "@/lib/format";
import { gofGrid, gofMotion } from "@/lib/design-system";

type Props = {
  tenantSlug: string;
  faturamento: number | null;
  negociacao: number | null;
  conversaoLabel: string;
  available: boolean;
};

/**
 * Resumo compacto CI no Dashboard — DS oficial (Gate 19.1 / 20.1.1).
 * Sem novos dados · sem alterar fórmulas.
 */
export function CommercialIntelligenceSummaryCard({
  tenantSlug,
  faturamento,
  negociacao,
  conversaoLabel,
  available,
}: Props) {
  return (
    <div
      data-dashboard-block="inteligencia-comercial"
      className={gofMotion.fade}
    >
      <ExecutiveSection
        title="Inteligência Comercial"
        description="Faturamento, pipeline e conversão — drill-down no módulo."
        panel
        actions={
          <ExecutiveButton
            render={<Link href={`/${tenantSlug}/vendas/dashboard`} />}
          >
            Abrir Inteligência Comercial
          </ExecutiveButton>
        }
      >
        {available ? (
          <div className={gofGrid.threeCol}>
            <MetricCard
              label="Faturamento"
              value={
                faturamento == null ? "Indisponível" : formatCurrency(faturamento)
              }
              hint="Período carregado"
              tone={faturamento == null ? "neutral" : "primary"}
            />
            <MetricCard
              label="Em negociação"
              value={
                negociacao == null ? "Indisponível" : formatCurrency(negociacao)
              }
              hint="Pipeline aberto"
              tone={negociacao == null ? "neutral" : "info"}
            />
            <MetricCard
              label="Conversão"
              value={conversaoLabel}
              hint="Fórmula preservada do CI"
              tone="neutral"
            />
          </div>
        ) : (
          <ExecutiveEmptyState
            title="Dados parciais"
            description="Dados parciais ou indisponíveis neste momento."
            className="py-6"
          />
        )}
      </ExecutiveSection>
    </div>
  );
}
