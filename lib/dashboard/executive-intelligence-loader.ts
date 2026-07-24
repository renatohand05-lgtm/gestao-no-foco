/**
 * Loader da Inteligência Executiva (Gate 16.3 / 17.2).
 * Preferir loadExecutiveDashboardContext no dashboard (dedupe).
 */

import { composeExecutiveIntelligence } from "@/lib/dashboard/executive-intelligence-compose";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import type { CentroOperacoesData } from "@/lib/operacoes/centro-operacoes-service";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";
import {
  loadExecutiveDashboardContext,
  toIntelligenceFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";

export type ExecutiveIntelligenceFeeds = {
  centro: CentroOperacoesData | null;
  fluxoResumo: FluxoCaixaResumo | null;
};

export async function loadExecutiveIntelligenceFeeds(
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveIntelligenceFeeds> {
  const ctx = await loadExecutiveDashboardContext(tenantId, tenantSlug);
  return toIntelligenceFeeds(ctx);
}

export function buildExecutiveIntelligence(input: {
  priorities?: unknown;
  feeds: ExecutiveIntelligenceFeeds;
}): ExecutiveIntelligenceData {
  return composeExecutiveIntelligence({
    centro: input.feeds.centro,
    fluxoResumo: input.feeds.fluxoResumo,
  });
}
