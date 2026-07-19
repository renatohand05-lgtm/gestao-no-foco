import type { SupabaseClient } from "@supabase/supabase-js";

import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import { createFluxoCaixaService } from "@/lib/financeiro/fluxo-caixa-service";
import {
  calcVariation,
  eachDateInclusive,
  formatPeriodoLabel,
  parseISODate,
  resolvePreviousPeriod,
  splitPeriodIntoBuckets,
} from "@/lib/dashboard/period";
import { toDreFilters, toFluxoCaixaFilters } from "@/lib/dashboard/filters-mapper";
import {
  addToRanking,
  topN,
  type RankingAggregate,
} from "@/lib/dashboard/rankings";
import { buildDashboardIntelligence } from "@/lib/intelligence/dashboard-intelligence";
import { emptyQualidadeOperacionalData } from "@/lib/qualidade-operacional/empty-data";
import { createQualidadeOperacionalService } from "@/lib/qualidade-operacional/qualidade-operacional-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  DashboardCharts,
  DashboardComparableKpiKey,
  DashboardComparisons,
  DashboardExecutiveData,
  DashboardFilters,
  DashboardKpiComparison,
  DashboardKpis,
  DashboardPrimaryData,
  DashboardRankings,
} from "@/types/dashboard-executive";
import type { TenantSegment } from "@/types";
import type { ContasPagarResumo } from "@/types/contas-pagar";
import type { ContasReceberResumo } from "@/types/contas-receber";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

type VendaStats = {
  count: number;
  total: number;
};

type PeriodBundle = {
  kpis: DashboardKpis;
  fluxoCharts: Pick<DashboardCharts, "receitasVsDespesas" | "fluxoAcumulado">;
  faturamentoDiario: DashboardCharts["faturamentoDiario"];
  fluxoResumo: FluxoCaixaResumo | null;
  contasReceber: ContasReceberResumo | null;
  contasPagar: ContasPagarResumo | null;
};

export type DashboardServiceContext = {
  tenantSlug: string;
  tenantName: string;
};

function resolveHasData(kpis: DashboardKpis): boolean {
  return (
    kpis.quantidade_clientes > 0 ||
    kpis.quantidade_vendas > 0 ||
    kpis.faturamento !== 0 ||
    kpis.receita_liquida !== 0 ||
    kpis.saldo_bancario !== 0 ||
    kpis.contas_receber_aberto > 0 ||
    kpis.contas_pagar_aberto > 0 ||
    kpis.entradas_previstas > 0 ||
    kpis.saidas_previstas > 0
  );
}

function buildComparison(
  current: number,
  previous: number,
): DashboardKpiComparison {
  const { variationPct, trend } = calcVariation(current, previous);
  return { current, previous, variationPct, trend };
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(parseISODate(date));
}

function formatBucketLabel(dataDe: string, dataAte: string) {
  if (dataDe === dataAte) return formatDayLabel(dataDe);
  return `${formatDayLabel(dataDe)}–${formatDayLabel(dataAte)}`;
}

