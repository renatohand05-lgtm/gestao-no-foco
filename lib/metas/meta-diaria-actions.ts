"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

/**
 * Upsert de meta diária manual (soft-delete do vigente anterior no mesmo escopo).
 * Não apaga histórico: marca deleted_at e cria novo registro.
 */
export async function upsertMetaDiariaAction(
  tenantSlug: string,
  input: {
    data: string;
    valor_meta: number;
    centro_custo_id?: string | null;
    vendedor_id?: string | null;
    observacao?: string | null;
  },
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const dataIso = String(input.data).slice(0, 10);
    const valor = Number(input.valor_meta);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
      return { success: false, error: "Data inválida." };
    }
    if (!Number.isFinite(valor) || valor < 0) {
      return { success: false, error: "Valor da meta inválido." };
    }

    const centro = input.centro_custo_id || null;
    const vendedor = input.vendedor_id || null;

    let soft = supabase
      .from("metas_vendas_diarias")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", tenant.id)
      .eq("data", dataIso)
      .is("deleted_at", null)
      .is("equipe_id", null)
      .is("mecanico_id", null);

    if (centro) soft = soft.eq("centro_custo_id", centro);
    else soft = soft.is("centro_custo_id", null);
    if (vendedor) soft = soft.eq("vendedor_id", vendedor);
    else soft = soft.is("vendedor_id", null);

    const softRes = await soft;
    if (softRes.error && !/does not exist|schema cache/i.test(softRes.error.message)) {
      // se a tabela ainda não foi migrada, o insert abaixo falha com msg clara
    }

    const { data, error } = await supabase
      .from("metas_vendas_diarias")
      .insert({
        tenant_id: tenant.id,
        data: dataIso,
        valor_meta: valor,
        centro_custo_id: centro,
        vendedor_id: vendedor,
        origem: "manual",
        observacao: input.observacao ?? null,
        created_by: profile?.id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      const msg = /does not exist|schema cache/i.test(error.message)
        ? "Aplique a migration 20260806_metas_vendas_diarias.sql no Supabase."
        : error.message;
      return { success: false, error: msg };
    }

    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/configuracoes/metas`);
    return { success: true, id: data.id as string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao salvar meta diária.",
    };
  }
}
