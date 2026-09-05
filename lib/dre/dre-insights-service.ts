import { createDreService } from "@/lib/financeiro/dre-service";
import { resolvePreviousPeriod } from "@/lib/dashboard/period";
import { buildCalendarMonthPeriod } from "@/lib/dre/dre-compare";
import { createClient } from "@/lib/supabase/server";
import type { DreFilters, DreResumo } from "@/types/dre";

const MONTH_LABELS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export type DreIndicators = {
  margemLiquidaPct: number | null;
  margemLiquidaPctAnterior: number | null;
  margemBrutaPct: number | null;
  margemBrutaPctAnterior: number | null;
  cmvSobreReceitaPct: number | null;
  cmvSobreReceitaPctAnterior: number | null;
  ticketMedio: number;
  ticketMedioAnterior: number;
};

export type DreComposicaoLucro = {
  lucroOperacional: number;
  resultadoFinanceiro: number;
  impostos: number;
  total: number;
};

export type DreEvolutionPoint = {
  label: string;
  receitaLiquida: number;
  lucroLiquido: number;
  margemPct: number | null;
};

export type DreTrendPoint = DreEvolutionPoint & {
  isProjected: boolean;
};

function pct(numerador: number, denominador: number): number | null {
  if (!denominador) return null;
  return (numerador / denominador) * 100;
}

/** Regressão linear simples (mínimos quadrados) sobre uma série de valores. */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  const xs = values.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX;

  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

async function fetchTicketMedio(
  tenantId: string,
  dataDe: string,
  dataAte: string,
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("id, total")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .eq("status", "faturado")
    .gte("data_venda", dataDe)
    .lte("data_venda", dataAte);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0) return 0;
  const total = rows.reduce((acc, row) => acc + Number(row.total), 0);
  return total / rows.length;
}

/**
 * Indicadores principais do DRE (margem líquida, margem bruta, CMV/receita,
 * ticket médio) com comparação ao período anterior equivalente.
 */
export async function getDreIndicators(
  tenantId: string,
  filters: DreFilters,
  resumo: DreResumo,
): Promise<DreIndicators> {
  const previous = resolvePreviousPeriod({
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
  });
  const previousFilters: DreFilters = {
    ...filters,
    dataDe: previous.dataDe,
    dataAte: previous.dataAte,
  };

  const service = await createDreService(tenantId);
  const [previousDre, ticketMedio, ticketMedioAnterior] = await Promise.all([
    service.getDre(previousFilters),
    fetchTicketMedio(tenantId, filters.dataDe, filters.dataAte),
    fetchTicketMedio(tenantId, previous.dataDe, previous.dataAte),
  ]);

  return {
    margemLiquidaPct: pct(resumo.resultado_final, resumo.receita_liquida),
    margemLiquidaPctAnterior: pct(
      previousDre.resumo.resultado_final,
      previousDre.resumo.receita_liquida,
    ),
    margemBrutaPct: pct(resumo.margem_contribuicao, resumo.receita_liquida),
    margemBrutaPctAnterior: pct(
      previousDre.resumo.margem_contribuicao,
      previousDre.resumo.receita_liquida,
    ),
    cmvSobreReceitaPct: pct(resumo.cmv, resumo.receita_liquida),
    cmvSobreReceitaPctAnterior: pct(
      previousDre.resumo.cmv,
      previousDre.resumo.receita_liquida,
    ),
    ticketMedio,
    ticketMedioAnterior,
  };
}

/**
 * Composição do resultado líquido: quanto veio da operação, do resultado
 * financeiro e quanto foi consumido por impostos — em valor absoluto,
 * normalizado para leitura em rosca (não é uma soma algébrica do lucro).
 */
export function getDreComposicaoLucro(resumo: DreResumo): DreComposicaoLucro {
  const lucroOperacional = Math.abs(resumo.ebit ?? resumo.ebitda);
  const resultadoFinanceiro = Math.abs(
    resumo.receitas_financeiras - resumo.despesas_financeiras,
  );
  const impostos = Math.abs(resumo.impostos_lucro ?? 0);
  const total = lucroOperacional + resultadoFinanceiro + impostos;

  return { lucroOperacional, resultadoFinanceiro, impostos, total };
}

/**
 * Evolução do DRE nos últimos 6 meses (Receita líquida, Lucro líquido e
 * Margem %), sempre em meses calendário, independente do filtro atual.
 */
