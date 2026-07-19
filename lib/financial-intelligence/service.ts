import { createClient } from "@/lib/supabase/server";
import {
  formatPeriodoLabel,
  resolvePreviousPeriod,
  splitPeriodIntoBuckets,
} from "@/lib/dashboard/period";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import { createFluxoCaixaService } from "@/lib/financeiro/fluxo-caixa-service";
import {
  DRE_OPEX_GRUPO_LABELS,
  type DreOpexGrupo,
} from "@/lib/dre/dre-opex-hierarchy";
import { buildDeterministicInsights } from "@/lib/financial-intelligence/insights";
import {
  compareMetric,
  eachCalendarMonth,
  toDashboardFilters,
  toneForMetric,
  buildTrendPresets,
} from "@/lib/financial-intelligence/periods";
import { FI_TOOLTIPS } from "@/lib/financial-intelligence/tooltips";
import type {
  FiExpenseRow,
  FiMetricCard,
  FiMetricKey,
  FiRankItem,
  FiTrendSeries,
  FinancialIntelligenceSnapshot,
} from "@/lib/financial-intelligence/types";
import type { DreFilters, DreLinha, DreResumo } from "@/types/dre";
import type { FluxoCaixaDailyPoint } from "@/types/fluxo-caixa";

function pct(n: number, d: number) {
  return d > 0 ? (n / d) * 100 : null;
}

function breakEven(resumo: DreResumo): number | null {
  const rl = resumo.receita_liquida;
  const contrib = resumo.margem_contribuicao;
  if (rl <= 0 || contrib <= 0) return null;
  const ratio = contrib / rl;
  if (ratio <= 0) return null;
  return resumo.despesas_operacionais / ratio;
}

function card(input: {
  key: FiMetricKey;
  label: string;
  value: number;
  previous: number;
  unit: "currency" | "percent" | "ratio";
  tenantSlug: string;
  filters: DreFilters;
  available?: boolean;
  unavailableReason?: string;
  linha?: string;
}): FiMetricCard {
  const comparison = compareMetric(input.value, input.previous);
  const available = input.available ?? true;
  const params = new URLSearchParams({
    dataDe: input.filters.dataDe,
    dataAte: input.filters.dataAte,
  });
  if (input.filters.centroCustoId) {
    params.set("centroCusto", input.filters.centroCustoId);
  }
  if (input.linha) params.set("linha", input.linha);

  return {
    key: input.key,
    label: input.label,
    value: input.value,
    formatted: available
      ? input.unit === "percent"
        ? formatPercent(input.value)
        : formatCurrency(input.value)
      : "—",
    unit: input.unit,
    comparison,
    previousFormatted: available
      ? input.unit === "percent"
        ? formatPercent(input.previous)
        : formatCurrency(input.previous)
      : "—",
    trendTone: toneForMetric(input.key, comparison.trend, input.value),
    tooltip: FI_TOOLTIPS[input.key],
    href: `/${input.tenantSlug}/financeiro/dre?${params}`,
    available,
    unavailableReason: input.unavailableReason,
  };
}

