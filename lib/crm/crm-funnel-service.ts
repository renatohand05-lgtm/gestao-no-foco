import type { SupabaseClient } from "@supabase/supabase-js";

import { CRM_FUNIL_STAGES, type CrmFunilStage } from "@/lib/crm/constants";
import { enrichPipelineCardMetrics } from "@/lib/crm/premium/pipeline-enrich";
import { createClient } from "@/lib/supabase/server";
import type { CrmFunilCard } from "@/types/crm";

export class CrmFunilService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByStage(): Promise<Record<CrmFunilStage, CrmFunilCard[]>> {
    const empty = Object.fromEntries(
      CRM_FUNIL_STAGES.map((s) => [s, [] as CrmFunilCard[]]),
    ) as Record<CrmFunilStage, CrmFunilCard[]>;

    const { data, error } = await this.supabase
      .from("clientes" as never)
      .select(
        "id, nome, documento, email, telefone, estagio_funil, score, classificacao, updated_at, created_at, valor_estimado, valor_potencial, probabilidade, consultor_id, prioridade_crm, proxima_acao, data_proxima_acao, origem",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      if (/estagio_funil|column|schema cache/i.test(error.message)) {
        return empty;
      }
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      nome: string;
      documento: string | null;
      email: string | null;
      telefone: string | null;
      estagio_funil: CrmFunilStage;
      score: number;
      classificacao: string | null;
      updated_at: string;
      created_at: string;
      valor_estimado: number | null;
      valor_potencial: number | null;
      probabilidade: number | null;
      consultor_id: string | null;
      prioridade_crm: string | null;
      proxima_acao: string | null;
      data_proxima_acao: string | null;
      origem: string | null;
    }>;

    if (!rows.length) return empty;

    const ids = rows.map((r) => r.id);
    const consultorIds = [
      ...new Set(rows.map((r) => r.consultor_id).filter(Boolean)),
    ] as string[];

    const [tagsByCliente, pipelineByCliente, lastContactByCliente, names] =
      await Promise.all([
        this.loadTagsBulk(ids),
        this.loadPipelineBulk(ids),
        this.loadLastContactBulk(ids),
        this.loadProfileNames(consultorIds),
      ]);

    const now = new Date();

    for (const row of rows) {
      const stage = CRM_FUNIL_STAGES.includes(row.estagio_funil)
        ? row.estagio_funil
        : "lead";
      const valorPipeline = pipelineByCliente.get(row.id) ?? 0;
      const valorEstimado =
        row.valor_estimado != null
          ? Number(row.valor_estimado)
          : row.valor_potencial != null
            ? Number(row.valor_potencial)
            : null;
      const ultimo =
        lastContactByCliente.get(row.id) ?? row.updated_at ?? null;
      const metrics = enrichPipelineCardMetrics({
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ultimoContatoAt: ultimo,
        valorEstimado,
        valorPipeline,
        stage,
        origem: row.origem,
        historicoCount: valorPipeline > 0 ? 1 : 0,
        atividadeCount: lastContactByCliente.has(row.id) ? 1 : 0,
        storedScore: Number(row.score ?? 0),
        now,
      });

      empty[stage].push({
        id: row.id,
        nome: row.nome,
        documento: row.documento,
        email: row.email,
        telefone: row.telefone,
        estagio_funil: stage,
        score: Number(row.score ?? 0),
        classificacao: row.classificacao,
        tags: tagsByCliente.get(row.id) ?? [],
        valor_pipeline: valorEstimado != null && valorEstimado > 0
          ? valorEstimado
          : valorPipeline,
        updated_at: row.updated_at,
        valor_estimado: valorEstimado,
        probabilidade:
          row.probabilidade == null ? null : Number(row.probabilidade),
        consultor_id: row.consultor_id,
        consultor_nome: row.consultor_id
          ? (names.get(row.consultor_id) ?? null)
          : null,
        prioridade_crm: row.prioridade_crm,
        proxima_acao: row.proxima_acao,
        data_proxima_acao: row.data_proxima_acao
          ? String(row.data_proxima_acao).slice(0, 10)
          : null,
        origem: row.origem,
        ultimo_contato_at: ultimo,
        idade_dias: metrics.idadeDias,
        tempo_parado_dias: metrics.tempoParadoDias,
        commercial_score: metrics.commercialScore,
        created_at: row.created_at,
      });
    }

