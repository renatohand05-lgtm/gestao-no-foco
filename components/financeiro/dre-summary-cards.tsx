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
  const opexHints = [
    resumo.opex_grupo_principal
      ? `Principal: ${resumo.opex_grupo_principal}`
      : null,
    resumo.opex_pct_receita_liquida != null
      ? `${resumo.opex_pct_receita_liquida.toFixed(1)}% da receita líquida`
      : null,
    "Pessoal + operacionais + comerciais (competência)",
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");

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
        hint={opexHints}
      />
      <SummaryCard
        title="EBITDA"
        value={formatCurrency(resumo.ebitda)}
        hint="Margem − opex (antes de depreciação)"
        valueClassName={valueTone(resumo.ebitda)}
      />
      <SummaryCard
        title="EBIT"
        value={formatCurrency(resumo.ebit ?? resumo.ebitda)}
        hint="EBITDA − depreciação/amortização"
        valueClassName={valueTone(resumo.ebit ?? resumo.ebitda)}
      />
      <SummaryCard
        title="Resultado líquido"
        value={formatCurrency(resumo.resultado_final)}
        hint="Após financeiro e impostos classificados"
        valueClassName={valueTone(resumo.resultado_final)}
      />
    </div>
  );
}