function buildExpenses(
  tenantSlug: string,
  filters: DreFilters,
  resumo: DreResumo,
  opexHierarchy: DreLinha[],
): FiExpenseRow[] {
  const rl = resumo.receita_liquida;
  const href = (linha?: string, detalhe?: string) => {
    const params = new URLSearchParams({
      dataDe: filters.dataDe,
      dataAte: filters.dataAte,
    });
    if (linha) params.set("linha", linha);
    if (detalhe) params.set("detalhe", detalhe);
    return `/${tenantSlug}/financeiro/dre?${params}`;
  };

  const opexByLabel = new Map<string, number>();
  for (const node of opexHierarchy) {
    opexByLabel.set(node.label, node.valor);
  }

  const groupValue = (grupo: DreOpexGrupo) =>
    opexByLabel.get(DRE_OPEX_GRUPO_LABELS[grupo]) ?? 0;

  return [
    {
      key: "locacao_ocupacao",
      label: "Locação e ocupação",
      value: groupValue("locacao_ocupacao"),
      pctReceitaLiquida: pct(groupValue("locacao_ocupacao"), rl),
      href: href("despesas_operacionais"),
      source: "dre_opex_grupo",
    },
    {
      key: "utilidades_infraestrutura",
      label: "Utilidades e infraestrutura",
      value: groupValue("utilidades_infraestrutura"),
      pctReceitaLiquida: pct(groupValue("utilidades_infraestrutura"), rl),
      href: href("despesas_operacionais"),
      source: "dre_opex_grupo",
    },
    {
      key: "pessoal",
      label: "Pessoal",
      value: resumo.despesas_pessoal ?? 0,
      pctReceitaLiquida: pct(resumo.despesas_pessoal ?? 0, rl),
      href: href("despesas_pessoal"),
      source: "dre_resumo",
    },
    {
      key: "encargos",
      label: "Encargos",
      value: 0,
      pctReceitaLiquida: null,
      href: href("despesas_pessoal", "pessoal_encargos"),
      source: "dre_linha",
    },
    {
      key: "beneficios",
      label: "Benefícios",
      value: 0,
      pctReceitaLiquida: null,
      href: href("despesas_pessoal", "pessoal_beneficios"),
      source: "dre_linha",
    },
    {
      key: "marketing",
      label: "Marketing",
      value: resumo.despesas_comerciais ?? 0,
      pctReceitaLiquida: pct(resumo.despesas_comerciais ?? 0, rl),
      href: href("despesas_comerciais"),
      source: "dre_resumo",
    },
    {
      key: "administrativas",
      label: "Administrativas",
      value: groupValue("despesas_administrativas"),
      pctReceitaLiquida: pct(groupValue("despesas_administrativas"), rl),
      href: href("despesas_operacionais"),
      source: "dre_opex_grupo",
    },
    {
      key: "financeiras",
      label: "Financeiras",
      value: resumo.despesas_financeiras,
      pctReceitaLiquida: pct(resumo.despesas_financeiras, rl),
      href: href("despesas_financeiras"),
      source: "dre_resumo",
    },
    {
      key: "tributos",
      label: "Tributos",
      value: resumo.impostos_lucro ?? 0,
      pctReceitaLiquida: pct(resumo.impostos_lucro ?? 0, rl),
      href: href("impostos_lucro"),
      source: "dre_resumo",
    },
    {
      key: "depreciacao",
      label: "Depreciação",
      value: resumo.depreciacao_amortizacao ?? 0,
      pctReceitaLiquida: pct(resumo.depreciacao_amortizacao ?? 0, rl),
      href: href("depreciacao_amortizacao"),
      source: "dre_resumo",
    },
    {
      key: "outras",
      label: "Outras despesas",
      value: groupValue("outras_despesas_operacionais"),
      pctReceitaLiquida: pct(groupValue("outras_despesas_operacionais"), rl),
      href: href("despesas_operacionais"),
      source: "dre_opex_grupo",
    },
  ];
}

function enrichPersonnelDetails(
  rows: FiExpenseRow[],
  drillItems: { detalhe?: string | null; valor: number; linha: string }[],
  receitaLiquida: number,
): FiExpenseRow[] {
  let encargos = 0;
  let beneficios = 0;
  for (const item of drillItems) {
    if (item.linha !== "despesas_pessoal") continue;
    if (item.detalhe === "pessoal_encargos") encargos += Math.abs(item.valor);
    if (item.detalhe === "pessoal_beneficios") {
      beneficios += Math.abs(item.valor);
    }
  }

  return rows.map((row) => {
    if (row.key === "encargos") {
      return {
        ...row,
        value: encargos,
        pctReceitaLiquida: pct(encargos, receitaLiquida),
      };
    }
    if (row.key === "beneficios") {
      return {
        ...row,
        value: beneficios,
        pctReceitaLiquida: pct(beneficios, receitaLiquida),
      };
    }
    return row;
  });
}

export class FinancialIntelligenceService {
  constructor(
    private readonly tenantId: string,
    private readonly tenantSlug: string,
  ) {}

