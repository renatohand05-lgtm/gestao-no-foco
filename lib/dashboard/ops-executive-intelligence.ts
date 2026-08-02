/**
 * Composição ops/fluxo — pura (Sprint 29.6 / 29.8).
 * Sem I/O · seguro para Client Components via `@/lib/enterprise`.
 * Imports relativos para compatibilidade com gates Node (strip-types).
 */

import { composeExecutiveIntelligence } from "./executive-intelligence-compose.ts";
import type { ExecutiveIntelligenceData } from "./executive-intelligence-types.ts";
import type { CentroOperacoesData } from "../operacoes/centro-operacoes-service.ts";
import type { FluxoCaixaResumo } from "../../types/fluxo-caixa.ts";

export type ExecutiveIntelligenceFeeds = {
  centro: CentroOperacoesData | null;
  fluxoResumo: FluxoCaixaResumo | null;
};

/** Compõe indicadores operacionais a partir de feeds já carregados. */
export function composeOpsExecutiveIntelligence(input: {
  priorities?: unknown;
  feeds: ExecutiveIntelligenceFeeds;
}): ExecutiveIntelligenceData {
  return composeExecutiveIntelligence({
    centro: input.feeds.centro,
    fluxoResumo: input.feeds.fluxoResumo,
  });
}
