import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { ContasReceberResumo } from "@/types/contas-receber";

type Props = {
  resumo: ContasReceberResumo;
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

export function ContaReceberSummaryCards({ resumo }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total em aberto"
        value={formatCurrency(resumo.total_aberto)}
        hint={`${resumo.quantidade_aberto} título(s)`}
      />
      <SummaryCard
        title="Total recebido"
        value={formatCurrency(resumo.total_recebido)}
      />
      <SummaryCard
        title="Total vencido"
        value={formatCurrency(resumo.total_vencido)}
        hint={`${resumo.quantidade_vencido} título(s)`}
      />
      <SummaryCard
        title="Vencimentos próximos"
        value={formatCurrency(resumo.vencimentos_proximos)}
        hint={`${resumo.quantidade_proximos} nos próximos 7 dias`}
      />
    </div>
  );
}