  async getSnapshot(filters: DreFilters): Promise<FinancialIntelligenceSnapshot> {
    const previousFilters = resolvePreviousPeriod(toDashboardFilters(filters));
    const previousDreFilters: DreFilters = {
      ...filters,
      dataDe: previousFilters.dataDe,
      dataAte: previousFilters.dataAte,
    };

    const [dreService, fluxoService] = await Promise.all([
      createDreService(this.tenantId),
      createFluxoCaixaService(this.tenantId),
    ]);

    const [dre, previousDre, fluxo, ops, rankings] = await Promise.all([
      dreService.getDre(filters),
      dreService.getDre(previousDreFilters),
      fluxoService.getFluxo({
        dataDe: filters.dataDe,
        dataAte: filters.dataAte,
        centroCustoId: filters.centroCustoId,
        categoriaId: filters.categoriaId,
        includeItens: false,
      }),
      this.fetchOpsMetrics(filters, previousDreFilters),
      this.fetchRankings(filters),
    ]);

    const lucroBruto = dre.resumo.margem_contribuicao;
    const prevLucroBruto = previousDre.resumo.margem_contribuicao;
    const opexHierarchy = dre.opexHierarchy ?? [];

    let expenses = buildExpenses(
      this.tenantSlug,
      filters,
      dre.resumo,
      opexHierarchy,
    );
    expenses = enrichPersonnelDetails(
      expenses,
      dre.drillItems ?? [],
      dre.resumo.receita_liquida,
    );

    const cockpit: FiMetricCard[] = [
      card({
        key: "receita_bruta",
        label: "Receita Bruta",
        value: dre.resumo.receita_bruta,
        previous: previousDre.resumo.receita_bruta,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "receita_bruta",
      }),
      card({
        key: "receita_liquida",
        label: "Receita Líquida",
        value: dre.resumo.receita_liquida,
        previous: previousDre.resumo.receita_liquida,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "receita_liquida",
      }),
      card({
        key: "cmv",
        label: "CMV",
        value: dre.resumo.cmv,
        previous: previousDre.resumo.cmv,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "cmv",
      }),
      card({
        key: "lucro_bruto",
        label: "Lucro Bruto",
        value: lucroBruto,
        previous: prevLucroBruto,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "margem_contribuicao",
      }),
      card({
        key: "despesas_operacionais",
        label: "Despesas Operacionais",
        value: dre.resumo.despesas_operacionais,
        previous: previousDre.resumo.despesas_operacionais,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "despesas_operacionais",
      }),
      card({
        key: "ebitda",
        label: "EBITDA",
        value: dre.resumo.ebitda,
        previous: previousDre.resumo.ebitda,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
      }),
      card({
        key: "ebit",
        label: "EBIT",
        value: dre.resumo.ebit ?? dre.resumo.ebitda,
        previous: previousDre.resumo.ebit ?? previousDre.resumo.ebitda,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "ebit",
      }),
      card({
        key: "resultado_liquido",
        label: "Resultado Líquido",
        value: dre.resumo.resultado_final,
        previous: previousDre.resumo.resultado_final,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        linha: "resultado_final",
      }),
    ];

    const be = breakEven(dre.resumo);
    const bePrev = breakEven(previousDre.resumo);

    const margins: FiMetricCard[] = [
      card({
        key: "margem_bruta",
        label: "Margem Bruta",
        value: pct(lucroBruto, dre.resumo.receita_liquida) ?? 0,
        previous: pct(prevLucroBruto, previousDre.resumo.receita_liquida) ?? 0,
        unit: "percent",
        tenantSlug: this.tenantSlug,
        filters,
      }),
      card({
        key: "margem_ebitda",
        label: "Margem EBITDA",
        value: pct(dre.resumo.ebitda, dre.resumo.receita_liquida) ?? 0,
        previous:
          pct(previousDre.resumo.ebitda, previousDre.resumo.receita_liquida) ??
          0,
        unit: "percent",
        tenantSlug: this.tenantSlug,
        filters,
      }),
      card({
        key: "margem_liquida",
        label: "Margem Líquida",
        value: pct(dre.resumo.resultado_final, dre.resumo.receita_liquida) ?? 0,
        previous:
          pct(
            previousDre.resumo.resultado_final,
            previousDre.resumo.receita_liquida,
          ) ?? 0,
        unit: "percent",
        tenantSlug: this.tenantSlug,
        filters,
      }),
      card({
        key: "break_even",
        label: "Break-even",
        value: be ?? 0,
        previous: bePrev ?? 0,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: be != null,
        unavailableReason:
          "Requer margem de contribuição positiva no período para estimar o ponto de equilíbrio.",
      }),
    ];

    const receitaPorCliente =
      ops.clientesCount > 0
        ? dre.resumo.receita_liquida / ops.clientesCount
        : 0;
    const receitaPorClientePrev =
      ops.clientesCount > 0
        ? previousDre.resumo.receita_liquida / ops.clientesCount
        : 0;

    const topClientes = rankings.clientes;
    const topCentros = rankings.unidades;

    const opsKpis: FiMetricCard[] = [
      card({
        key: "ticket_medio",
        label: "Ticket Médio",
        value: ops.ticket,
        previous: ops.ticketPrev,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
      }),
      card({
        key: "receita_por_cliente",
        label: "Receita por cliente",
        value: receitaPorCliente,
        previous: receitaPorClientePrev,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: ops.clientesCount > 0,
        unavailableReason: "Sem clientes ativos para ratear a receita líquida.",
      }),
      card({
        key: "receita_por_os",
        label: "Receita por OS",
        value: 0,
        previous: 0,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: false,
        unavailableReason:
          "Vínculo receita ↔ ordem de serviço ainda não publicado no domínio.",
      }),
      card({
        key: "receita_por_mecanico",
        label: "Receita por mecânico",
        value: 0,
        previous: 0,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: false,
        unavailableReason:
          "Não há ranking de receita por mecânico (só indicadores de retorno).",
      }),
      card({
        key: "receita_por_consultor",
        label: "Receita por consultor",
        value: 0,
        previous: 0,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: false,
        unavailableReason:
          "Ranking de vendedores/consultores ainda não disponível no painel comercial.",
      }),
      card({
        key: "receita_por_unidade",
        label: "Receita por unidade",
        value: topCentros[0]?.value ?? 0,
        previous: 0,
        unit: "currency",
        tenantSlug: this.tenantSlug,
        filters,
        available: topCentros.length > 0,
        unavailableReason:
          "Sem faturamento por centro de custo no período para compor unidade.",
      }),
    ];

    const trends = await this.buildTrends(filters, fluxo.daily);

    const insights = buildDeterministicInsights({
      tenantSlug: this.tenantSlug,
      filters,
      resumo: dre.resumo,
      previous: previousDre.resumo,
      fluxo: fluxo.resumo,
      expenses,
      drillItems: dre.drillItems ?? [],
      topClientes,
      topCentros,
    });

    return {
      filters,
      previousFilters: previousDreFilters,
      periodoLabel: formatPeriodoLabel(filters.dataDe, filters.dataAte),
      previousPeriodoLabel: formatPeriodoLabel(
        previousDreFilters.dataDe,
        previousDreFilters.dataAte,
      ),
      resumo: dre.resumo,
      previousResumo: previousDre.resumo,
      lucroBruto,
      fluxo: fluxo.resumo,
      cockpit,
      margins,
      opsKpis,
      expenses,
      opexHierarchy,
      trends,
      insights,
      topClientes,
      topCentros,
      drillPreview: (dre.drillItems ?? []).slice(0, 12),
    };
  }

