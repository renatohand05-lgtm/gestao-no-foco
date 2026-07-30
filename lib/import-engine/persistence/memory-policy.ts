/**
 * Sprint 22.10.1 — Política de stores em memória na Import Engine.
 *
 * Classificação:
 * - teste: createMemory* em scripts/suites (NODE_ENV !== production)
 * - desenvolvimento: NODE_ENV !== "production"
 * - fallback controlado: ALLOW_IMPORT_MEMORY=1 (explícito)
 * - staging/wizard explícito: razões whitelist abaixo
 * - produção: createProductionImportEngine obrigatório (sem fallback silencioso)
 */

export const STAGING_MEMORY_REASON =
  "staging_explicit_until_module_persistence";

export const WIZARD_SESSION_MEMORY_REASON =
  "wizard_session_ephemeral_ttl";

/** Razões permitidas em produção sem ALLOW_IMPORT_MEMORY (sempre explícitas). */
const PRODUCTION_ALLOWED_REASONS = new Set([
  STAGING_MEMORY_REASON,
  WIZARD_SESSION_MEMORY_REASON,
  "test_or_explicit_memory_engine",
  "dev_or_test_without_client",
  "explicit_dev_fallback_after_supabase_error",
]);

export function isImportMemoryExplicitlyAllowed(): boolean {
  const raw = process.env.ALLOW_IMPORT_MEMORY?.trim().toLowerCase() ?? "";
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isImportProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Bloqueia uso silencioso de memória em produção.
 * @param reason — deve estar na whitelist ou ALLOW_IMPORT_MEMORY=1
 */
export function assertImportMemoryUsageAllowed(reason?: string): void {
  if (!isImportProductionRuntime()) return;
  if (isImportMemoryExplicitlyAllowed()) return;
  if (reason && PRODUCTION_ALLOWED_REASONS.has(reason)) return;
  throw new Error(
    "Store em memória da Import Engine bloqueado em produção. " +
      "Use createProductionImportEngine(client) ou defina ALLOW_IMPORT_MEMORY=1 " +
      "apenas para cenários explicitamente controlados.",
  );
}

export function isProductionMemoryReasonAllowed(reason: string): boolean {
  return PRODUCTION_ALLOWED_REASONS.has(reason);
}
