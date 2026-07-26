/**
 * Executive Copilot — contexto a partir de engines existentes (Gate 20.3).
 * Sem fetch · sem recalcular scores.
 */

import type { ExecutiveAiResult } from "./executive-ai-types.ts";
import { composeExecutiveIntelligenceCenter } from "../dashboard/executive-intelligence-center-compose.ts";
import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import {
  runBusinessHealthEngine,
  type BusinessHealthResult,
} from "../dashboard/business-health-engine.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import type { ExecutiveCopilotAccess } from "./executive-copilot-types.ts";

export type ExecutiveCopilotContext = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  decision: ExecutiveDecisionResult | null;
  eic: ExecutiveIntelligenceCenterData;
  bh: BusinessHealthResult;
  access: ExecutiveCopilotAccess;
  generatedAt: string;
};

export const DEFAULT_COPILOT_ACCESS: ExecutiveCopilotAccess = {
  financeiro: true,
  comercial: true,
  estoque: true,
  operacao: true,
  crm: true,
  ordens: true,
  centroOperacoes: true,
  metas: true,
};

export function buildExecutiveCopilotContext(input: {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  access?: Partial<ExecutiveCopilotAccess>;
  /** BH pré-computado (Command Center / EIC shell). */
  businessHealth?: BusinessHealthResult;
  /** EIC pré-composto. */
  eic?: ExecutiveIntelligenceCenterData;
}): ExecutiveCopilotContext {
  const ai = input.ai;
  const decision = input.decision ?? null;
  return {
    tenantSlug: input.tenantSlug,
    ai,
    decision,
    eic:
      input.eic ??
      composeExecutiveIntelligenceCenter({ ai, decision }),
    bh: input.businessHealth ?? runBusinessHealthEngine(ai),
    access: { ...DEFAULT_COPILOT_ACCESS, ...input.access },
    generatedAt: ai.generatedAt || new Date().toISOString(),
  };
}

export function canAccessDomain(
  ctx: ExecutiveCopilotContext,
  domain:
    | "financeiro"
    | "comercial"
    | "estoque"
    | "operacao"
    | "crm"
    | "ordens"
    | "centroOperacoes"
    | "metas",
): boolean {
  return ctx.access[domain] === true;
}
