/**
 * Sprint 22.10.1 — Resolve engine de produção para adapters de módulo (Vendas/OS).
 * Histórico/mapeamento → Supabase. Staging de linhas permanece memória EXPLÍCITA
 * até haver persistência no domínio Vendas/OS (sem fingir vendas/OS reais).
 */
import { createClient } from "@/lib/supabase/server";

import type { ModuleImportAdapter } from "./module-adapter.ts";
import {
  requireModuleImportAccess,
  type ImportModuleAccess,
} from "./require-import-access.ts";
import { createProductionImportEngine } from "../../persistence/create-import-engine.ts";
import type { ImportEngineBundle } from "../../persistence/create-supabase-import-engine.ts";

export type ModuleImportRuntime = ImportModuleAccess &
  ImportEngineBundle & {
    stagingMemoryExplicit: true;
    stagingDisclaimer: string;
  };

export async function resolveModuleImportRuntime(
  tenantSlug: string,
  adapter: ModuleImportAdapter,
): Promise<ModuleImportRuntime> {
  const access = await requireModuleImportAccess(tenantSlug, adapter);
  const client = await createClient();
  const bundle = createProductionImportEngine(client);
  return {
    ...access,
    ...bundle,
    stagingMemoryExplicit: true,
    stagingDisclaimer:
      "Staging de linhas confirmadas permanece em memória de forma EXPLÍCITA até a ligação aos services do módulo. Histórico e mapeamentos usam Supabase.",
  };
}
