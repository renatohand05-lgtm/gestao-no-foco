import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

type Props = {
  resumo: FluxoCaixaResumo;
};

function SummaryCard({
  title,
  value,
  hint,
  valueClassName,
}: {
  title: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <SectionCard title={title} contentClassName="pt-0">
      <p
        className={`text-2xl font-semibold tracking-tight ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </SectionCard>
  );
}

export function FluxoCaixaSummaryCards({ resumo }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Saldo inicial"
        value={formatCurrency(resumo.saldo_inicial)}
        hint="Saldo no início do período"
      />
      <SummaryCard
        title="Entradas previstas"
        value={formatCurrency(resumo.entradas_previstas)}
        valueClassName="text-emerald-700 dark:text-emerald-400"
        hint="Contas a receber em aberto no vencimento"
      />
      <SummaryCard
        title="Saídas previstas"
        value={formatCurrency(resumo.saidas_previstas)}
        valueClassName="text-rose-700 dark:text-rose-400"
        hint="Contas a pagar em aberto no vencimento"
      />
      <SummaryCard
        title="Entradas realizadas"
        value={formatCurrency(resumo.entradas_realizadas)}
        valueClassName="text-emerald-700 dark:text-emerald-400"
        hint="Movimentações de crédito no período"
      />
      <SummaryCard
        title="Saídas realizadas"
        value={formatCurrency(resumo.saidas_realizadas)}
        valueClassName="text-rose-700 dark:text-rose-400"
        hint="Movimentações de débito no período"
      />
      <SummaryCard
        title="Saldo diário"
        value={formatCurrency(resumo.saldo_diario)}
        hint="Resultado líquido do último dia do período"
      />
      <SummaryCard
        title="Saldo acumulado"
        value={formatCurrency(resumo.saldo_acumulado)}
        hint="Saldo acumulado ao fim do período"
      />
      <SummaryCard
        title="Saldo projetado"
        value={formatCurrency(resumo.saldo_projetado)}
        hint="Inicial + realizados + previstos"
      />
    </div>
  );
}
