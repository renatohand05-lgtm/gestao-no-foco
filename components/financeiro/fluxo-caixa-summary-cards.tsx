import { MetricCard } from "@/components/executive";
import { gofGrid } from "@/lib/design-system";
import { formatCurrency } from "@/lib/financeiro/format";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

type Props = {
  resumo: FluxoCaixaResumo;
};

export function FluxoCaixaSummaryCards({ resumo }: Props) {
  return (
    <div className={gofGrid.metrics} data-financeiro-block="fluxo-caixa-kpis">
      <MetricCard
        label="Saldo inicial"
        value={formatCurrency(resumo.saldo_inicial)}
        hint="Saldo no início do período"
      />
      <MetricCard
        label="Entradas previstas"
        value={formatCurrency(resumo.entradas_previstas)}
        hint="Contas a receber em aberto no vencimento"
        tone="success"
      />
      <MetricCard
        label="Saídas previstas"
        value={formatCurrency(resumo.saidas_previstas)}
        hint="Contas a pagar em aberto no vencimento"
        tone="danger"
      />
      <MetricCard
        label="Entradas realizadas"
        value={formatCurrency(resumo.entradas_realizadas)}
        hint="Movimentações de crédito no período"
        tone="success"
      />
      <MetricCard
        label="Saídas realizadas"
        value={formatCurrency(resumo.saidas_realizadas)}
        hint="Movimentações de débito no período"
        tone="danger"
      />
      <MetricCard
        label="Saldo diário"
        value={formatCurrency(resumo.saldo_diario)}
        hint="Resultado líquido do último dia do período"
      />
      <MetricCard
        label="Saldo acumulado"
        value={formatCurrency(resumo.saldo_acumulado)}
        hint="Saldo acumulado ao fim do período"
        emphasize
      />
      <MetricCard
        label="Saldo projetado"
        value={formatCurrency(resumo.saldo_projetado)}
        hint="Inicial + realizados + previstos"
        tone="info"
      />
    </div>
  );
}
