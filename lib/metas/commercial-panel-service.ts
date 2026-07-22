import type { SupabaseClient } from "@supabase/supabase-js";

import {
  META_DIARIA_REGRA,
  buildCommercialInsights,
  buildImpactosFromInsights,
  computeVolatility,
  resolveConfianca,
  resolveHeatmapBand,
  resolveProbabilidade,
  resolveTendencia,
  type CommercialCentroRow,
  type CommercialDailyPoint,
  type CommercialPanelData,
  type CommercialRankingItem,
  type CommercialRankings,
  type CommercialTicketResumo,
} from "@/types/commercial-panel";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { createDashboardService } from "@/lib/dashboard/dashboard-service";
import {
  buildMetaProjecao,
  countWeekdaysInMonth,
  monthBounds,
  previousCompetencia,
  resolveCompetenciaFromPeriod,
  toCompetenciaMonthStart,
} from "@/lib/metas/projection";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  DashboardFilters,
  DashboardRankingItem,
} from "@/types/dashboard-executive";
import type { MetaVendasMensal } from "@/types/metas-vendas";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dayLabel(iso: string) {
  const day = Number(iso.slice(8, 10));
  return String(day);
}

function isWeekend(iso: string) {
  const d = new Date(`${iso}T12:00:00`).getDay();
  return d === 0 || d === 6;
}

function isWeekdayIso(iso: string) {
  return !isWeekend(iso);
}

function eachDate(dataDe: string, dataAte: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${dataDe}T12:00:00`);
  const end = new Date(`${dataAte}T12:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function mapRankingItems(
  items: DashboardRankingItem[],
  total: number,
): CommercialRankingItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    valor: item.value,
    participacao_pct:
      total > 0 ? (item.value / total) * 100 : null,
  }));
}

type VendaSlim = {
  data_venda: string;
  subtotal: number;
  total: number;
  centro_custo_id: string | null;
};

type CrSlim = {
  data_competencia: string | null;
  data_emissao: string;
  valor_original: number;
  centro_custo_id: string | null;
};

export class CommercialPanelService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getPanel(filters: DashboardFilters): Promise<CommercialPanelData> {
    const competencia = resolveCompetenciaFromPeriod(
      filters.dataDe,
      filters.dataAte,
    );
    const centroId = filters.centroCusto ?? null;
    const { dataDe, dataAte, year, monthIndex } = monthBounds(competencia);
    const prevComp = previousCompetencia(competencia);
    const prevBounds = monthBounds(prevComp);

    const metaService = await createMetaVendasService(this.tenantId);
    const dashboardService = await createDashboardService(this.tenantId, null);
    const rankingFilters: DashboardFilters = {
      ...filters,
      dataDe,
      dataAte,
    };

    const [
      projecao,
      dailyMap,
      ticketAtual,
      ticketAnterior,
      centrosOptions,
      metasMes,
      vendasMes,
      crMes,
      vendas7d,
      vendas7dPrev,
      dashboardRankings,
    ] = await Promise.all([
      metaService.getProjecaoFromDashboardFilters(filters),
      this.fetchDailyFaturamento(dataDe, dataAte, centroId),
      this.fetchTicketStats(dataDe, dataAte, centroId),
      this.fetchTicketStats(prevBounds.dataDe, prevBounds.dataAte, centroId),
      metaService.listCentrosCustoOptions(),
      this.listMetasCompetencia(competencia),
      this.fetchVendasSlim(dataDe, dataAte, centroId),
      this.fetchCrAvulsasSlim(dataDe, dataAte, centroId),
      this.fetchDailySumLastNDays(7, centroId),
      this.fetchDailySumPreviousWindow(7, 7, centroId),
      dashboardService.getRankingsData(rankingFilters),
    ]);

    const diasUteisTotais = countWeekdaysInMonth(year, monthIndex);
    const metaValor = projecao.valor_meta;
    const metaDiariaUtil =
      metaValor !== null && diasUteisTotais > 0
        ? metaValor / diasUteisTotais
        : 0;

    const todayIso = civilDateInTimezone(new Date(), resolveTenantTimezone());
    const dates = eachDate(dataDe, dataAte);
    const mediaUtil =
      projecao.dias_uteis_decorridos > 0
        ? projecao.faturamento_realizado / projecao.dias_uteis_decorridos
        : 0;

