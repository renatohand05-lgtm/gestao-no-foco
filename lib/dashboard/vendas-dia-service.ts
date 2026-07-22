import type { SupabaseClient } from "@supabase/supabase-js";

import {
  aggregateFaturamentoLiquido,
  calcFaltaParaMeta,
  calcPercentualAtingido,
  classifyMetaDiaStatus,
  isVendaValidaParaFaturamento,
  type MetaDiaStatus,
  valorBrutoVenda,
  valorLiquidoVenda,
} from "@/lib/dashboard/faturamento-agregacao";
import {
  civilDateInTimezone,
  civilTimeInTimezone,
  firstDayOfMonthCivil,
  formatDateTimeInTimezone,
  resolveTenantTimezone,
  sameWeekdayPreviousWeek,
  shiftCivilDate,
} from "@/lib/dashboard/tenant-timezone";
import { resolveMetaDiaria } from "@/lib/metas/meta-diaria";
import { toCompetenciaMonthStart } from "@/lib/metas/projection";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type VendaDiaDrillItem = {
  id: string;
  numero: number;
  horario: string;
  data_venda: string;
  cliente: string;
  vendedor: string | null;
  valor_bruto: number;
  desconto: number;
  valor_liquido: number;
  origem: string;
  canal_venda: string;
};

export type DashboardHojeSnapshot = {
  timezone: string;
  data_hoje: string;
  atualizado_em: string;
  atualizado_em_label: string;
  hoje: {
    faturamento: number;
    meta: number | null;
    percentual: number | null;
    falta: number | null;
    quantidade_vendas: number;
    ticket_medio: number;
    status: MetaDiaStatus;
    meta_fonte: string;
  };
  mes: {
    faturamento: number;
    meta: number | null;
    percentual: number | null;
    projecao_fechamento: number | null;
    media_diaria: number;
    melhor_dia: { data: string; valor: number } | null;
    quantidade_vendas: number;
    ticket_medio: number;
  };
  comparacoes: {
    vs_ontem_pct: number | null;
    vs_ontem_valor: number;
    vs_mesmo_dia_semana_anterior_pct: number | null;
    vs_mesmo_dia_semana_anterior_valor: number;
  };
  serie_diaria: Array<{
    data: string;
    realizado: number;
    meta_diaria: number;
    acumulado_realizado: number;
    acumulado_meta: number;
    quantidade_vendas: number;
    ticket_medio: number;
  }>;
  vendas_hoje: VendaDiaDrillItem[];
};

type VendaRow = {
  id: string;
  numero: number;
  data_venda: string;
  status: string;
  subtotal: number;
  desconto_total: number;
  total: number;
  canal_venda: string;
  created_at: string;
  deleted_at: string | null;
  vendedor_id: string | null;
  cliente: { nome: string } | null;
  vendedor: { name: string } | null;
  consumidor_nao_identificado: boolean;
};

type CrRow = {
  status: string;
  deleted_at: string | null;
  venda_id: string | null;
  valor_original: number;
  data_competencia: string | null;
  data_emissao: string;
};

function pctDelta(atual: number, base: number): number | null {
  if (base === 0) return atual === 0 ? 0 : null;
  return ((atual - base) / Math.abs(base)) * 100;
}

function mapOrigem(canal: string): string {
  const c = (canal || "").toLowerCase();
  if (c.includes("rapida") || c === "balcao" || c === "pdv") return "Venda rápida";
  if (c.includes("os") || c.includes("oficina") || c.includes("ordem")) {
    return "OS faturada";
  }
  if (c.includes("nfe") || c.includes("nota")) return "Nota fiscal";
  return canal?.trim() ? canal : "Venda";
}

