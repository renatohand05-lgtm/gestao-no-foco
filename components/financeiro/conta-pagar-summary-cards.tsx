import { MetricCard } from "@/components/executive";
import { gofGrid } from "@/lib/design-system";
import { formatCurrency } from "@/lib/financeiro/format";
import type { ContasPagarResumo } from "@/types/contas-pagar";

type Props = {
  resumo: ContasPagarResumo;
};

export function ContaPagarSummaryCards({ resumo }: Props) {
  return (
    <div className={gofGrid.kpis} data-financeiro-block="contas-pagar-kpis">
      <MetricCard
        label="Total em aberto"
        value={formatCurrency(resumo.total_aberto)}
        hint={`${resumo.quantidade_aberto} título(s)`}
        tone="warning"
        emphasize
      />
      <MetricCard
        label="Total pago"
        value={formatCurrency(resumo.total_pago)}
        tone="success"
      />
      <MetricCard
        label="Total vencido"
        value={formatCurrency(resumo.total_vencido)}
        hint={`${resumo.quantidade_vencido} título(s)`}
        tone={resumo.total_vencido > 0 ? "danger" : "neutral"}
      />
      <MetricCard
        label="Vencendo hoje"
        value={formatCurrency(resumo.vencendo_hoje)}
        hint={`${resumo.quantidade_vencendo_hoje} título(s)`}
        tone={resumo.vencendo_hoje > 0 ? "warning" : "neutral"}
      />
      <MetricCard
        label="Próximos 7 dias"
        value={formatCurrency(resumo.proximos_7_dias)}
        hint={`${resumo.quantidade_proximos_7} título(s)`}
      />
      <MetricCard
        label="Próximos 30 dias"
        value={formatCurrency(resumo.proximos_30_dias)}
        hint={`${resumo.quantidade_proximos_30} título(s)`}
      />
    </div>
  );
}