    let acumuladoReal = 0;
    let acumuladoProj = 0;
    let acumuladoMeta = 0;
    const daily: CommercialDailyPoint[] = dates.map((data) => {
      const weekend = isWeekend(data);
      const util = isWeekdayIso(data);
      const future = data > todayIso && !projecao.mes_encerrado;
      const realizado = future ? 0 : (dailyMap.get(data) ?? 0);
      const metaDia = util ? metaDiariaUtil : 0;
      const projetado = future ? (util ? mediaUtil : 0) : realizado;
      acumuladoReal += realizado;
      acumuladoProj += future ? projetado : realizado;
      acumuladoMeta += metaDia;
      const diferenca = future ? null : realizado - metaDia;
      const diferencaPct =
        metaDia > 0 && !future
          ? ((realizado - metaDia) / metaDia) * 100
          : null;
      const heatmap_band = resolveHeatmapBand({
        isWeekend: weekend,
        isFuture: future,
        isUtil: util,
        metaDiaria: metaDia,
        realizado,
        diferencaPct,
      });

      return {
        data,
        label: dayLabel(data),
        is_weekend: weekend,
        is_future: future,
        is_util: util,
        meta_diaria: metaDia,
        realizado,
        diferenca,
        diferenca_pct: diferencaPct,
        projetado,
        acumulado_realizado: acumuladoReal,
        acumulado_projetado: acumuladoProj,
        acumulado_meta: acumuladoMeta,
        diferenca_acumulada: future ? null : acumuladoReal - acumuladoMeta,
        heatmap_band,
      };
    });

    const last7Dates = dates.filter((d) => d <= todayIso).slice(-7);
    const recentDays = last7Dates.map((d) => dailyMap.get(d) ?? 0);
    const diasComMovimento = recentDays.filter((v) => v > 0).length;
    const volatilidade = computeVolatility(recentDays);

    const tendenciaPct =
      vendas7dPrev === 0
        ? vendas7d === 0
          ? 0
          : null
        : ((vendas7d - vendas7dPrev) / Math.abs(vendas7dPrev)) * 100;
    const tendencia = resolveTendencia(tendenciaPct, diasComMovimento);

    const { confianca, motivo: confiancaMotivo } = resolveConfianca({
      diasUteisDecorridos: projecao.dias_uteis_decorridos,
      quantidadeVendas: ticketAtual.count,
    });

    const {
      probabilidade,
      score: probabilidadeScore,
      motivo: probabilidadeMotivo,
    } = resolveProbabilidade({
      valorMeta: projecao.valor_meta,
      projecaoUteis: projecao.projecao_dias_uteis,
      ritmoDiferencaPp: projecao.ritmo_diferenca_pp,
      tendencia,
      volatilidade,
      diasUteisDecorridos: projecao.dias_uteis_decorridos,
      percentualAtingido: projecao.percentual_atingido,
    });

    const ticket = this.buildTicketResumo(
      ticketAtual,
      ticketAnterior,
      projecao.projecao_dias_uteis,
    );

    const centros = await this.buildCentrosRows({
      competencia,
      dataDe,
      dataAte,
      centrosOptions,
      metasMes,
      vendasMes,
      crMes,
      todayIso,
    });

    const clientesTotal = dashboardRankings.clientes.reduce(
      (acc, item) => acc + item.value,
      0,
    );
    const produtosTotal = dashboardRankings.produtos.reduce(
      (acc, item) => acc + item.value,
      0,
    );
    const servicosTotal = dashboardRankings.servicos.reduce(
      (acc, item) => acc + item.value,
      0,
    );
    const centrosRankingTotal = centros.reduce(
      (acc, row) => acc + row.faturamento_realizado,
      0,
    );

    const rankings: CommercialRankings = {
      clientes: mapRankingItems(dashboardRankings.clientes, clientesTotal),
      produtos: mapRankingItems(dashboardRankings.produtos, produtosTotal),
      servicos: mapRankingItems(dashboardRankings.servicos, servicosTotal),
      centros: centros.map((row) => ({
        id: row.centro_custo_id,
        label: row.centro_nome,
        valor: row.faturamento_realizado,
        participacao_pct:
          centrosRankingTotal > 0
            ? (row.faturamento_realizado / centrosRankingTotal) * 100
            : null,
      })),
      vendedores: [],
      vendedor_disponivel: false,
    };

