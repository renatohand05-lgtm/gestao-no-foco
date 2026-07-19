import type { SupabaseClient } from "@supabase/supabase-js";

import { createDreService } from "@/lib/financeiro/dre-service";
import {
  buildMetaProjecao,
  monthBounds,
  previousCompetencia,
  resolveCompetenciaFromPeriod,
  toCompetenciaMonthStart,
} from "@/lib/metas/projection";
import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type {
  CreateMetaVendasInput,
  ListMetasResult,
  ListMetasVendasParams,
  MetaHistoricoRow,
  MetaProjecaoMensal,
  MetaVendasListItem,
  MetaVendasMensal,
  UpdateMetaVendasInput,
} from "@/types/metas-vendas";
import { toPaginatedResult } from "@/types/pagination";

const LIST_SELECT = `
  id,
  competencia,
  valor_meta,
  centro_custo_id,
  observacao,
  updated_at,
  centro_custo:centros_custo ( id, nome )
`;

const DETAIL_SELECT = `
  id,
  tenant_id,
  competencia,
  valor_meta,
  centro_custo_id,
  observacao,
  created_by,
  created_at,
  updated_at,
  centro_custo:centros_custo ( id, nome )
`;

type MetaRow = {
  id: string;
  tenant_id: string;
  competencia: string;
  valor_meta: number;
  centro_custo_id: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  centro_custo: { id: string; nome: string } | null;
};

function mapMeta(row: MetaRow): MetaVendasMensal {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    competencia: row.competencia,
    valor_meta: Number(row.valor_meta),
    centro_custo_id: row.centro_custo_id,
    centro_custo_nome: row.centro_custo?.nome ?? null,
    observacao: row.observacao,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapListItem(row: MetaRow): MetaVendasListItem {
  return {
    id: row.id,
    competencia: row.competencia,
    valor_meta: Number(row.valor_meta),
    centro_custo_id: row.centro_custo_id,
    centro_custo_nome: row.centro_custo?.nome ?? null,
    observacao: row.observacao,
    updated_at: row.updated_at,
  };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe meta para esta competência e centro de custo.";
  }
  return error.message;
}

export class MetaVendasService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listCentrosCustoOptions(): Promise<{ id: string; nome: string }[]> {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .select("id, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<MetaVendasMensal | null> {
    const { data, error } = await this.supabase
      .from("metas_vendas_mensais")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapMeta(data as unknown as MetaRow) : null;
  }