  private async fetchOpsMetrics(
    filters: DreFilters,
    previous: DreFilters,
  ): Promise<{ ticket: number; ticketPrev: number; clientesCount: number }> {
    const supabase = await createClient();
    const [vendasNow, vendasPrev, clientes] = await Promise.all([
      supabase
        .from("vendas")
        .select("id, total")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("status", "faturado")
        .gte("data_venda", filters.dataDe)
        .lte("data_venda", filters.dataAte),
      supabase
        .from("vendas")
        .select("id, total")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("status", "faturado")
        .gte("data_venda", previous.dataDe)
        .lte("data_venda", previous.dataAte),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null),
    ]);

    if (vendasNow.error) throw new Error(vendasNow.error.message);
    if (vendasPrev.error) throw new Error(vendasPrev.error.message);
    if (clientes.error) throw new Error(clientes.error.message);

    const sum = (rows: { total: number | string }[]) =>
      rows.reduce((acc, row) => acc + Number(row.total), 0);
    const nowRows = vendasNow.data ?? [];
    const prevRows = vendasPrev.data ?? [];

    return {
      ticket: nowRows.length > 0 ? sum(nowRows) / nowRows.length : 0,
      ticketPrev: prevRows.length > 0 ? sum(prevRows) / prevRows.length : 0,
      clientesCount: clientes.count ?? 0,
    };
  }

  private async fetchRankings(filters: DreFilters): Promise<{
    clientes: FiRankItem[];
    unidades: FiRankItem[];
  }> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendas")
      .select(
        "id, cliente_id, total, centro_custo_id, cliente:clientes(nome), centro:centros_custo!vendas_centro_custo_id_fkey(nome)",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .gte("data_venda", filters.dataDe)
      .lte("data_venda", filters.dataAte);

    if (error) throw new Error(error.message);

    const clientes = new Map<string, FiRankItem>();
    const unidades = new Map<string, FiRankItem>();

    for (const row of data ?? []) {
      const cliente = row.cliente as { nome: string } | null;
      if (row.cliente_id) {
        const prev = clientes.get(row.cliente_id);
        clientes.set(row.cliente_id, {
          id: row.cliente_id,
          label: cliente?.nome ?? "Cliente",
          value: (prev?.value ?? 0) + Number(row.total),
        });
      }

      const centro = row.centro as { nome: string } | null;
      if (row.centro_custo_id) {
        const prev = unidades.get(row.centro_custo_id);
        unidades.set(row.centro_custo_id, {
          id: row.centro_custo_id,
          label: centro?.nome ?? "Unidade",
          value: (prev?.value ?? 0) + Number(row.total),
        });
      }
    }

    const sortTop = (map: Map<string, FiRankItem>) =>
      [...map.values()].sort((a, b) => b.value - a.value).slice(0, 5);

    return { clientes: sortTop(clientes), unidades: sortTop(unidades) };
  }

  private async buildTrends(
    filters: DreFilters,
    fluxoDaily: FluxoCaixaDailyPoint[],
  ): Promise<FiTrendSeries[]> {
    const dreService = await createDreService(this.tenantId);
    const presets = buildTrendPresets();
    const months = eachCalendarMonth(
      presets.m12.dataDe,
      presets.m12.dataAte,
    ).slice(-12);

    const monthly = await Promise.all(
      months.map(async (m) => {
        const monthDre = await dreService.getDre({
          dataDe: m.dataDe,
          dataAte: m.dataAte,
          centroCustoId: filters.centroCustoId,
          categoriaId: filters.categoriaId,
        });
        const label = new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "2-digit",
        }).format(new Date(`${m.dataDe}T12:00:00`));
        return {
          label,
          data: m.dataAte,
          receita: monthDre.resumo.receita_liquida,
          lucro: monthDre.resumo.margem_contribuicao,
          ebitda: monthDre.resumo.ebitda,
          despesas: monthDre.resumo.despesas_operacionais,
          resultado: monthDre.resumo.resultado_final,
        };
      }),
    );

    const buckets = splitPeriodIntoBuckets(filters.dataDe, filters.dataAte, 6);
    const bucketSeries = await Promise.all(
      buckets.map(async (b) => {
        const bucketDre = await dreService.getDre({
          dataDe: b.dataDe,
          dataAte: b.dataAte,
          centroCustoId: filters.centroCustoId,
          categoriaId: filters.categoriaId,
        });
        return {
          label: b.dataAte.slice(5),
          data: b.dataAte,
          value: bucketDre.resumo.ebitda,
          secondary: bucketDre.resumo.despesas_operacionais,
        };
      }),
    );

    return [
      {
        id: "receita-12m",
        label: "Receita líquida — 12 meses",
        description: `Competência mensal · ${presets.m12.label}`,
        points: monthly.map((m) => ({
          label: m.label,
          data: m.data,
          value: m.receita,
        })),
      },
      {
        id: "lucro-12m",
        label: "Lucro bruto — 12 meses",
        description: "Margem de contribuição do DRE por mês",
        points: monthly.map((m) => ({
          label: m.label,
          data: m.data,
          value: m.lucro,
        })),
      },
      {
        id: "ebitda-12m",
        label: "EBITDA — 12 meses",
        description: "Totais mensais do DRE (sem recalcular fórmula)",
        points: monthly.map((m) => ({
          label: m.label,
          data: m.data,
          value: m.ebitda,
        })),
      },
      {
        id: "despesas-12m",
        label: "Despesas operacionais — 12 meses",
        description: "OPEX consolidado por competência",
        points: monthly.map((m) => ({
          label: m.label,
          data: m.data,
          value: m.despesas,
        })),
      },
      {
        id: "resultado-12m",
        label: "Resultado líquido — 12 meses",
        description: "Resultado final do DRE por mês",
        points: monthly.map((m) => ({
          label: m.label,
          data: m.data,
          value: m.resultado,
        })),
      },
      {
        id: "fluxo-periodo",
        label: "Fluxo de Caixa — período",
        description: "Entradas × saídas realizadas (caixa, não competência)",
        points: fluxoDaily.map((d) => ({
          label: d.data.slice(5),
          data: d.data,
          value: d.entradas_realizadas,
          secondary: d.saidas_realizadas,
        })),
      },
      {
        id: "fluxo-saldo",
        label: "Saldo acumulado — período",
        description: "Série diária do Fluxo de Caixa",
        points: fluxoDaily.map((d) => ({
          label: d.data.slice(5),
          data: d.data,
          value: d.saldo_acumulado,
        })),
      },
      {
        id: "ebitda-vs-despesas",
        label: "EBITDA × Despesas — fatias do período",
        description: "Comparação interna do intervalo filtrado",
        points: bucketSeries,
      },
    ];
  }
}

export async function createFinancialIntelligenceService(
  tenantId: string,
  tenantSlug: string,
) {
  return new FinancialIntelligenceService(tenantId, tenantSlug);
}

export { defaultDrePeriodo };