export class VendasDiaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly timeZone: string = resolveTenantTimezone(),
  ) {}

  async getSnapshot(centroCustoId?: string | null): Promise<DashboardHojeSnapshot> {
    const now = new Date();
    const hoje = civilDateInTimezone(now, this.timeZone);
    const ontem = shiftCivilDate(hoje, -1);
    const semanaAnt = sameWeekdayPreviousWeek(hoje);
    const mesIni = firstDayOfMonthCivil(hoje);
    const competencia = toCompetenciaMonthStart(hoje);

    const lookback = shiftCivilDate(mesIni, -40);

    const [vendas, cr, metaMensal, overrides, fechados] = await Promise.all([
      this.fetchVendas(lookback, hoje, centroCustoId),
      this.fetchCrAvulsas(lookback, hoje, centroCustoId),
      this.fetchMetaMensal(competencia, centroCustoId),
      this.fetchMetaDiariaOverrides(mesIni, hoje, centroCustoId),
      this.fetchDiasFechados(mesIni, hoje),
    ]);

    const overrideMap = new Map(
      overrides.map((o) => [o.data, Number(o.valor_meta)] as const),
    );
    const fechadoSet = new Set(fechados);

    const aggRange = (de: string, ate: string) =>
      aggregateFaturamentoLiquido({
        vendas: vendas.map((v) => ({
          status: v.status,
          deleted_at: v.deleted_at,
          subtotal: Number(v.subtotal),
          desconto_total: Number(v.desconto_total),
          total: Number(v.total),
          data_venda: v.data_venda,
        })),
        crAvulsas: cr.map((r) => ({
          status: r.status,
          deleted_at: r.deleted_at,
          venda_id: r.venda_id,
          valor_original: Number(r.valor_original),
          data_competencia: r.data_competencia,
          data_emissao: r.data_emissao,
        })),
        dataDe: de,
        dataAte: ate,
      });

    const hojeAgg = aggRange(hoje, hoje);
    const ontemAgg = aggRange(ontem, ontem);
    const semanaAgg = aggRange(semanaAnt, semanaAnt);
    const mesAgg = aggRange(mesIni, hoje);

    const metaHojeResolved = resolveMetaDiaria({
      competencia,
      valorMetaMensal: metaMensal,
      data: hoje,
      override: overrideMap.has(hoje)
        ? { data: hoje, valor_meta: overrideMap.get(hoje)! }
        : null,
      diaFechado: fechadoSet.has(hoje),
    });

    const metaHoje =
      metaMensal == null && metaHojeResolved.fonte === "sem_meta"
        ? null
        : metaHojeResolved.meta_diaria;

    const percentualHoje = calcPercentualAtingido(hojeAgg.liquido, metaHoje);
    const faltaHoje = calcFaltaParaMeta(hojeAgg.liquido, metaHoje);
    const statusHoje = classifyMetaDiaStatus(percentualHoje, metaHoje);

    const serie = this.buildSerieDiaria({
      mesIni,
      hoje,
      competencia,
      metaMensal,
      overrideMap,
      fechadoSet,
      vendas,
      cr,
    });

    const melhor = serie.reduce<{ data: string; valor: number } | null>(
      (best, row) => {
        if (row.data > hoje) return best;
        if (!best || row.realizado > best.valor) {
          return { data: row.data, valor: row.realizado };
        }
        return best;
      },
      null,
    );

    const diasDecorridos = Math.max(
      serie.filter((d) => d.data <= hoje).length,
      1,
    );
    const mediaDiaria = mesAgg.liquido / diasDecorridos;

    const diaDoMes = Number(hoje.slice(8, 10));
    const ultimoDia = new Date(
      Number(hoje.slice(0, 4)),
      Number(hoje.slice(5, 7)),
      0,
    ).getDate();
    const projecao =
      diaDoMes > 0 ? (mesAgg.liquido / diaDoMes) * ultimoDia : null;

    const vendasHoje = vendas
      .filter(
        (v) =>
          isVendaValidaParaFaturamento(v) &&
          String(v.data_venda).slice(0, 10) === hoje,
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v): VendaDiaDrillItem => {
        const bruto = valorBrutoVenda(v);
        const liquido = valorLiquidoVenda(v);
        return {
          id: v.id,
          numero: v.numero,
          horario: civilTimeInTimezone(v.created_at, this.timeZone),
          data_venda: v.data_venda,
          cliente: v.consumidor_nao_identificado
            ? "Consumidor não identificado"
            : (v.cliente?.nome ?? "—"),
          vendedor: v.vendedor?.name ?? null,
          valor_bruto: bruto,
          desconto: Number(v.desconto_total) || Math.max(bruto - liquido, 0),
          valor_liquido: liquido,
          origem: mapOrigem(v.canal_venda),
          canal_venda: v.canal_venda,
        };
      });

    return {
      timezone: this.timeZone,
      data_hoje: hoje,
      atualizado_em: now.toISOString(),
      atualizado_em_label: formatDateTimeInTimezone(now, this.timeZone),
      hoje: {
        faturamento: hojeAgg.liquido,
        meta: metaHoje,
        percentual: percentualHoje,
        falta: faltaHoje,
        quantidade_vendas: hojeAgg.quantidade_vendas,
        ticket_medio: hojeAgg.ticket_medio,
        status: statusHoje,
        meta_fonte: metaHojeResolved.fonte,
      },
      mes: {
        faturamento: mesAgg.liquido,
        meta: metaMensal,
        percentual: calcPercentualAtingido(mesAgg.liquido, metaMensal),
        projecao_fechamento: projecao,
        media_diaria: mediaDiaria,
        melhor_dia: melhor,
        quantidade_vendas: mesAgg.quantidade_vendas,
        ticket_medio: mesAgg.ticket_medio,
      },
      comparacoes: {
        vs_ontem_pct: pctDelta(hojeAgg.liquido, ontemAgg.liquido),
        vs_ontem_valor: ontemAgg.liquido,
        vs_mesmo_dia_semana_anterior_pct: pctDelta(
          hojeAgg.liquido,
          semanaAgg.liquido,
        ),
        vs_mesmo_dia_semana_anterior_valor: semanaAgg.liquido,
      },
      serie_diaria: serie,
      vendas_hoje: vendasHoje,
    };
  }

  private buildSerieDiaria(input: {
    mesIni: string;
    hoje: string;
    competencia: string;
    metaMensal: number | null;
    overrideMap: Map<string, number>;
    fechadoSet: Set<string>;
    vendas: VendaRow[];
    cr: CrRow[];
  }) {
    const rows: DashboardHojeSnapshot["serie_diaria"] = [];
    let cursor = input.mesIni;
    let acumReal = 0;
    let acumMeta = 0;

    while (cursor <= input.hoje) {
      const dayVendas = input.vendas.filter(
        (v) =>
          isVendaValidaParaFaturamento(v) &&
          String(v.data_venda).slice(0, 10) === cursor,
      );
      const dayCr = input.cr.filter((r) => {
        if (r.deleted_at || r.venda_id || r.status === "cancelado") return false;
        const d = String(r.data_competencia ?? r.data_emissao).slice(0, 10);
        return d === cursor;
      });

      const liquidoVendas = dayVendas.reduce(
        (s, v) => s + valorLiquidoVenda(v),
        0,
      );
      const liquidoCr = dayCr.reduce(
        (s, r) => s + (Number(r.valor_original) || 0),
        0,
      );
      const realizado = liquidoVendas + liquidoCr;
      const qtd = dayVendas.length;

      const resolved = resolveMetaDiaria({
        competencia: input.competencia,
        valorMetaMensal: input.metaMensal,
        data: cursor,
        override: input.overrideMap.has(cursor)
          ? { data: cursor, valor_meta: input.overrideMap.get(cursor)! }
          : null,
        diaFechado: input.fechadoSet.has(cursor),
      });

      acumReal += realizado;
      acumMeta += resolved.meta_diaria;

      rows.push({
        data: cursor,
        realizado,
        meta_diaria: resolved.meta_diaria,
        acumulado_realizado: acumReal,
        acumulado_meta: acumMeta,
        quantidade_vendas: qtd,
        ticket_medio: qtd > 0 ? liquidoVendas / qtd : 0,
      });

      cursor = shiftCivilDate(cursor, 1);
    }

    return rows;
  }

  private async fetchVendas(
    dataDe: string,
    dataAte: string,
    centroId?: string | null,
  ): Promise<VendaRow[]> {
    let query = this.supabase
      .from("vendas")
      .select(
        `
        id, numero, data_venda, status, subtotal, desconto_total, total,
        canal_venda, created_at, deleted_at, vendedor_id,
        consumidor_nao_identificado,
        cliente:clientes ( nome )
      `,
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_venda", dataDe)
      .lte("data_venda", dataAte);

    if (centroId) query = query.eq("centro_custo_id", centroId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const vendedorIds = [
      ...new Set(
        rows
          .map((r) => r.vendedor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const vendedorNomes = new Map<string, string>();
    if (vendedorIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", vendedorIds);
      for (const p of profiles ?? []) {
        vendedorNomes.set(p.id, p.full_name?.trim() || "—");
      }
    }

    return rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      data_venda: row.data_venda,
      status: row.status,
      subtotal: Number(row.subtotal),
      desconto_total: Number(row.desconto_total),
      total: Number(row.total),
      canal_venda: row.canal_venda,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      vendedor_id: row.vendedor_id,
      consumidor_nao_identificado: row.consumidor_nao_identificado,
      cliente: (row.cliente as { nome: string } | null) ?? null,
      vendedor: row.vendedor_id
        ? { name: vendedorNomes.get(row.vendedor_id) ?? "—" }
        : null,
    }));
  }

  private async fetchCrAvulsas(
    dataDe: string,
    dataAte: string,
    centroId?: string | null,
  ): Promise<CrRow[]> {
    let query = this.supabase
      .from("contas_receber")
      .select(
        "status, deleted_at, venda_id, valor_original, data_competencia, data_emissao",
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
    return (data ?? []) as CrRow[];
  }

  private async fetchMetaMensal(
    competencia: string,
    centroId?: string | null,
  ): Promise<number | null> {
    let query = this.supabase
      .from("metas_vendas_mensais")
      .select("valor_meta, centro_custo_id")
      .eq("tenant_id", this.tenantId)
      .eq("competencia", competencia)
      .is("deleted_at", null);

    if (centroId) {
      query = query.eq("centro_custo_id", centroId);
    } else {
      query = query.is("centro_custo_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      // tabela ok; maybeSingle com 0 rows é null
      if (error.code === "PGRST116") return null;
      // Se múltiplas, pega a geral
      const list = await this.supabase
        .from("metas_vendas_mensais")
        .select("valor_meta, centro_custo_id")
        .eq("tenant_id", this.tenantId)
        .eq("competencia", competencia)
        .is("deleted_at", null)
        .is("centro_custo_id", null)
        .limit(1);
      if (list.error) return null;
      const row = list.data?.[0];
      return row ? Number(row.valor_meta) : null;
    }
    return data ? Number(data.valor_meta) : null;
  }

  private async fetchMetaDiariaOverrides(
    dataDe: string,
    dataAte: string,
    centroId?: string | null,
  ): Promise<Array<{ data: string; valor_meta: number }>> {
    const client = this.supabase as SupabaseClient;
    let query = client
      .from("metas_vendas_diarias")
      .select(
        "data, valor_meta, centro_custo_id, vendedor_id, equipe_id, mecanico_id",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data", dataDe)
      .lte("data", dataAte)
      .is("vendedor_id", null)
      .is("equipe_id", null)
      .is("mecanico_id", null);

    if (centroId) {
      query = query.eq("centro_custo_id", centroId);
    } else {
      query = query.is("centro_custo_id", null);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(
      (row: { data: string; valor_meta: number | string }) => ({
        data: String(row.data).slice(0, 10),
        valor_meta: Number(row.valor_meta),
      }),
    );
  }

  private async fetchDiasFechados(
    dataDe: string,
    dataAte: string,
  ): Promise<string[]> {
    const client = this.supabase as SupabaseClient;
    const { data, error } = await client
      .from("tenant_dias_fechados")
      .select("data")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data", dataDe)
      .lte("data", dataAte);
    if (error) return [];
    return (data ?? []).map((row: { data: string }) =>
      String(row.data).slice(0, 10),
    );
  }
}

export async function createVendasDiaService(tenantId: string) {
  const supabase = await createClient();
  return new VendasDiaService(supabase, tenantId, resolveTenantTimezone());
}
