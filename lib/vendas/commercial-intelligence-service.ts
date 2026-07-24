/**
 * Loader — Inteligência Comercial (Gate 18.3).
 * Agrega vendas/OS/metas sem alterar contratos públicos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  assertTenantIsolation,
  composeCommercialIntelligence,
  resolveCiPeriod,
  type CiFilters,
  type CiMetaSnapshot,
  type CiOsOficinaRow,
  type CiVendaRow,
  type CommercialIntelligenceData,
} from "./commercial-intelligence-compose";

export type CommercialIntelligenceFilters = {
  de?: string;
  ate?: string;
  preset?: string;
  responsavel?: string;
  origem?: string;
  status?: string;
  cliente?: string;
};

function osValor(row: {
  subtotal?: number | null;
  desconto_total?: number | null;
  acrescimo_total?: number | null;
}): number {
  return (
    Number(row.subtotal ?? 0) -
    Number(row.desconto_total ?? 0) +
    Number(row.acrescimo_total ?? 0)
  );
}

export class CommercialIntelligenceService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly timeZone: string = resolveTenantTimezone(),
  ) {}

  async load(
    raw: CommercialIntelligenceFilters = {},
  ): Promise<CommercialIntelligenceData> {
    const hoje = civilDateInTimezone(new Date(), this.timeZone);
    const { de, ate } = resolveCiPeriod({
      de: raw.de,
      ate: raw.ate,
      preset: raw.preset,
      hoje,
    });

    const filters: CiFilters = {
      de,
      ate,
      responsavelId: raw.responsavel || null,
      origem: raw.origem || null,
      status: raw.status || null,
      clienteId: raw.cliente || null,
    };

    const [vendas, osOficina, vipIds, meta] = await Promise.all([
      this.loadVendas(de, ate),
      this.loadOsOficina(),
      this.loadVipClienteIds(),
      this.loadMeta(de, ate),
    ]);

    const scoped = assertTenantIsolation(vendas, this.tenantId);
    const profileIds = new Set<string>();
    for (const v of scoped) {
      if (v.vendedor_id) profileIds.add(v.vendedor_id);
      if (v.created_by) profileIds.add(v.created_by);
    }
    const profileNames = await this.loadProfileNames([...profileIds]);

    return composeCommercialIntelligence({
      vendas: scoped,
      osOficina,
      filters,
      profileNames,
      vipClienteIds: vipIds,
      meta,
    });
  }

  private async loadVendas(de: string, ate: string): Promise<CiVendaRow[]> {
    const createdGte = `${de}T00:00:00`;
    const createdLte = `${ate}T23:59:59.999`;
    const select =
      "id, tenant_id, numero, cliente_id, status, total, subtotal, desconto_total, data_venda, created_at, updated_at, vendedor_id, created_by, canal_venda, deleted_at, cliente:clientes ( nome )";

    const [byData, byCreated, openRes] = await Promise.all([
      this.supabase
        .from("vendas")
        .select(select)
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .gte("data_venda", de)
        .lte("data_venda", ate)
        .limit(4000),
      this.supabase
        .from("vendas")
        .select(select)
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .gte("created_at", createdGte)
        .lte("created_at", createdLte)
        .limit(4000),
      this.supabase
        .from("vendas")
        .select(select)
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .in("status", ["orcamento", "em_andamento"])
        .limit(2000),
    ]);

    const byId = new Map<string, CiVendaRow>();
    const ingest = (rows: unknown[] | null) => {
      for (const raw of rows ?? []) {
        const r = raw as Record<string, unknown>;
        const cliente = r.cliente as { nome?: string } | null;
        byId.set(r.id as string, {
          id: r.id as string,
          tenant_id: r.tenant_id as string,
          numero: (r.numero as number | null) ?? null,
          cliente_id: (r.cliente_id as string | null) ?? null,
          cliente_nome: cliente?.nome ?? null,
          status: String(r.status ?? ""),
          total: Number(r.total ?? 0),
          subtotal: Number(r.subtotal ?? 0),
          desconto_total: Number(r.desconto_total ?? 0),
          data_venda: (r.data_venda as string | null) ?? null,
          created_at: r.created_at as string,
          updated_at: (r.updated_at as string) ?? (r.created_at as string),
          vendedor_id: (r.vendedor_id as string | null) ?? null,
          created_by: (r.created_by as string | null) ?? null,
          canal_venda: (r.canal_venda as string | null) ?? null,
          deleted_at: (r.deleted_at as string | null) ?? null,
        });
      }
    };

    if (!byData.error) ingest(byData.data as unknown[] | null);
    if (!byCreated.error) ingest(byCreated.data as unknown[] | null);
    if (!openRes.error) ingest(openRes.data as unknown[] | null);

    const list = [...byId.values()];
    const faturadasIds = list
      .filter((v) => v.status === "faturado")
      .map((v) => v.id)
      .slice(0, 800);

    if (faturadasIds.length) {
      const { data: itens } = await this.supabase
        .from("venda_itens")
        .select("venda_id, descricao, tipo_item, quantidade, total")
        .eq("tenant_id", this.tenantId)
        .in("venda_id", faturadasIds)
        .is("deleted_at", null)
        .limit(5000);

      const aggByVenda = new Map<
        string,
        Map<string, { tipo: string; descricao: string; total: number; qtd: number }>
      >();

      for (const it of itens ?? []) {
        const vid = it.venda_id as string;
        const desc = String(it.descricao ?? "").trim() || "Item";
        const tipo = String(it.tipo_item ?? "produto");
        const key = `${tipo}::${desc}`;
        if (!aggByVenda.has(vid)) aggByVenda.set(vid, new Map());
        const map = aggByVenda.get(vid)!;
        const cur = map.get(key) ?? {
          tipo,
          descricao: desc,
          total: 0,
          qtd: 0,
        };
        cur.total += Number(it.total ?? 0);
        cur.qtd += Number(it.quantidade ?? 0) || 1;
        map.set(key, cur);
      }

      for (const v of list) {
        const map = aggByVenda.get(v.id);
        if (map) v.tipo_item_agg = [...map.values()];
      }
    }

    return list;
  }

  private async loadOsOficina(): Promise<CiOsOficinaRow[]> {
    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, numero, status, subtotal, desconto_total, acrescimo_total",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", [
        "aguardando_orcamento",
        "aguardando_aprovacao",
        "aprovado",
        "parcialmente_aprovado",
      ])
      .limit(2000);

    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      numero: (r.numero as number | null) ?? null,
      status: String(r.status ?? ""),
      valor_total: osValor(r),
    }));
  }

  private async loadVipClienteIds(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("entity_tags" as never)
      .select("entity_id, tags:tags ( nome )")
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", "cliente");

    if (error) return [];
    return (
      (data ?? []) as Array<{
        entity_id?: string;
        tags?: { nome?: string } | null;
      }>
    )
      .filter((r) => r.entity_id && r.tags?.nome?.trim().toLowerCase() === "vip")
      .map((r) => r.entity_id as string);
  }

  private async loadProfileNames(
    ids: string[],
  ): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids.slice(0, 100));
    const map: Record<string, string> = {};
    for (const p of data ?? []) {
      map[p.id] = p.full_name?.trim() || p.email || p.id.slice(0, 8);
    }
    return map;
  }

  private async loadMeta(de: string, ate: string): Promise<CiMetaSnapshot> {
    try {
      const metaService = await createMetaVendasService(this.tenantId);
      const proj = await metaService.getProjecaoFromDashboardFilters({
        dataDe: de,
        dataAte: ate,
      });
      const hasMeta = proj.valor_meta != null;
      return {
        available: hasMeta,
        valorMeta: proj.valor_meta,
        realizado: proj.faturamento_realizado,
        diferenca:
          proj.valor_meta == null
            ? null
            : round2(proj.faturamento_realizado - proj.valor_meta),
        percentual: proj.percentual_atingido,
        projecao: proj.projecao_dias_uteis ?? proj.projecao_fechamento,
        necessarioPorDiaUtil: proj.necessario_por_dia_util,
        ritmoAtual: proj.ritmo_atual,
        ritmoEsperado: proj.ritmo_esperado,
        status: proj.status,
      };
    } catch {
      return {
        available: false,
        valorMeta: null,
        realizado: 0,
        diferenca: null,
        percentual: null,
        projecao: null,
        necessarioPorDiaUtil: null,
        ritmoAtual: null,
        ritmoEsperado: null,
        status: null,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createCommercialIntelligenceService(tenantId: string) {
  const supabase = await createClient();
  return new CommercialIntelligenceService(supabase, tenantId);
}
