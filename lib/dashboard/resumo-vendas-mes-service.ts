import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isVendaValidaParaFaturamento,
  valorBrutoVenda,
  valorLiquidoVenda,
} from "@/lib/dashboard/faturamento-agregacao";
import {
  buildResumoDiaRow,
  buildTotalGeral,
  classifyDayKind,
  eachDayOfMonth,
  type ResumoDiaRow,
  type ResumoTotalGeral,
} from "@/lib/dashboard/resumo-vendas-mes";
import {
  civilDateInTimezone,
  civilTimeInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { resolveMetaDiaria } from "@/lib/metas/meta-diaria";
import { toCompetenciaMonthStart } from "@/lib/metas/projection";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ResumoMesFilters = {
  year: number;
  month: number; // 1-12
  centroCustoId?: string | null;
  vendedorId?: string | null;
  origem?: string | null; // canal_venda
};

export type ResumoMesVendaDrill = {
  id: string;
  numero: number;
  horario: string;
  cliente: string;
  vendedor: string | null;
  valor_bruto: number;
  desconto: number;
  valor_liquido: number;
  origem: string;
  canal_venda: string;
  status: string;
};

export type ResumoMesDiaDetail = {
  data: string;
  quantidade_vendas: number;
  ticket_medio: number;
  bruto: number;
  desconto: number;
  liquido: number;
  meta: number | null;
  diferenca: number | null;
  pct_atingido: number | null;
  cancelamentos: number;
  estornos: number;
  clientes_atendidos: number;
  pecas_vendidas: number;
  servicos_vendidos: number;
  origem_resumo: Array<{ origem: string; quantidade: number; liquido: number }>;
  vendas: ResumoMesVendaDrill[];
  vendas_excluidas: ResumoMesVendaDrill[];
};

export type ResumoVendasMesData = {
  timezone: string;
  year: number;
  month: number;
  competencia: string;
  data_hoje: string;
  meta_mensal: number | null;
  meta_fonte_padrao: string;
  total: ResumoTotalGeral;
  rows: ResumoDiaRow[];
  filter_options: {
    vendedores: Array<{ id: string; nome: string }>;
    origens: string[];
  };
};

type VendaSlim = {
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
  consumidor_nao_identificado: boolean;
  cliente: { nome: string } | null;
};

function mapOrigem(canal: string): string {
  const c = (canal || "").toLowerCase();
  if (c.includes("rapida") || c === "balcao" || c === "pdv") return "Venda rápida";
  if (c.includes("os") || c.includes("oficina") || c.includes("ordem")) {
    return "OS faturada";
  }
  if (c.includes("nfe") || c.includes("nota")) return "Nota fiscal";
  return canal?.trim() ? canal : "Venda";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export class ResumoVendasMesService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly timeZone: string = resolveTenantTimezone(),
  ) {}

  async getResumo(filters: ResumoMesFilters): Promise<ResumoVendasMesData> {
    const year = filters.year;
    const month = filters.month;
    const dataDe = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dataAte = `${year}-${pad(month)}-${pad(lastDay)}`;
    const competencia = toCompetenciaMonthStart(dataDe);
    const hoje = civilDateInTimezone(new Date(), this.timeZone);

    const [vendas, cr, metaMensal, overrides, fechados, filterOpts] =
      await Promise.all([
        this.fetchVendas(dataDe, dataAte, filters),
        filters.vendedorId || filters.origem
          ? Promise.resolve([])
          : this.fetchCrAvulsas(dataDe, dataAte, filters.centroCustoId),
        this.fetchMetaMensal(competencia, filters.centroCustoId),
        this.fetchMetaDiariaOverrides(dataDe, dataAte, filters.centroCustoId),
        this.fetchDiasFechados(dataDe, dataAte),
        this.fetchFilterOptions(dataDe, dataAte),
      ]);

    const overrideMap = new Map(
      overrides.map((o) => [o.data, Number(o.valor_meta)] as const),
    );
    const fechadoSet = new Set(fechados);

    const realizadoByDay = new Map<string, number>();
    for (const v of vendas) {
      if (!isVendaValidaParaFaturamento(v)) continue;
      const key = String(v.data_venda).slice(0, 10);
      realizadoByDay.set(
        key,
        (realizadoByDay.get(key) ?? 0) + valorLiquidoVenda(v),
      );
    }
    for (const r of cr) {
      if (r.deleted_at || r.venda_id || r.status === "cancelado") continue;
      const key = String(r.data_competencia ?? r.data_emissao).slice(0, 10);
      if (key < dataDe || key > dataAte) continue;
      realizadoByDay.set(
        key,
        (realizadoByDay.get(key) ?? 0) + (Number(r.valor_original) || 0),
      );
    }

    const dates = eachDayOfMonth(year, month - 1);
    const rows = dates.map((data) => {
      const kind = classifyDayKind(data, hoje);
      const resolved = resolveMetaDiaria({
        competencia,
        valorMetaMensal: metaMensal,
        data,
        override: overrideMap.has(data)
          ? { data, valor_meta: overrideMap.get(data)! }
          : null,
        diaFechado: fechadoSet.has(data),
      });

      const rawRealizado = realizadoByDay.get(data) ?? 0;
      return buildResumoDiaRow({
        data,
        meta: resolved.meta_diaria,
        meta_fonte: resolved.fonte,
        realizado: kind === "futuro" ? null : rawRealizado,
        kind,
      });
    });

    const hasManual = rows.some((r) => r.meta_fonte === "manual");
    const metaFontePadrao = hasManual
      ? "misto (manual + rateio)"
      : metaMensal == null
        ? "sem_meta"
        : "rateio da meta mensal";

    return {
      timezone: this.timeZone,
      year,
      month,
      competencia,
      data_hoje: hoje,
      meta_mensal: metaMensal,
      meta_fonte_padrao: metaFontePadrao,
      total: buildTotalGeral(rows),
      rows,
      filter_options: filterOpts,
    };
  }

  async getDiaDetail(
    data: string,
    filters: Omit<ResumoMesFilters, "year" | "month">,
  ): Promise<ResumoMesDiaDetail> {
    const vendas = await this.fetchVendas(data, data, {
      year: Number(data.slice(0, 4)),
      month: Number(data.slice(5, 7)),
      ...filters,
    });

    const validas = vendas.filter((v) => isVendaValidaParaFaturamento(v));
    const canceladas = vendas.filter((v) => v.status === "cancelado");
    const todasIds = [...validas, ...canceladas];
    const vendedorIds = [
      ...new Set(
        todasIds
          .map((v) => v.vendedor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nomes = await this.fetchVendedorNomes(vendedorIds);

    const mapDrill = (v: VendaSlim): ResumoMesVendaDrill => {
      const b = valorBrutoVenda(v);
      const l = valorLiquidoVenda(v);
      const d = Number(v.desconto_total) || Math.max(b - l, 0);
      return {
        id: v.id,
        numero: v.numero,
        horario: civilTimeInTimezone(v.created_at, this.timeZone),
        cliente: v.consumidor_nao_identificado
          ? "Consumidor não identificado"
          : (v.cliente?.nome ?? "—"),
        vendedor: v.vendedor_id ? (nomes.get(v.vendedor_id) ?? "—") : null,
        valor_bruto: b,
        desconto: d,
        valor_liquido: l,
        origem: mapOrigem(v.canal_venda),
        canal_venda: v.canal_venda,
        status: v.status,
      };
    };

    let bruto = 0;
    let desconto = 0;
    let liquido = 0;
    const drills = validas
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v) => {
        const item = mapDrill(v);
        bruto += item.valor_bruto;
        desconto += item.desconto;
        liquido += item.valor_liquido;
        return item;
      });

    const origemMap = new Map<string, { quantidade: number; liquido: number }>();
    for (const v of drills) {
      const cur = origemMap.get(v.origem) ?? { quantidade: 0, liquido: 0 };
      cur.quantidade += 1;
      cur.liquido += v.valor_liquido;
      origemMap.set(v.origem, cur);
    }

    const clientes = new Set(
      validas
        .filter((v) => v.cliente?.nome && !v.consumidor_nao_identificado)
        .map((v) => v.cliente!.nome),
    );

    let pecas = 0;
    let servicos = 0;
    if (validas.length > 0) {
      const ids = validas.map((v) => v.id);
      const { data: itens } = await this.supabase
        .from("venda_itens")
        .select("tipo_item, quantidade")
        .eq("tenant_id", this.tenantId)
        .in("venda_id", ids.slice(0, 200))
        .is("deleted_at", null);
      for (const it of itens ?? []) {
        const q = Number(it.quantidade) || 0;
        if (it.tipo_item === "servico") servicos += q;
        else pecas += q;
      }
    }

    const competencia = toCompetenciaMonthStart(data);
    const metaMensal = await this.fetchMetaMensal(
      competencia,
      filters.centroCustoId,
    );
    const overrides = await this.fetchMetaDiariaOverrides(
      data,
      data,
      filters.centroCustoId,
    );
    const fechados = await this.fetchDiasFechados(data, data);
    const resolved = resolveMetaDiaria({
      competencia,
      valorMetaMensal: metaMensal,
      data,
      override: overrides[0]
        ? { data, valor_meta: overrides[0].valor_meta }
        : null,
      diaFechado: fechados.includes(data),
    });
    const meta =
      resolved.fonte === "sem_meta" && !overrides[0]
        ? null
        : resolved.meta_diaria;
    const diferenca = meta == null ? null : liquido - meta;
    const pct_atingido =
      meta == null || meta === 0 ? null : (liquido / meta) * 100;

    return {
      data,
      quantidade_vendas: drills.length,
      ticket_medio: drills.length > 0 ? liquido / drills.length : 0,
      bruto,
      desconto,
      liquido,
      meta,
      diferenca,
      pct_atingido,
      cancelamentos: canceladas.length,
      estornos: 0,
      clientes_atendidos: clientes.size,
      pecas_vendidas: pecas,
      servicos_vendidos: servicos,
      origem_resumo: [...origemMap.entries()]
        .map(([origem, v]) => ({ origem, ...v }))
        .sort((a, b) => b.liquido - a.liquido),
      vendas: drills,
      vendas_excluidas: canceladas.map(mapDrill),
    };
  }

  private async fetchVendas(
    dataDe: string,
    dataAte: string,
    filters: ResumoMesFilters,
  ): Promise<VendaSlim[]> {
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

    if (filters.centroCustoId) {
      query = query.eq("centro_custo_id", filters.centroCustoId);
    }
    if (filters.vendedorId) {
      query = query.eq("vendedor_id", filters.vendedorId);
    }
    if (filters.origem) {
      query = query.eq("canal_venda", filters.origem);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
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
    }));
  }

  private async fetchCrAvulsas(
    dataDe: string,
    dataAte: string,
    centroId?: string | null,
  ) {
    // CR avulsas só entram no total geral quando não há filtro de vendedor/origem
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
    return data ?? [];
  }

  private async fetchMetaMensal(
    competencia: string,
    centroId?: string | null,
  ): Promise<number | null> {
    let query = this.supabase
      .from("metas_vendas_mensais")
      .select("valor_meta")
      .eq("tenant_id", this.tenantId)
      .eq("competencia", competencia)
      .is("deleted_at", null);

    if (centroId) query = query.eq("centro_custo_id", centroId);
    else query = query.is("centro_custo_id", null);

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== "PGRST116") {
      const list = await this.supabase
        .from("metas_vendas_mensais")
        .select("valor_meta")
        .eq("tenant_id", this.tenantId)
        .eq("competencia", competencia)
        .is("deleted_at", null)
        .is("centro_custo_id", null)
        .limit(1);
      if (list.error) return null;
      return list.data?.[0] ? Number(list.data[0].valor_meta) : null;
    }
    return data ? Number(data.valor_meta) : null;
  }

  private async fetchMetaDiariaOverrides(
    dataDe: string,
    dataAte: string,
    centroId?: string | null,
  ): Promise<Array<{ data: string; valor_meta: number }>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = this.supabase as any;
    let query = client
      .from("metas_vendas_diarias")
      .select("data, valor_meta")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data", dataDe)
      .lte("data", dataAte)
      .is("vendedor_id", null)
      .is("equipe_id", null)
      .is("mecanico_id", null);

    if (centroId) query = query.eq("centro_custo_id", centroId);
    else query = query.is("centro_custo_id", null);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = this.supabase as any;
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

  private async fetchFilterOptions(dataDe: string, dataAte: string) {
    const { data: vendas } = await this.supabase
      .from("vendas")
      .select("vendedor_id, canal_venda")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .gte("data_venda", dataDe)
      .lte("data_venda", dataAte);

    const origens = [
      ...new Set(
        (vendas ?? [])
          .map((v) => v.canal_venda)
          .filter((c): c is string => Boolean(c?.trim())),
      ),
    ].sort();

    const vendedorIds = [
      ...new Set(
        (vendas ?? [])
          .map((v) => v.vendedor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nomes = await this.fetchVendedorNomes(vendedorIds);
    const vendedores = vendedorIds
      .map((id) => ({ id, nome: nomes.get(id) ?? "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return { vendedores, origens };
  }

  private async fetchVendedorNomes(ids: string[]) {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of data ?? []) {
      map.set(p.id, p.full_name?.trim() || "—");
    }
    return map;
  }
}

export async function createResumoVendasMesService(tenantId: string) {
  const supabase = await createClient();
  return new ResumoVendasMesService(
    supabase,
    tenantId,
    resolveTenantTimezone(),
  );
}
