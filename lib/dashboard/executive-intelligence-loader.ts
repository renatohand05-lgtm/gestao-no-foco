/**
 * Loader async da Inteligência Operativa (Gate 16.3 / 17.2).
 * Somente Server Components / actions — importa contexto com Supabase.
 * Composição pura: `ops-executive-intelligence.ts` / `@/lib/enterprise`.
 */

import {
  loadExecutiveDashboardContext,
  toIntelligenceFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";
import type { ExecutiveIntelligenceFeeds } from "@/lib/dashboard/ops-executive-intelligence";

export type { ExecutiveIntelligenceFeeds };
export {
  composeOpsExecutiveIntelligence,
} from "@/lib/dashboard/ops-executive-intelligence";

export async function loadExecutiveIntelligenceFeeds(
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveIntelligenceFeeds> {
  const ctx = await loadExecutiveDashboardContext(tenantId, tenantSlug);
  return toIntelligenceFeeds(ctx);
}
