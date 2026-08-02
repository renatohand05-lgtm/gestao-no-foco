/**
 * Fase 28.1 — Carrega leads = clientes em estagio_funil = lead.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LeadInboxRow } from "@/lib/crm/phase28/leads-inbox";
import { createClient } from "@/lib/supabase/server";

export class CrmLeadsInboxService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listLeads(): Promise<{ rows: LeadInboxRow[]; schemaReady: boolean }> {
    const { data, error } = await this.supabase
      .from("clientes")
      .select(
        "id, nome, nome_fantasia, telefone, email, origem, segmento, consultor_id, estagio_funil, score, prioridade_crm, valor_potencial, proxima_acao, data_proxima_acao",
      )
      .eq("tenant_id", this.tenantId)
      .eq("estagio_funil", "lead")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      // Colunas Fase 28 podem não existir ainda — fallback mínimo
      const fallback = await this.supabase
        .from("clientes")
        .select(
          "id, nome, nome_fantasia, telefone, email, origem, segmento, consultor_id, estagio_funil, score",
        )
        .eq("tenant_id", this.tenantId)
        .eq("estagio_funil", "lead")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (fallback.error) {
        throw new Error(fallback.error.message);
      }

      return {
        schemaReady: false,
        rows: (fallback.data ?? []).map((r) => mapLead(r as Record<string, unknown>)),
      };
    }

    return {
      schemaReady: true,
      rows: (data ?? []).map((r) => mapLead(r as Record<string, unknown>)),
    };
  }
}

function mapLead(r: Record<string, unknown>): LeadInboxRow {
  return {
    id: String(r.id),
    nome: String(r.nome ?? "—"),
    empresa: (r.nome_fantasia as string | null) ?? null,
    telefone: (r.telefone as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    origem: (r.origem as string | null) ?? null,
    segmento: (r.segmento as string | null) ?? null,
    responsavelId: (r.consultor_id as string | null) ?? null,
    responsavelNome: null,
    status: String(r.estagio_funil ?? "lead"),
    prioridade: (r.prioridade_crm as string | null) ?? null,
    score: r.score == null ? null : Number(r.score),
    valorPotencial:
      r.valor_potencial == null ? null : Number(r.valor_potencial),
    proximaAcao: (r.proxima_acao as string | null) ?? null,
    dataProximaAcao: (r.data_proxima_acao as string | null) ?? null,
    tags: [],
  };
}

export async function createCrmLeadsInboxService(tenantId: string) {
  const supabase = await createClient();
  return new CrmLeadsInboxService(supabase, tenantId);
}
