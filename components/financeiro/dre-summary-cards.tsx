import { MetricCard } from "@/components/executive";
import type { ExColorTone } from "@/lib/design-system/colors";
import { gofGrid } from "@/lib/design-system";
import { formatCurrency } from "@/lib/financeiro/format";
import type { DreResumo } from "@/types/dre";

type Props = {
  resumo: DreResumo;
};

function valueTone(value: number): ExColorTone {
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "neutral";
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
    <div className={gofGrid.metrics} data-financeiro-block="dre-kpis">
      <MetricCard
        label="Receita Bruta"
        value={formatCurrency(resumo.receita_bruta)}
        hint="Vendas faturadas + CR avulsas"
        tone={valueTone(resumo.receita_bruta)}
      />
      <MetricCard
        label="Deduções"
        value={formatCurrency(resumo.deducoes)}
        hint="Descontos de vendas e CR avulsas"
      />
      <MetricCard
        label="Receita Líquida"
        value={formatCurrency(resumo.receita_liquida)}
        hint="Receita bruta − deduções"
        tone={valueTone(resumo.receita_liquida)}
        emphasize
      />
      <MetricCard
        label="CMV / custos variáveis"
        value={formatCurrency(resumo.cmv)}
        hint="Custo dos itens das vendas faturadas"
      />
      <MetricCard
        label="Margem de contribuição"
        value={formatCurrency(resumo.margem_contribuicao)}
        hint="Receita líquida − CMV"
        tone={valueTone(resumo.margem_contribuicao)}
      />
      <MetricCard
        label="Despesas operacionais"
        value={formatCurrency(resumo.despesas_operacionais)}
        hint={opexHints}
      />
      <MetricCard
        label="EBITDA"
        value={formatCurrency(resumo.ebitda)}
        hint="Margem − opex (antes de depreciação)"
        tone={valueTone(resumo.ebitda)}
      />
      <MetricCard
        label="EBIT"
        value={formatCurrency(resumo.ebit ?? resumo.ebitda)}
        hint="EBITDA − depreciação/amortização"
        tone={valueTone(resumo.ebit ?? resumo.ebitda)}
      />
      <MetricCard
        label="Resultado líquido"
        value={formatCurrency(resumo.resultado_final)}
        hint="Após financeiro e impostos classificados"
        tone={valueTone(resumo.resultado_final)}
        emphasize
      />
    </div>
  );
}
