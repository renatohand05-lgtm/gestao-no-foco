"use server";

import { revalidatePath } from "next/cache";

import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";

const MODULE_PERMS = ["configuracoes.editar", "configuracoes.tenant"] as const;

export async function updateDiasOperacaoAction(
  tenantSlug: string,
  diasOperacao: number[],
): Promise<ActionResult> {
  try {
    if (
      !Array.isArray(diasOperacao) ||
      diasOperacao.length === 0 ||
      diasOperacao.length > 7 ||
      !diasOperacao.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ) {
      return actionFail("Selecione ao menos um dia da semana.");
    }

    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      MODULE_PERMS,
    );

    const supabase = await createClient();

    const currentConfig =
      tenant.segment_config && typeof tenant.segment_config === "object"
        ? (tenant.segment_config as Record<string, unknown>)
        : {};

    const nextConfig = {
      ...currentConfig,
      dias_operacao: [...new Set(diasOperacao)].sort((a, b) => a - b),
    };

    const { error } = await supabase
      .from("tenants")
      .update({ segment_config: nextConfig as unknown as Json })
      .eq("id", tenant.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/configuracoes`);
    revalidatePath(`/${tenantSlug}/configuracoes/metas`);

    return actionOk(tenant.id);
  } catch (error) {
    if (error instanceof Error) return actionFail(error.message);
    return actionFail("Não foi possível salvar os dias de operação.");
  }
}