    return empty;
  }

  async getColumnStats(): Promise<
    Array<{ estagio: CrmFunilStage; total: number; valor_total: number }>
  > {
    const columns = await this.listByStage();
    return CRM_FUNIL_STAGES.map((estagio) => {
      const cards = columns[estagio] ?? [];
      return {
        estagio,
        total: cards.length,
        valor_total: cards.reduce((a, c) => a + c.valor_pipeline, 0),
      };
    });
  }

  private async loadProfileNames(ids: string[]) {
    const map = new Map<string, string>();
    if (!ids.length) return map;
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids.slice(0, 80));
    for (const p of data ?? []) {
      map.set(p.id, p.full_name?.trim() || p.email || p.id.slice(0, 8));
    }
    return map;
  }

  private async loadLastContactBulk(clienteIds: string[]) {
    const map = new Map<string, string>();
    if (!clienteIds.length) return map;
    const { data, error } = await this.supabase
      .from("cliente_eventos" as never)
      .select("cliente_id, created_at")
      .eq("tenant_id", this.tenantId)
      .in("cliente_id", clienteIds.slice(0, 400))
      .order("created_at", { ascending: false })
      .limit(800);

    if (error) return map;
    for (const row of (data ?? []) as Array<{
      cliente_id: string;
      created_at: string;
    }>) {
      if (!map.has(row.cliente_id)) {
        map.set(row.cliente_id, row.created_at);
      }
    }
    return map;
  }

  private async loadTagsBulk(clienteIds: string[]) {
    const map = new Map<string, string[]>();
    const { data } = await this.supabase
      .from("entity_tags" as never)
      .select("entity_id, tags:tags ( nome )")
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", "cliente")
      .in("entity_id", clienteIds);

    for (const row of (data ?? []) as Array<{
      entity_id: string;
      tags?: { nome?: string } | null;
    }>) {
      const nome = row.tags?.nome;
      if (!nome) continue;
      if (!map.has(row.entity_id)) map.set(row.entity_id, []);
      map.get(row.entity_id)!.push(nome);
    }
    return map;
  }

  private async loadPipelineBulk(clienteIds: string[]) {
    const map = new Map<string, number>();
    const [vendasRes, osRes] = await Promise.all([
      this.supabase
        .from("vendas")
        .select("cliente_id, total")
        .eq("tenant_id", this.tenantId)
        .in("cliente_id", clienteIds)
        .is("deleted_at", null)
        .in("status", ["orcamento", "em_andamento", "faturado"]),
      this.supabase
        .from("ordens_servico")
        .select("cliente_id, subtotal, desconto_total, acrescimo_total")
        .eq("tenant_id", this.tenantId)
        .in("cliente_id", clienteIds)
        .is("deleted_at", null),
    ]);

    for (const v of vendasRes.data ?? []) {
      if (!v.cliente_id) continue;
      map.set(v.cliente_id, (map.get(v.cliente_id) ?? 0) + Number(v.total ?? 0));
    }
    for (const o of osRes.data ?? []) {
      if (!o.cliente_id) continue;
      const val =
        Number(o.subtotal ?? 0) -
        Number(o.desconto_total ?? 0) +
        Number(o.acrescimo_total ?? 0);
      map.set(o.cliente_id, (map.get(o.cliente_id) ?? 0) + val);
    }
    return map;
  }

  async moveToStage(
    clienteId: string,
    estagio: CrmFunilStage,
    userId: string | null = null,
  ): Promise<void> {
    const { data: current } = await this.supabase
      .from("clientes" as never)
      .select("estagio_funil, tenant_id")
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!current) throw new Error("Cliente não encontrado neste tenant.");

    const fromStage = (current as { estagio_funil?: string }).estagio_funil ?? null;

    const { error } = await this.supabase
      .from("clientes" as never)
      .update({ estagio_funil: estagio, updated_at: new Date().toISOString() } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await this.supabase.from("crm_stage_movements" as never).insert({
      tenant_id: this.tenantId,
      cliente_id: clienteId,
      from_stage: fromStage,
      to_stage: estagio,
      user_id: userId,
      motivo: "funil",
    } as never);
  }
}

export async function createCrmFunilService(tenantId: string) {
  const supabase = await createClient();
  return new CrmFunilService(supabase, tenantId);
}
