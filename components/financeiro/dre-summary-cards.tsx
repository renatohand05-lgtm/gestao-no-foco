import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { DreResumo } from "@/types/dre";

type Props = {
  resumo: DreResumo;
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

function valueTone(value: number) {
  if (value > 0) return "text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "text-rose-700 dark:text-rose-400";
  return undefined;
}

export function DreSummaryCards({ resumo }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Receita Bruta"
        value={formatCurrency(resumo.receita_bruta)}
        hint="Vendas faturadas + CR avulsas"
        valueClassName={valueTone(resumo.receita_bruta)}
      />
      <SummaryCard
        title="Deduções"
        value={formatCurrency(resumo.deducoes)}
        hint="Descontos de vendas e CR avulsas"
      />
      <SummaryCard
        title="Receita Líquida"
        value={formatCurrency(resumo.receita_liquida)}
        hint="Receita bruta − deduções"
        valueClassName={valueTone(resumo.receita_liquida)}
      />
      <SummaryCard
        title="CMV / custos variáveis"
        value={formatCurrency(resumo.cmv)}
        hint="Custo dos itens das vendas faturadas"
      />
      <SummaryCard
        title="Margem de contribuição"
        value={formatCurrency(resumo.margem_contribuicao)}
        hint="Receita líquida − CMV"
        valueClassName={valueTone(resumo.margem_contribuicao)}
      />
      <SummaryCard
        title="Despesas operacionais"
        value={formatCurrency(resumo.despesas_operacionais)}
        hint="Contas a pagar por competência"
      />
      <SummaryCard
        title="EBITDA"
        value={formatCurrency(resumo.ebitda)}
        hint="Proxy sem depreciação/amortização"
        valueClassName={valueTone(resumo.ebitda)}
      />
      <SummaryCard
        title="Resultado final"
        value={formatCurrency(resumo.resultado_final)}
        hint="EBITDA ± resultado financeiro"
        valueClassName={valueTone(resumo.resultado_final)}
      />
    </div>
  );
}
