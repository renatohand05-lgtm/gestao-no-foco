import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ApiKeySummary = {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const KEY_BYTES = 24; // 48 hex chars
const PREFIX_LEN = 8;

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Gera uma chave nova. O texto puro só existe nesse retorno — nunca mais é recuperável depois. */
export async function generateApiKey(
  supabase: SupabaseClient,
  tenantId: string,
  label: string,
  userId: string | null,
): Promise<{ id: string; rawKey: string; keyPrefix: string }> {
  const rawKey = `gnf_${randomBytes(KEY_BYTES).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, PREFIX_LEN);
  const keyHash = hashKey(rawKey);

  const { data, error } = await supabase
    .from("integration_api_keys" as never)
    .insert({
      tenant_id: tenantId,
      label: label.trim() || "Sem nome",
      key_prefix: keyPrefix,
      key_hash: keyHash,
      created_by: userId,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao gerar a chave.");
  }

  return { id: data.id, rawKey, keyPrefix };
}

export async function listApiKeys(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ApiKeySummary[]> {
  const { data, error } = await supabase
    .from("integration_api_keys" as never)
    .select("id, label, key_prefix, created_at, last_used_at, revoked_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      label: string;
      key_prefix: string;
      created_at: string;
      last_used_at: string | null;
      revoked_at: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    label: r.label,
    keyPrefix: r.key_prefix,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    revokedAt: r.revoked_at,
  }));
}

export async function revokeApiKey(
  supabase: SupabaseClient,
  tenantId: string,
  keyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("integration_api_keys" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", keyId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

/**
 * Verifica uma chave recebida num webhook — usa o client admin (service
 * role), já que quem chama ainda não está autenticado como usuário.
 */
export async function verifyApiKey(
  supabaseAdmin: SupabaseClient,
  rawKey: string,
): Promise<{ tenantId: string; apiKeyId: string } | null> {
  if (!rawKey || !rawKey.startsWith("gnf_")) return null;

  const keyHash = hashKey(rawKey);
  const { data, error } = await supabaseAdmin
    .from("integration_api_keys" as never)
    .select("id, tenant_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle<{ id: string; tenant_id: string; revoked_at: string | null }>();

  if (error || !data || data.revoked_at) return null;

  await supabaseAdmin
    .from("integration_api_keys" as never)
    .update({ last_used_at: new Date().toISOString() } as never)
    .eq("id", data.id);

  return { tenantId: data.tenant_id, apiKeyId: data.id };
}
