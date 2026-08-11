/**
 * Sprint 33.1 — idempotência persistente (RPC service_role).
 * Sem fallback em memória em production.
 */
import {
  createIdempotencySupabaseAdapter,
  createMemoryIdempotencyRepository,
  MemoryEnterpriseStore,
} from "@/lib/enterprise";
import type { IdempotencyRepository } from "@/lib/enterprise/repositories/idempotency-repository";
import { FinanceError, FINANCE_ERROR_CODES } from "@/lib/finance/shared/errors";

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export async function resolvePersistentIdempotency(): Promise<IdempotencyRepository> {
  try {
    const { isAdminClientAvailable, createAdminClient } = await import(
      "@/lib/supabase/admin"
    );
    if (isAdminClientAvailable()) {
      return createIdempotencySupabaseAdapter(createAdminClient());
    }
  } catch {
    /* fall through */
  }

  if (isProductionRuntime() && process.env.ALLOW_IMPORT_MEMORY !== "1") {
    throw new FinanceError(
      "Idempotência persistente indisponível (service role ausente no servidor).",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  return createMemoryIdempotencyRepository(new MemoryEnterpriseStore());
}