export class DashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly segment: TenantSegment | null,
  ) {}

  async getPrimaryData(
    filters: DashboardFilters,
  ): Promise<DashboardPrimaryData> {
    const previousFilters = resolvePreviousPeriod(filters);

    const [current, previous] = await Promise.all([
      this.buildPeriodBundle(filters, {
        includeFaturamentoDiario: false,
        includeOpenBalances: true,
        includeClientes: true,
      }),
      this.buildPeriodBundle(previousFilters, {
        includeFaturamentoDiario: false,
        includeOpenBalances: false,
        includeClientes: false,
      }),
    ]);

    const comparisons = this.buildComparisons(current.kpis, previous.kpis);

    return {
      kpis: current.kpis,
      comparisons,
      fluxoCharts: current.fluxoCharts,
      fluxoResumo: current.fluxoResumo!,
      contasReceber: current.contasReceber!,
      contasPagar: current.contasPagar!,
      periodo: {
        dataDe: filters.dataDe,
        dataAte: filters.dataAte,
        label: formatPeriodoLabel(filters.dataDe, filters.dataAte),
      },
      periodoAnterior: {
        dataDe: previousFilters.dataDe,
        dataAte: previousFilters.dataAte,
        label: formatPeriodoLabel(
          previousFilters.dataDe,
          previousFilters.dataAte,
        ),
      },
      filters,
      segment: this.segment,
      hasData: resolveHasData(current.kpis),
    };
  }

  async getHeavyChartSeries(filters: DashboardFilters) {
    const [faturamentoDiario, ebitdaEvolucao] = await Promise.all([
      this.fetchFaturamentoDiario(filters),
      this.fetchEbitdaEvolution(filters),
    ]);
    return { faturamentoDiario, ebitdaEvolucao };
  }

  async getChartsData(filters: DashboardFilters): Promise<DashboardCharts> {
    const [primary, heavy] = await Promise.all([
      this.getPrimaryData(filters),
      this.getHeavyChartSeries(filters),
    ]);

    return {
      faturamentoDiario: heavy.faturamentoDiario,
      receitasVsDespesas: primary.fluxoCharts.receitasVsDespesas,
      fluxoAcumulado: primary.fluxoCharts.fluxoAcumulado,
      ebitdaEvolucao: heavy.ebitdaEvolucao,
    };
  }

  async getRankingsData(filters: DashboardFilters): Promise<DashboardRankings> {
    return this.fetchRankings(filters);
  }

  async getQualityData(filters: DashboardFilters) {
    try {
      const qualidadeService = await createQualidadeOperacionalService(
        this.tenantId,
      );
      return await qualidadeService.getQualidadeOperacional(filters);
    } catch {
      return emptyQualidadeOperacionalData();
    }
  }

  async buildIntelligenceFromParts(
    filters: DashboardFilters,
    context: DashboardServiceContext,
    primary: DashboardPrimaryData,
    rankings: DashboardRankings,
    qualidadeOperacional: Awaited<ReturnType<DashboardService["getQualityData"]>>,
  ) {
    return buildDashboardIntelligence({
      tenantId: this.tenantId,
      tenantSlug: context.tenantSlug,
      tenantName: context.tenantName,
      segment: this.segment,
      filters,
      kpis: primary.kpis,
      comparisons: primary.comparisons,
      rankingClientes: rankings.clientes,
      fluxoResumo: primary.fluxoResumo,
      contasReceber: primary.contasReceber,
      contasPagar: primary.contasPagar,
      qualidadeOperacional,
    });
  }

  async getIntelligenceData(
    filters: DashboardFilters,
    context: DashboardServiceContext,
  ) {
    const [primary, rankings, qualidadeOperacional] = await Promise.all([
      this.getPrimaryData(filters),
      this.getRankingsData(filters),
      this.getQualityData(filters),
    ]);

    const intelligence = await this.buildIntelligenceFromParts(
      filters,
      context,
      primary,
      rankings,
      qualidadeOperacional,
    );

    return { intelligence, rankings, qualidadeOperacional, primary };
  }

  async getDashboard(
    filters: DashboardFilters,
    context: DashboardServiceContext,
  ): Promise<DashboardExecutiveData> {
    const primary = await this.getPrimaryData(filters);
    const [heavy, rankings, qualidadeOperacional] = await Promise.all([
      this.getHeavyChartSeries(filters),
      this.getRankingsData(filters),
      this.getQualityData(filters),
    ]);

    const intelligence = await this.buildIntelligenceFromParts(
      filters,
      context,
      primary,
      rankings,
      qualidadeOperacional,
    );

    return {
      kpis: primary.kpis,
      comparisons: primary.comparisons,
      charts: {
        faturamentoDiario: heavy.faturamentoDiario,
        receitasVsDespesas: primary.fluxoCharts.receitasVsDespesas,
        fluxoAcumulado: primary.fluxoCharts.fluxoAcumulado,
        ebitdaEvolucao: heavy.ebitdaEvolucao,
      },
      rankings,
      intelligence,
      qualidadeOperacional,
      periodo: primary.periodo,
      periodoAnterior: primary.periodoAnterior,
      filters,
      segment: this.segment,
      hasData: primary.hasData,
    };
  }

  private buildComparisons(
    current: DashboardKpis,
    previous: DashboardKpis,
  ): DashboardComparisons {
    const keys: DashboardComparableKpiKey[] = [
      "faturamento",
      "receita_liquida",
      "ebitda",
      "ticket_medio",
      "margem_media",
      "cmv",
      "quantidade_vendas",
    ];

    const result = {} as DashboardComparisons;
    for (const key of keys) {
      result[key] = buildComparison(current[key], previous[key]);
    }

    // Snapshot atual vs período anterior: variação usa vencimentos do período (Fluxo).
    result.contas_receber_aberto = buildComparison(
      current.entradas_previstas,
      previous.entradas_previstas,
    );
    result.contas_pagar_aberto = buildComparison(
      current.saidas_previstas,
      previous.saidas_previstas,
    );

    return result;
  }

  private async buildPeriodBundle(
    filters: DashboardFilters,
    options: {
      includeFaturamentoDiario: boolean;
      includeOpenBalances: boolean;
      includeClientes: boolean;
    },
  ): Promise<PeriodBundle> {
    const [dreService, fluxoService] = await Promise.all([
      createDreService(this.tenantId),
      createFluxoCaixaService(this.tenantId),
    ]);

    const dreFilters = toDreFilters(filters);
    const fluxoFilters = toFluxoCaixaFilters(filters, "all");

    const [dre, fluxo, vendasStats, openBalances, clientesCount, faturamentoDiario] =
      await Promise.all([
        dreService.getDre(dreFilters),
        fluxoService.getFluxo({ ...fluxoFilters, includeItens: false }),
        this.fetchVendasStats(filters),
        options.includeOpenBalances
          ? this.fetchOpenBalances()
          : Promise.resolve({
              receber: null as ContasReceberResumo | null,
              pagar: null as ContasPagarResumo | null,
            }),
        options.includeClientes
          ? this.fetchClientesCount()
          : Promise.resolve(0),
        options.includeFaturamentoDiario
          ? this.fetchFaturamentoDiario(filters)
          : Promise.resolve(
              [] as Awaited<ReturnType<DashboardService["fetchFaturamentoDiario"]>>,
            ),
      ]);

    const margemMedia =
      dre.resumo.receita_liquida > 0
        ? (dre.resumo.margem_contribuicao / dre.resumo.receita_liquida) * 100
        : 0;

    /**
     * CR/CP em aberto são snapshot atual (getResumo).
     * No período anterior usamos entradas/saídas previstas do Fluxo
     * (títulos com vencimento no período) para permitir comparação.
     */
    const contasReceber =
      options.includeOpenBalances && openBalances.receber
        ? openBalances.receber.total_aberto
        : fluxo.resumo.entradas_previstas;
    const contasPagar =
      options.includeOpenBalances && openBalances.pagar
        ? openBalances.pagar.total_aberto
        : fluxo.resumo.saidas_previstas;

    const kpis: DashboardKpis = {
      faturamento: dre.resumo.receita_bruta,
      receita_liquida: dre.resumo.receita_liquida,
      ebitda: dre.resumo.ebitda,
      cmv: dre.resumo.cmv,
      saldo_bancario: fluxo.resumo.saldo_atual,
      contas_receber_aberto: contasReceber,
      contas_pagar_aberto: contasPagar,
      entradas_previstas: fluxo.resumo.entradas_previstas,
      saidas_previstas: fluxo.resumo.saidas_previstas,
      ticket_medio:
        vendasStats.count > 0 ? vendasStats.total / vendasStats.count : 0,
      quantidade_clientes: clientesCount,
      quantidade_vendas: vendasStats.count,
      margem_media: margemMedia,
    };

    const fluxoCharts = {
      receitasVsDespesas: fluxo.daily.map((point) => ({
        label: formatDayLabel(point.data),
        data: point.data,
        value: point.entradas_realizadas,
        secondary: point.saidas_realizadas,
      })),
      fluxoAcumulado: fluxo.daily.map((point) => ({
        label: formatDayLabel(point.data),
        data: point.data,
        value: point.saldo_acumulado,
      })),
    };

    return {
      kpis,
      fluxoCharts,
      faturamentoDiario,
      fluxoResumo: options.includeOpenBalances ? fluxo.resumo : null,
      contasReceber: openBalances.receber,
      contasPagar: openBalances.pagar,
    };
  }

  private async fetchOpenBalances(): Promise<{
    receber: ContasReceberResumo;
    pagar: ContasPagarResumo;
  }> {
    const [contaReceberService, contaPagarService] = await Promise.all([
      createContaReceberService(this.tenantId),
      createContaPagarService(this.tenantId),
    ]);
    const [resumoReceber, resumoPagar] = await Promise.all([
      contaReceberService.getResumo(),
      contaPagarService.getResumo(),
    ]);
    return {
      receber: resumoReceber,
      pagar: resumoPagar,
    };
  }

  private applyVendasFilters<T extends { eq: (column: string, value: string) => T }>(
    query: T,
    filters: DashboardFilters,
  ): T {
    let scoped = query;
    if (filters.categoria) {
      scoped = scoped.eq("categoria_financeira_id", filters.categoria);
    }
    if (filters.centroCusto) {
      scoped = scoped.eq("centro_custo_id", filters.centroCusto);
    }
    return scoped;
  }

  private async fetchEbitdaEvolution(filters: DashboardFilters) {
    const buckets = splitPeriodIntoBuckets(filters.dataDe, filters.dataAte, 8);
    const dreService = await createDreService(this.tenantId);

    const results = await Promise.all(
      buckets.map(async (bucket) => {
        const dre = await dreService.getDre(toDreFilters(bucket));
        return {
          label: formatBucketLabel(bucket.dataDe, bucket.dataAte),
          data: bucket.dataAte,
          value: dre.resumo.ebitda,
        };
      }),
    );

    return results;
  }

  private async fetchFaturamentoDiario(filters: DashboardFilters) {
    const dates = eachDateInclusive(filters.dataDe, filters.dataAte);
    const map = new Map(dates.map((date) => [date, 0]));

    const [vendasResult, crResult] = await Promise.all([
      this.applyVendasFilters(
        this.supabase
          .from("vendas")
          .select("data_venda, subtotal")
          .eq("tenant_id", this.tenantId)
          .is("deleted_at", null)
          .eq("status", "faturado")
          .gte("data_venda", filters.dataDe)
          .lte("data_venda", filters.dataAte),
        filters,
      ),
      this.supabase
        .from("contas_receber")
        .select("data_competencia, data_emissao, valor_original")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .is("venda_id", null)
        .neq("status", "cancelado")
        .gte("data_competencia", filters.dataDe)
        .lte("data_competencia", filters.dataAte),
    ]);

    if (vendasResult.error) throw new Error(vendasResult.error.message);
    if (crResult.error) throw new Error(crResult.error.message);

    for (const row of vendasResult.data ?? []) {
      const key = String(row.data_venda).slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + Number(row.subtotal));
    }

    for (const row of crResult.data ?? []) {
      const key = String(row.data_competencia ?? row.data_emissao).slice(0, 10);
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + Number(row.valor_original));
    }

    return dates.map((date) => ({
      label: formatDayLabel(date),
      data: date,
      value: map.get(date) ?? 0,
    }));
  }

  private async fetchRankings(
    filters: DashboardFilters,
  ): Promise<DashboardRankings> {
    /**
     * Uma leitura de vendas atende Top clientes + Top categorias.
     * Itens e CR avulsas rodam em paralelo (join !inner / filtros no banco).
     */
    const [vendasResult, itensResult, crResult] = await Promise.all([
      this.applyVendasFilters(
        this.supabase
          .from("vendas")
          .select(
            "id, cliente_id, total, categoria_financeira_id, cliente:clientes(nome), categoria_financeira:categorias_financeiras!vendas_categoria_financeira_id_fkey(nome)",
          )
          .eq("tenant_id", this.tenantId)
          .is("deleted_at", null)
          .eq("status", "faturado")
          .gte("data_venda", filters.dataDe)
          .lte("data_venda", filters.dataAte),
        filters,
      ),
      this.fetchRankingItensRows(filters),
      this.supabase
        .from("contas_receber")
        .select(
          "valor_original, categoria_financeira_id, categoria_financeira:categorias_financeiras!contas_receber_categoria_financeira_id_fkey(nome)",
        )
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .is("venda_id", null)
        .neq("status", "cancelado")
        .not("categoria_financeira_id", "is", null)
        .gte("data_competencia", filters.dataDe)
        .lte("data_competencia", filters.dataAte),
    ]);

    if (vendasResult.error) throw new Error(vendasResult.error.message);
    if (itensResult.error) throw new Error(itensResult.error.message);
    if (crResult.error) throw new Error(crResult.error.message);

    const clientes = new Map<string, RankingAggregate>();
    const categorias = new Map<string, RankingAggregate>();
    const produtos = new Map<string, RankingAggregate>();
    const servicos = new Map<string, RankingAggregate>();

    for (const row of vendasResult.data ?? []) {
      const cliente = row.cliente as { nome: string } | null;
      addToRanking(
        clientes,
        row.cliente_id,
        cliente?.nome ?? "Cliente",
        Number(row.total),
      );

      if (row.categoria_financeira_id) {
        const categoria = row.categoria_financeira as { nome: string } | null;
        addToRanking(
          categorias,
          row.categoria_financeira_id,
          categoria?.nome ?? "Sem categoria",
          Number(row.total),
        );
      }
    }

    for (const row of crResult.data ?? []) {
      if (!row.categoria_financeira_id) continue;
      const categoria = row.categoria_financeira as { nome: string } | null;
      addToRanking(
        categorias,
        row.categoria_financeira_id,
        categoria?.nome ?? "Sem categoria",
        Number(row.valor_original),
      );
    }

    for (const item of itensResult.data ?? []) {
      const key = item.produto_id ?? `desc:${item.descricao}`;
      const label = item.descricao || "Item";
      if (item.tipo_item === "servico") {
        addToRanking(servicos, key, label, Number(item.total));
      } else if (item.tipo_item === "produto") {
        addToRanking(produtos, key, label, Number(item.total));
      }
    }

    return {
      clientes: topN(clientes),
      produtos: topN(produtos),
      servicos: topN(servicos),
      categorias: topN(categorias),
    };
  }

  /**
   * Itens de vendas faturadas no período — 1 query com !inner
   * (evita round-trip ids + IN amplo). Filtra tipo_item no banco.
   */
  private async fetchRankingItensRows(filters: DashboardFilters) {
    let query = this.supabase
      .from("venda_itens")
      .select(
        "produto_id, descricao, tipo_item, total, venda:vendas!venda_itens_venda_id_fkey!inner(id)",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("tipo_item", ["produto", "servico"])
      .eq("venda.status", "faturado")
      .is("venda.deleted_at", null)
      .gte("venda.data_venda", filters.dataDe)
      .lte("venda.data_venda", filters.dataAte);

    if (filters.categoria) {
      query = query.eq("venda.categoria_financeira_id", filters.categoria);
    }
    if (filters.centroCusto) {
      query = query.eq("venda.centro_custo_id", filters.centroCusto);
    }

    return query;
  }

  private async fetchVendasStats(filters: DashboardFilters): Promise<VendaStats> {
    const { data, error } = await this.applyVendasFilters(
      this.supabase
        .from("vendas")
        .select("id, total")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("status", "faturado")
        .gte("data_venda", filters.dataDe)
        .lte("data_venda", filters.dataAte),
      filters,
    );

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
      count: rows.length,
      total: rows.reduce((acc, row) => acc + Number(row.total), 0),
    };
  }

  private async fetchClientesCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}

export async function createDashboardService(
  tenantId: string,
  segment: TenantSegment | null,
) {
  const supabase = await createClient();
  return new DashboardService(supabase, tenantId, segment);
}

export function defaultDashboardPeriodo(now = new Date()): DashboardFilters {
  return defaultDrePeriodo(now);
}
