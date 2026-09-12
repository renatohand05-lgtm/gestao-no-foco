"use server";

import { revalidatePath } from "next/cache";

import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/integracoes-vendas/api-key-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

export async function generateApiKeyAction(
  tenantSlug: string,
  label: string,
): Promise<ActionResultWith<{ rawKey: string; keyPrefix: string }>> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "configuracoes.integracoes",
    );
    const profile = await getCurrentProfile();
    const client = await createClient();

    const { rawKey, keyPrefix } = await generateApiKey(
      client,
      tenant.id,
      label,
      profile?.id ?? null,
    );

    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: true, rawKey, keyPrefix };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao gerar a chave.",
    };
  }
}

export async function listApiKeysAction(tenantSlug: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const keys = await listApiKeys(client, tenant.id);
    return { success: true as const, data: keys };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao listar chaves.",
    };
  }
}

export async function revokeApiKeyAction(
  tenantSlug: string,
  keyId: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "configuracoes.integracoes",
    );
    const client = await createClient();
    await revokeApiKey(client, tenant.id, keyId);

    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao revogar a chave.",
    };
  }
}
