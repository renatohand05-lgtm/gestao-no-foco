import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { ContasPagarResumo } from "@/types/contas-pagar";

type Props = {
  resumo: ContasPagarResumo;
};

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <SectionCard title={title} contentClassName="pt-0">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </SectionCard>
  );
}

export function ContaPagarSummaryCards({ resumo }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        title="Total em aberto"
        value={formatCurrency(resumo.total_aberto)}
        hint={`${resumo.quantidade_aberto} título(s)`}
      />
      <SummaryCard
        title="Total pago"
        value={formatCurrency(resumo.total_pago)}
      />
      <SummaryCard
        title="Total vencido"
        value={formatCurrency(resumo.total_vencido)}
        hint={`${resumo.quantidade_vencido} título(s)`}
      />
      <SummaryCard
        title="Vencendo hoje"
        value={formatCurrency(resumo.vencendo_hoje)}
        hint={`${resumo.quantidade_vencendo_hoje} título(s)`}
      />
      <SummaryCard
        title="Próximos 7 dias"
        value={formatCurrency(resumo.proximos_7_dias)}
        hint={`${resumo.quantidade_proximos_7} título(s)`}
      />
      <SummaryCard
        title="Próximos 30 dias"
        value={formatCurrency(resumo.proximos_30_dias)}
        hint={`${resumo.quantidade_proximos_30} título(s)`}
      />
    </div>
  );
}
