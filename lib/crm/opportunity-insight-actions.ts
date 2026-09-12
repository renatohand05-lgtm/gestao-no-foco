"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  OpportunityScoringNotConfiguredError,
  scoreOpportunity,
} from "@/lib/crm/opportunity-scoring-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResultWith } from "@/types/action-result";

export type OpportunityInsight = {
  id: string;
  probabilidade: number;
  proximaAcao: string;
  justificativa: string;
  createdAt: string;
};

export async function analyzeOpportunityAction(
  tenantSlug: string,
  oportunidadeId: string,
): Promise<ActionResultWith<{ insight: OpportunityInsight }>> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.editar");
    const profile = await getCurrentProfile();
    const client = await createClient();

    const { data: opp, error: oppError } = await client
      .from("crm_oportunidades" as never)
      .select("titulo, valor_estimado, stage_key, origem, produto_servico, probabilidade, updated_at")
      .eq("id", oportunidadeId)
      .eq("tenant_id", tenant.id)
      .maybeSingle<{
        titulo: string;
        valor_estimado: number | null;
        stage_key: string;
        origem: string | null;
        produto_servico: string | null;
        probabilidade: number | null;
        updated_at: string;
      }>();

    if (oppError || !opp) {
      throw new Error("Oportunidade não encontrada.");
    }

    const diasNoFunil = Math.max(
      0,
      Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86_400_000),
    );

    const result = await scoreOpportunity({
      titulo: opp.titulo,
      valorEstimado: opp.valor_estimado,
      stageKey: opp.stage_key,
      origem: opp.origem,
      produtoServico: opp.produto_servico,
      diasNoFunil,
      probabilidadeAtual: opp.probabilidade,
    });

    const { data: insight, error: insightError } = await client
      .from("crm_oportunidade_ai_insights" as never)
      .insert({
        tenant_id: tenant.id,
        oportunidade_id: oportunidadeId,
        probabilidade: result.probabilidade,
        proxima_acao: result.proximaAcao,
        justificativa: result.justificativa,
        gerado_por: profile?.id ?? null,
      } as never)
      .select("id, probabilidade, proxima_acao, justificativa, created_at")
      .single<{
        id: string;
        probabilidade: number;
        proxima_acao: string;
        justificativa: string;
        created_at: string;
      }>();

    if (insightError || !insight) {
      throw new Error(insightError?.message ?? "Falha ao salvar a análise.");
    }

    await client
      .from("crm_oportunidades" as never)
      .update({ probabilidade: result.probabilidade } as never)
      .eq("id", oportunidadeId)
      .eq("tenant_id", tenant.id);

    revalidatePath(`/${tenantSlug}/crm/pipeline`);

    return {
      success: true,
      insight: {
        id: insight.id,
        probabilidade: insight.probabilidade,
        proximaAcao: insight.proxima_acao,
        justificativa: insight.justificativa,
        createdAt: insight.created_at,
      },
    };
  } catch (error) {
    if (error instanceof OpportunityScoringNotConfiguredError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao analisar a oportunidade.",
    };
  }
}

export async function listOpportunityInsightsAction(
  tenantSlug: string,
  oportunidadeId: string,
) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();

    const { data, error } = await client
      .from("crm_oportunidade_ai_insights" as never)
      .select("id, probabilidade, proxima_acao, justificativa, created_at")
      .eq("tenant_id", tenant.id)
      .eq("oportunidade_id", oportunidadeId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);

    const insights: OpportunityInsight[] = (
      (data ?? []) as unknown as Array<{
        id: string;
        probabilidade: number;
        proxima_acao: string;
        justificativa: string;
        created_at: string;
      }>
    ).map((r) => ({
      id: r.id,
      probabilidade: r.probabilidade,
      proximaAcao: r.proxima_acao,
      justificativa: r.justificativa,
      createdAt: r.created_at,
    }));

    return { success: true as const, data: insights };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao carregar análises.",
    };
  }
}
