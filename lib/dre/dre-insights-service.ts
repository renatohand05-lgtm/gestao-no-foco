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

function pct(numerador: number, denominador: number): number | null {
  if (!denominador) return null;
  return (numerador / denominador) * 100;
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