    const insights = buildCommercialInsights({
      projecao,
      tendencia,
      tendenciaPct,
      probabilidade,
      ticket,
      centros,
      rankingClientes: rankings.clientes,
      faturamentoTotal: projecao.faturamento_realizado,
      mediaDiariaUtil: mediaUtil,
      monthFilters: { dataDe, dataAte },
    });
    const impactos = buildImpactosFromInsights(insights);

    return {
      competencia,
      dataDe,
      dataAte,
      centro_custo_id: centroId,
      projecao,
      tendencia,
      tendencia_pct: tendenciaPct,
      tendencia_janela_dias: 7,
      tendencia_insuficiente: tendencia === "insuficiente",
      confianca,
      confianca_motivo: confiancaMotivo,
      probabilidade,
      probabilidade_score: probabilidadeScore,
      probabilidade_motivo: probabilidadeMotivo,
      ticket,
      daily,
      centros,
      canais: [],
      canal_disponivel: false,
      share_13m: [],
      share_modo: "indisponivel",
      rankings,
      insights,
      impactos,
      auditoria: {
        tem_canal: false,
        tem_vendedor: false,
        tem_meta_ticket: false,
      },
      meta_diaria_regra: META_DIARIA_REGRA,
    };
  }

  private buildTicketResumo(
    atual: { count: number; total: number },
    anterior: { count: number; total: number },
    projecaoUteis: number,
  ): CommercialTicketResumo {
    const ticketAtual =
      atual.count > 0 ? atual.total / atual.count : 0;
    const ticketAnterior =
      anterior.count > 0 ? anterior.total / anterior.count : 0;
    const variacao =
      ticketAnterior === 0
        ? ticketAtual === 0
          ? 0
          : null
        : ((ticketAtual - ticketAnterior) / Math.abs(ticketAnterior)) * 100;

    const qtdProjetada =
      ticketAtual > 0 ? projecaoUteis / ticketAtual : null;
    const projecaoTicket =
      qtdProjetada && qtdProjetada > 0 ? projecaoUteis / qtdProjetada : ticketAtual;

    return {
      ticket_medio_atual: ticketAtual,
      ticket_medio_anterior: ticketAnterior,
      quantidade_vendas: atual.count,
      quantidade_vendas_anterior: anterior.count,
      variacao_pct: variacao,
      meta_ticket: null,
      projecao_ticket: projecaoTicket,
      gap_ticket: null,
      impacto_faturamento_estimado:
        variacao === null
          ? null
          : (ticketAtual - ticketAnterior) * atual.count,
    };
  }

  private async buildCentrosRows(input: {
    competencia: string;
    dataDe: string;
    dataAte: string;
    centrosOptions: { id: string; nome: string }[];
    metasMes: MetaVendasMensal[];
    vendasMes: VendaSlim[];
    crMes: CrSlim[];
    todayIso: string;
  }): Promise<CommercialCentroRow[]> {
    const fatByCentro = new Map<string, number>();
    const ticketByCentro = new Map<string, { count: number; total: number }>();

    for (const row of input.vendasMes) {
      const key = row.centro_custo_id ?? "__none__";
      fatByCentro.set(key, (fatByCentro.get(key) ?? 0) + Number(row.total));
      const ticket = ticketByCentro.get(key) ?? { count: 0, total: 0 };
      ticket.count += 1;
      ticket.total += Number(row.total);
      ticketByCentro.set(key, ticket);
    }

    for (const row of input.crMes) {
      const key = row.centro_custo_id ?? "__none__";
      fatByCentro.set(
        key,
        (fatByCentro.get(key) ?? 0) + Number(row.valor_original),
      );
    }

    const metaByCentro = new Map<string, MetaVendasMensal>();
    for (const meta of input.metasMes) {
      if (meta.centro_custo_id) {
        metaByCentro.set(meta.centro_custo_id, meta);
      }
    }

    const rows: CommercialCentroRow[] = [];

    for (const centro of input.centrosOptions) {
      const meta = metaByCentro.get(centro.id) ?? null;
      const realizado = fatByCentro.get(centro.id) ?? 0;
      const ticket = ticketByCentro.get(centro.id) ?? { count: 0, total: 0 };

      if (!meta && realizado === 0) continue;

      const proj = buildMetaProjecao({
        competencia: input.competencia,
        centroCustoId: centro.id,
        meta,
        faturamentoRealizado: realizado,
        faturamentoMesAnterior: null,
      });

      rows.push({
        centro_custo_id: centro.id,
        centro_nome: centro.nome,
        valor_meta: meta ? Number(meta.valor_meta) : null,
        faturamento_realizado: realizado,
        projecao_dias_uteis: proj.projecao_dias_uteis,
        percentual_atingido: proj.percentual_atingido,
        gap_projetado: proj.gap_projetado_uteis,
        necessario_por_dia_util: proj.necessario_por_dia_util,
        ticket_medio: ticket.count > 0 ? ticket.total / ticket.count : 0,
        quantidade_vendas: ticket.count,
        tendencia: "insuficiente",
        status: proj.status,
      });
    }

    return rows.sort(
      (a, b) => b.faturamento_realizado - a.faturamento_realizado,
    );
  }

  private async listMetasCompetencia(
    competencia: string,
  ): Promise<MetaVendasMensal[]> {
    const comp = toCompetenciaMonthStart(competencia);
    const { data, error } = await this.supabase
      .from("metas_vendas_mensais")
      .select(
        `
        id, tenant_id, competencia, valor_meta, centro_custo_id, observacao,
        created_by, created_at, updated_at,
        centro_custo:centros_custo ( id, nome )
      `,
      )
      .eq("tenant_id", this.tenantId)
      .eq("competencia", comp)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      competencia: row.competencia,
      valor_meta: Number(row.valor_meta),
      centro_custo_id: row.centro_custo_id,
      centro_custo_nome:
        (row.centro_custo as { nome?: string } | null)?.nome ?? null,
      observacao: row.observacao,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  private async fetchDailyFaturamento(
    dataDe: string,
    dataAte: string,
    centroId: string | null,
  ) {
    const dates = eachDate(dataDe, dataAte);
    const map = new Map(dates.map((d) => [d, 0]));

    const [vendas, cr] = await Promise.all([
      this.fetchVendasSlim(dataDe, dataAte, centroId),
      this.fetchCrAvulsasSlim(dataDe, dataAte, centroId),
    ]);

    for (const row of vendas) {
      const key = String(row.data_venda).slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + Number(row.total));
    }
    for (const row of cr) {
      const key = String(row.data_competencia ?? row.data_emissao).slice(0, 10);
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + Number(row.valor_original));
    }

    return map;
  }

  private async fetchVendasSlim(
    dataDe: string,
    dataAte: string,
    centroId: string | null,
  ): Promise<VendaSlim[]> {
    let query = this.supabase
      .from("vendas")
      .select("data_venda, subtotal, total, centro_custo_id")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .gte("data_venda", dataDe)
      .lte("data_venda", dataAte);

    if (centroId) query = query.eq("centro_custo_id", centroId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as VendaSlim[];
  }

  private async fetchCrAvulsasSlim(
    dataDe: string,
    dataAte: string,
    centroId: string | null,
  ): Promise<CrSlim[]> {
    let query = this.supabase
      .from("contas_receber")
      .select(
        "data_competencia, data_emissao, valor_original, centro_custo_id",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .is("venda_id", null)
      .neq("status", "cancelado")
      .gte("data_competencia", dataDe)
      .lte("data_competencia", dataAte);

    if (centroId) query = query.eq("centro_custo_id", centroId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as CrSlim[];
  }

  private async fetchTicketStats(
    dataDe: string,
    dataAte: string,
    centroId: string | null,
  ) {
    let query = this.supabase
      .from("vendas")
      .select("id, total")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .gte("data_venda", dataDe)
      .lte("data_venda", dataAte);

    if (centroId) query = query.eq("centro_custo_id", centroId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return {
      count: rows.length,
      total: rows.reduce((acc, row) => acc + Number(row.total), 0),
    };
  }

  private async fetchDailySumLastNDays(
    days: number,
    centroId: string | null,
  ) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const dataDe = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const dataAte = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    const map = await this.fetchDailyFaturamento(dataDe, dataAte, centroId);
    return Array.from(map.values()).reduce((a, b) => a + b, 0);
  }

  private async fetchDailySumPreviousWindow(
    days: number,
    offsetDays: number,
    centroId: string | null,
  ) {
    const end = new Date();
    end.setDate(end.getDate() - offsetDays);
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    const dataDe = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const dataAte = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    const map = await this.fetchDailyFaturamento(dataDe, dataAte, centroId);
    return Array.from(map.values()).reduce((a, b) => a + b, 0);
  }
}

export async function createCommercialPanelService(tenantId: string) {
  const supabase = await createClient();
  return new CommercialPanelService(supabase, tenantId);
}
