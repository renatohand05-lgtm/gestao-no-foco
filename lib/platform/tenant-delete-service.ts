import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteTenantResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Exclusão permanente de uma empresa — sem volta. Quase tudo no banco já
 * está configurado com ON DELETE CASCADE a partir de tenants(id), então
 * apagar a linha do tenant limpa clientes, vendas, financeiro, OS, etc.
 * sozinho. A única exceção é billing_subscriptions (ON DELETE RESTRICT,
 * de propósito, pra nunca sumir assinatura sem querer) — por isso
 * apagamos essa tabela manualmente antes.
 */
export async function deleteTenantPermanently(
  tenantId: string,
): Promise<DeleteTenantResult> {
  const admin = createAdminClient();

  const { error: billingError } = await admin
    .from("billing_subscriptions")
    .delete()
    .eq("tenant_id", tenantId);

  if (billingError) {
    return {
      ok: false,
      error: `Falha ao remover assinaturas: ${billingError.message}`,
    };
  }

  const { error: tenantError } = await admin
    .from("tenants")
    .delete()
    .eq("id", tenantId);

  if (tenantError) {
    return {
      ok: false,
      error: `Falha ao remover a empresa: ${tenantError.message}`,
    };
  }

  return { ok: true };
}