  async getByCompetencia(
    competencia: string,
    centroCustoId?: string | null,
  ): Promise<MetaVendasMensal | null> {
    const comp = toCompetenciaMonthStart(competencia);
    let query = this.supabase
      .from("metas_vendas_mensais")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("competencia", comp)
      .is("deleted_at", null);

    if (centroCustoId) {
      query = query.eq("centro_custo_id", centroCustoId);
    } else {
      query = query.is("centro_custo_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapMeta(data as unknown as MetaRow) : null;
  }

  async list(params: ListMetasVendasParams = {}): Promise<ListMetasResult> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
      FINANCEIRO_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = this.supabase
      .from("metas_vendas_mensais")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("competencia", { ascending: false });

    if (params.apenasGeral) {
      query = query.is("centro_custo_id", null);
    } else if (params.centroCustoId) {
      query = query.eq("centro_custo_id", params.centroCustoId);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return toPaginatedResult(
      ((data ?? []) as unknown as MetaRow[]).map(mapListItem),
      total,
      page,
      perPage,
    );
  }

  async create(input: CreateMetaVendasInput): Promise<MetaVendasMensal> {
    const competencia = toCompetenciaMonthStart(input.competencia);

    if (input.centro_custo_id) {
      await this.assertCentroCusto(input.centro_custo_id);
    }

    const { data, error } = await this.supabase
      .from("metas_vendas_mensais")
      .insert({
        tenant_id: this.tenantId,
        competencia,
        valor_meta: input.valor_meta,
        centro_custo_id: input.centro_custo_id ?? null,
        observacao: input.observacao ?? null,
        created_by: input.created_by ?? null,
      })
      .select(DETAIL_SELECT)
      .single();

    if (error) throw new Error(mapUniqueViolation(error));
    return mapMeta(data as unknown as MetaRow);
  }

  async update(id: string, input: UpdateMetaVendasInput): Promise<MetaVendasMensal> {
    if (input.centro_custo_id) {
      await this.assertCentroCusto(input.centro_custo_id);
    }

    const { data, error } = await this.supabase
      .from("metas_vendas_mensais")
      .update({
        valor_meta: input.valor_meta,
        centro_custo_id: input.centro_custo_id ?? null,
        observacao: input.observacao ?? null,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(DETAIL_SELECT)
      .single();

    if (error) throw new Error(mapUniqueViolation(error));
    return mapMeta(data as unknown as MetaRow);
  }

  async softDelete(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("metas_vendas_mensais")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error("Meta não encontrada ou já excluída.");
    }
  }

  async getFaturamentoMes(
    competencia: string,
    centroCustoId?: string | null,
  ): Promise<number> {
    const { dataDe, dataAte } = monthBounds(competencia);
    const dre = await createDreService(this.tenantId);
    const result = await dre.getDre({
      dataDe,
      dataAte,
      centroCustoId: centroCustoId || undefined,
    });
    return Number(result.resumo.receita_bruta) || 0;
  }

  async getProjecaoMensal(input: {
    competencia?: string;
    centroCustoId?: string | null;
    includeComparacao?: boolean;
  }): Promise<MetaProjecaoMensal> {
    const now = new Date();
    const competencia = toCompetenciaMonthStart(
      input.competencia ??
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    );
    const centroCustoId = input.centroCustoId ?? null;

    const [meta, realizado] = await Promise.all([
      this.getByCompetencia(competencia, centroCustoId),
      this.getFaturamentoMes(competencia, centroCustoId),
    ]);

    let faturamentoMesAnterior: number | null = null;
    if (input.includeComparacao !== false) {
      const prev = previousCompetencia(competencia);
      faturamentoMesAnterior = await this.getFaturamentoMes(prev, centroCustoId);
    }

    return buildMetaProjecao({
      competencia,
      centroCustoId,
      meta,
      faturamentoRealizado: realizado,
      faturamentoMesAnterior,
    });
  }

  async getProjecaoFromDashboardFilters(
    filters: DashboardFilters,
  ): Promise<MetaProjecaoMensal> {
    const competencia = resolveCompetenciaFromPeriod(
      filters.dataDe,
      filters.dataAte,
    );
    return this.getProjecaoMensal({
      competencia,
      centroCustoId: filters.centroCusto ?? null,
      includeComparacao: true,
    });
  }

  async listHistorico(
    params: ListMetasVendasParams = {},
  ): Promise<PaginatedHistorico> {
    const list = await this.list(params);
    const rows: MetaHistoricoRow[] = [];

    for (const meta of list.data) {
      const proj = await this.getProjecaoMensal({
        competencia: meta.competencia,
        centroCustoId: meta.centro_custo_id,
        includeComparacao: false,
      });
      rows.push({
        meta,
        faturamento_realizado: proj.faturamento_realizado,
        percentual_atingido: proj.percentual_atingido,
        projecao_dias_corridos: proj.projecao_dias_corridos,
        projecao_dias_uteis: proj.projecao_dias_uteis,
        projecao_ou_fechamento: proj.projecao_dias_corridos,
        gap_projetado: proj.gap_projetado,
        necessario_por_dia_util: proj.necessario_por_dia_util,
        ritmo_esperado: proj.ritmo_esperado,
        ritmo_atual: proj.ritmo_atual,
        status: proj.status,
      });
    }

    return {
      ...list,
      data: rows,
    };
  }

  private async assertCentroCusto(centroCustoId: string) {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("id", centroCustoId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Centro de custo inválido para este tenant.");
  }
}

type PaginatedHistorico = Omit<ListMetasResult, "data"> & {
  data: MetaHistoricoRow[];
};

export async function createMetaVendasService(tenantId: string) {
  const supabase = await createClient();
  return new MetaVendasService(supabase, tenantId);
}
