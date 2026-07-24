import { MetricCard } from "@/components/executive";
import { gofGrid } from "@/lib/design-system";
import { formatCurrency } from "@/lib/financeiro/format";
import type { ContasReceberResumo } from "@/types/contas-receber";

type Props = {
  resumo: ContasReceberResumo;
};

export function ContaReceberSummaryCards({ resumo }: Props) {
  return (
    <div className={gofGrid.metrics} data-financeiro-block="contas-receber-kpis">
      <MetricCard
        label="Total em aberto"
        value={formatCurrency(resumo.total_aberto)}
        hint={`${resumo.quantidade_aberto} título(s)`}
        tone="info"
        emphasize
      />
      <MetricCard
        label="Total recebido"
        value={formatCurrency(resumo.total_recebido)}
        tone="success"
      />
      <MetricCard
        label="Total vencido"
        value={formatCurrency(resumo.total_vencido)}
        hint={`${resumo.quantidade_vencido} título(s)`}
        tone={resumo.total_vencido > 0 ? "danger" : "neutral"}
      />
      <MetricCard
        label="Vencimentos próximos"
        value={formatCurrency(resumo.vencimentos_proximos)}
        hint={`${resumo.quantidade_proximos} nos próximos 7 dias`}
        tone={resumo.vencimentos_proximos > 0 ? "warning" : "neutral"}
      />
    </div>
  );
}
