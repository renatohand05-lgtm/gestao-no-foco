import { TrendingDown, TrendingUp } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency, formatPercent } from "@/lib/financeiro/format";
import type { DreIndicators } from "@/lib/dre/dre-insights-service";
import { cn } from "@/lib/utils";

type IndicatorCardProps = {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
  /** Se true, uma queda no valor é lida como positiva (ex: CMV sobre receita). */
  lowerIsBetter?: boolean;
  /** Como formatar a variação: pontos percentuais (indicadores em %) ou variação % (valores em R$). */
  unit?: "pp" | "currency";
};

function IndicatorCard({
  label,
  value,
  current,
  previous,
  lowerIsBetter = false,
  unit = "pp",
}: IndicatorCardProps) {
  const hasComparison = current != null && previous != null;
  const delta = hasComparison ? current - previous : null;
  const deltaPctChange =
    hasComparison && previous !== 0 ? (delta! / Math.abs(previous!)) * 100 : null;
  const isFlat = delta == null || Math.abs(delta) < 0.05;
  const isImprovement =
    delta != null && (lowerIsBetter ? delta < 0 : delta > 0);
  const deltaLabel =
    unit === "pp"
      ? `${Math.abs(delta ?? 0).toFixed(1).replace(".", ",")} p.p. vs mês anterior`
      : deltaPctChange != null
        ? `${formatPercent(Math.abs(deltaPctChange))} vs mês anterior`
        : "vs mês anterior";

  return (
    <div className="rounded-lg border border-border/70 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      {delta != null && !isFlat ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium tabular-nums",
            isImprovement
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-rose-700 dark:text-rose-400",
          )}
        >
          {isImprovement ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          {deltaLabel}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Sem variação vs mês anterior
        </p>
      )}
    </div>
  );
}

type Props = {
  indicators: DreIndicators;
};

export function DreIndicatorsPanel({ indicators }: Props) {
  return (
    <SectionCard
      title="Indicadores principais"
      description="Margens e ticket médio do período, comparados ao mês anterior."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IndicatorCard
          label="Margem Líquida"
          value={
            indicators.margemLiquidaPct != null
              ? `${formatPercent(indicators.margemLiquidaPct)}`
              : "—"
          }
          current={indicators.margemLiquidaPct}
          previous={indicators.margemLiquidaPctAnterior}
        />
        <IndicatorCard
          label="Margem Bruta"
          value={
            indicators.margemBrutaPct != null
              ? `${formatPercent(indicators.margemBrutaPct)}`
              : "—"
          }
          current={indicators.margemBrutaPct}
          previous={indicators.margemBrutaPctAnterior}
        />
        <IndicatorCard
          label="CMV sobre Receita"
          value={
            indicators.cmvSobreReceitaPct != null
              ? `${formatPercent(indicators.cmvSobreReceitaPct)}`
              : "—"
          }
          current={indicators.cmvSobreReceitaPct}
          previous={indicators.cmvSobreReceitaPctAnterior}
          lowerIsBetter
        />
        <IndicatorCard
          label="Ticket Médio"
          value={formatCurrency(indicators.ticketMedio)}
          current={indicators.ticketMedio}
          previous={indicators.ticketMedioAnterior}
          unit="currency"
        />
      </div>
    </SectionCard>
  );
}
