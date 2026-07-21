import type { SupabaseClient } from "@supabase/supabase-js";

import { CRM_FUNIL_STAGES, type CrmFunilStage } from "@/lib/crm/constants";
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
        "id, nome, documento, email, telefone, estagio_funil, score, classificacao, updated_at",
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
    }>;

    if (!rows.length) return empty;

    const ids = rows.map((r) => r.id);
    const [tagsByCliente, pipelineByCliente] = await Promise.all([
      this.loadTagsBulk(ids),
      this.loadPipelineBulk(ids),
    ]);

    for (const row of rows) {
      const stage = CRM_FUNIL_STAGES.includes(row.estagio_funil)
        ? row.estagio_funil
        : "lead";
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
        valor_pipeline: pipelineByCliente.get(row.id) ?? 0,
        updated_at: row.updated_at,
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

  async moveToStage(clienteId: string, estagio: CrmFunilStage): Promise<void> {
    const { error } = await this.supabase
      .from("clientes" as never)
      .update({ estagio_funil: estagio, updated_at: new Date().toISOString() } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function createCrmFunilService(tenantId: string) {
  const supabase = await createClient();
  return new CrmFunilService(supabase, tenantId);
}