export async function getDreEvolution(
  tenantId: string,
  filters: Pick<DreFilters, "centroCustoId" | "categoriaId" | "planoContaId">,
  referenceDate = new Date(),
): Promise<DreEvolutionPoint[]> {
  const service = await createDreService(tenantId);

  const months: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const period = buildCalendarMonthPeriod(year, month);
      const dre = await service.getDre({ ...filters, ...period });
      const margemPct = pct(
        dre.resumo.resultado_final,
        dre.resumo.receita_liquida,
      );
      return {
        label: `${MONTH_LABELS_SHORT[month - 1]}/${year}`,
        receitaLiquida: dre.resumo.receita_liquida,
        lucroLiquido: dre.resumo.resultado_final,
        margemPct,
      };
    }),
  );

  return results;
}

/** Análise vertical: cada linha como % da receita líquida. */
export type DreVerticalLine = {
  label: string;
  valor: number;
  pct: number | null;
};

export function getDreVerticalAnalysis(resumo: DreResumo): DreVerticalLine[] {
  const base = resumo.receita_liquida;
  return [
    { label: "Receita Líquida", valor: resumo.receita_liquida, pct: pct(resumo.receita_liquida, base) },
    { label: "Lucro Bruto", valor: resumo.margem_contribuicao, pct: pct(resumo.margem_contribuicao, base) },
    { label: "EBITDA", valor: resumo.ebitda, pct: pct(resumo.ebitda, base) },
    { label: "Lucro Líquido", valor: resumo.resultado_final, pct: pct(resumo.resultado_final, base) },
  ];
}

/**
 * Tendência de resultado com projeção futura: parte dos últimos
 * `monthsBack` meses CALENDÁRIO COMPLETOS (antes do mês atual — nunca inclui
 * o mês corrente, que estaria com vendas e lançamentos parciais e enviesaria
 * a tendência pra baixo) e projeta `monthsForward` meses à frente (o mês
 * corrente + os seguintes) por regressão linear simples sobre a receita
 * líquida e o lucro líquido realizados.
 *
 * É uma extrapolação estatística da tendência recente, não uma previsão
 * orçamentária — some com o Orçamento (`/financeiro/orcamento`) pra comparar
 * orçado × projeção × realizado.
 */
export async function getDreTrendProjection(
  tenantId: string,
  filters: Pick<DreFilters, "centroCustoId" | "categoriaId" | "planoContaId">,
  referenceDate = new Date(),
  monthsBack = 6,
  monthsForward = 3,
): Promise<DreTrendPoint[]> {
  const service = await createDreService(tenantId);

  const baseMonths: { year: number; month: number }[] = [];
  for (let i = monthsBack; i >= 1; i -= 1) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - i,
      1,
    );
    baseMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const historical: DreTrendPoint[] = await Promise.all(
    baseMonths.map(async ({ year, month }) => {
      const period = buildCalendarMonthPeriod(year, month);
      const dre = await service.getDre({ ...filters, ...period });
      return {
        label: `${MONTH_LABELS_SHORT[month - 1]}/${year}`,
        receitaLiquida: dre.resumo.receita_liquida,
        lucroLiquido: dre.resumo.resultado_final,
        margemPct: pct(dre.resumo.resultado_final, dre.resumo.receita_liquida),
        isProjected: false,
      };
    }),
  );

  const hasHistoricalData = historical.some((p) => p.receitaLiquida !== 0);
  if (!hasHistoricalData) return historical;

  const receitaTrend = linearRegression(historical.map((p) => p.receitaLiquida));
  const lucroTrend = linearRegression(historical.map((p) => p.lucroLiquido));

  const projected: DreTrendPoint[] = [];
  for (let i = 0; i < monthsForward; i += 1) {
    const index = historical.length + i;
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + i,
      1,
    );
    const receitaProjetada = Math.max(
      0,
      Math.round((receitaTrend.intercept + receitaTrend.slope * index) * 100) /
        100,
    );
    const lucroProjetado =
      Math.round((lucroTrend.intercept + lucroTrend.slope * index) * 100) /
      100;

    projected.push({
      label: `${MONTH_LABELS_SHORT[d.getMonth()]}/${d.getFullYear()}`,
      receitaLiquida: receitaProjetada,
      lucroLiquido: lucroProjetado,
      margemPct: pct(lucroProjetado, receitaProjetada),
      isProjected: true,
    });
  }

  return [...historical, ...projected];
}
