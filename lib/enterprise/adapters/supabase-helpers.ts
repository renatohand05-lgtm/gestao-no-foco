/**
 * Sprint 21.6 — Helpers compartilhados dos adapters Supabase.
 * Server-side only (não importar em Client Components).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EnterprisePersistenceError,
  toSafeEnterpriseError,
} from "../errors.ts";
import type { Database } from "@/types/database";

/** Client tipado; tabelas Enterprise podem ainda não estar em Database. */
export type EnterpriseSupabaseClient = SupabaseClient<Database>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseQuery = any;

export function enterpriseFrom(
  client: EnterpriseSupabaseClient,
  table: string,
): LooseQuery {
  // Tabelas Sprint 21.6 — tipagem regenerável em types/database.ts
  return (client as unknown as { from: (t: string) => LooseQuery }).from(table);
}

export function throwIfError(
  error: { message?: string } | null,
  context: string,
): void {
  if (error) {
    throw toSafeEnterpriseError(
      new EnterprisePersistenceError(error.message ?? context),
      `Falha em ${context}.`,
    );
  }
}
