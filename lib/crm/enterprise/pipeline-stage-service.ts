/**
 * Sprint 24.2 — Persistência de etapas do pipeline (Supabase real).
 * Sem fallback silencioso em memória após migration 20260812.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { CrmPipelineStageRow } from "@/types/crm-enterprise";

import {
  CRM_FUNIL_LABELS,
  CRM_FUNIL_STAGES,
} from "../constants.ts";

export type PipelineStageInput = {
  stage_key: string;
  label: string;
  sort_order: number;
  active?: boolean;
  color?: string | null;
  probabilidade_padrao?: number | null;
  is_won?: boolean;
  is_lost?: boolean;
  empresa_id?: string | null;
};

export type PipelineListResult = {
  source: "database";
  stages: CrmPipelineStageRow[];
  empty: boolean;
  note?: string;
};

const STAGE_KEY_RE = /^[a-z][a-z0-9_]{0,62}$/;

export class CrmPipelineStageService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(empresaId: string | null = null): Promise<CrmPipelineStageRow[]> {
    let q = this.supabase
      .from("crm_pipeline_stages")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("sort_order", { ascending: true });

    q = empresaId ? q.eq("empresa_id", empresaId) : q.is("empresa_id", null);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Falha ao ler crm_pipeline_stages: ${error.message}`);
    }
    return (data ?? []) as CrmPipelineStageRow[];
  }

  /**
   * Somente dados do Supabase. Vazio = empty explícito (não inventa etapas).
   */
  async listFromDatabase(
    empresaId: string | null = null,
  ): Promise<PipelineListResult> {
    const rows = await this.list(empresaId);
    const active = rows.filter((r) => r.active);
    return {
      source: "database",
      stages: active,
      empty: active.length === 0,
      note:
        active.length === 0
          ? "Nenhuma etapa persistida neste tenant/empresa. Use «Persistir etapas padrão»."
          : undefined,
    };
  }

  /** @deprecated Prefer listFromDatabase — mantido como alias sem inventar dados. */
  async listOrFallback(empresaId: string | null = null) {
    return this.listFromDatabase(empresaId);
  }

  async seedDefaults(
    userId: string | null,
    empresaId: string | null = null,
  ): Promise<CrmPipelineStageRow[]> {
    const existing = await this.list(empresaId);
    if (existing.length) return existing;

    const rows = CRM_FUNIL_STAGES.map((key, idx) => ({
      tenant_id: this.tenantId,
      empresa_id: empresaId,
      stage_key: key,
      label: CRM_FUNIL_LABELS[key],
      sort_order: idx + 1,
      active: true,
      color: null as string | null,
      probabilidade_padrao:
        key === "fechado"
          ? 100
          : key === "perdido"
            ? 0
            : ([10, 25, 50, 75, 100, 0][idx] as number),
      is_won: key === "fechado",
      is_lost: key === "perdido",
      is_default_pipeline: true,
      created_by: userId,
      updated_by: userId,
    }));

    const { data, error } = await this.supabase
      .from("crm_pipeline_stages")
      .insert(rows)
      .select("*");

    if (error) {
      throw new Error(`Falha ao persistir etapas padrão: ${error.message}`);
    }
    return (data ?? []) as CrmPipelineStageRow[];
  }

  async upsertStage(
    input: PipelineStageInput,
    userId: string | null,
  ): Promise<CrmPipelineStageRow> {
    if (!STAGE_KEY_RE.test(input.stage_key)) {
      throw new Error("stage_key inválida.");
    }
    if (input.is_won && input.is_lost) {
      throw new Error("Etapa não pode ser ganha e perdida ao mesmo tempo.");
    }
    if (
      input.probabilidade_padrao != null &&
      (input.probabilidade_padrao < 0 || input.probabilidade_padrao > 100)
    ) {
      throw new Error("Probabilidade padrão deve estar entre 0 e 100.");
    }

    const payload = {
      tenant_id: this.tenantId,
      empresa_id: input.empresa_id ?? null,
      stage_key: input.stage_key,
      label: input.label.trim(),
      sort_order: input.sort_order,
      active: input.active ?? true,
      color: input.color ?? null,
      probabilidade_padrao: input.probabilidade_padrao ?? null,
      is_won: input.is_won ?? false,
      is_lost: input.is_lost ?? false,
      is_default_pipeline: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    let existingQuery = this.supabase
      .from("crm_pipeline_stages")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("stage_key", input.stage_key);

    existingQuery = input.empresa_id
      ? existingQuery.eq("empresa_id", input.empresa_id)
      : existingQuery.is("empresa_id", null);

    const { data: existing, error: findErr } = await existingQuery.maybeSingle();
    if (findErr) throw new Error(findErr.message);

    if (existing?.id) {
      const { data, error } = await this.supabase
        .from("crm_pipeline_stages")
        .update(payload)
        .eq("id", existing.id)
        .eq("tenant_id", this.tenantId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as CrmPipelineStageRow;
    }

    const { data, error } = await this.supabase
      .from("crm_pipeline_stages")
      .insert({ ...payload, created_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as CrmPipelineStageRow;
  }

  async deactivateStage(
    stageKey: string,
    empresaId: string | null,
  ): Promise<void> {
    let q = this.supabase
      .from("crm_pipeline_stages")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", this.tenantId)
      .eq("stage_key", stageKey);

    q = empresaId ? q.eq("empresa_id", empresaId) : q.is("empresa_id", null);

    const { error } = await q;
    if (error) throw new Error(error.message);
  }
}

export async function createCrmPipelineStageService(tenantId: string) {
  const supabase = await createClient();
  return new CrmPipelineStageService(supabase, tenantId);
}
