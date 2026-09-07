import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Empresas criadas antes de 2026-09-07 (access_gated = false) nunca são
 * bloqueadas — decisão explícita do dono da plataforma, pra não quebrar
 * testes/pilotos já em andamento.
 *
 * Empresas criadas a partir de agora (access_gated = true) só entram no
 * sistema com uma assinatura de status 'active' (pagamento confirmado pela
 * Asaas) — nunca em 'trial', 'past_due' ou sem registro nenhum.
 */
export async function hasConfirmedBillingAccess(
  client: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  const { data: tenant, error: tenantError } = await client
    .from("tenants")
    .select("access_gated")
    .eq("id", tenantId)
    .maybeSingle<{ access_gated: boolean }>();

  if (tenantError || !tenant) return true; // falha de leitura nunca bloqueia por engano
  if (!tenant.access_gated) return true;

  const { data: subscription } = await client
    .from("billing_subscriptions")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle<{ status: string }>();

  return Boolean(subscription);
}
