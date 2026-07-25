/**
 * Executive Decision Engine — fachada Gate 20.1.
 *
 * Motor determinístico (Gate 18.5). Sem LLM / ML / APIs externas.
 * Consolida scores Financeiro · Comercial · Operação · Estoque · CRM
 * e alimenta o Centro de Inteligência Operacional.
 *
 * Carregamento de feeds (soft-fail): `buildExecutiveAiResult`
 * em `@/lib/ai/executive-ai-snapshot` (somente runtime Next).
 */

export {
  calcExecutiveAiConfidence,
  calcExecutiveScore,
  classifyExecutiveHealth,
  runExecutiveAiEngine,
  runExecutiveAiEngine as runExecutiveDecisionEngine,
} from "../ai/executive-ai-engine.ts";

export {
  EXECUTIVE_AI_MODULE_WEIGHTS as EXECUTIVE_DECISION_ENGINE_WEIGHTS,
  EXECUTIVE_AI_RULE_VERSION as EXECUTIVE_DECISION_ENGINE_VERSION,
  EXECUTIVE_AI_MODULES as EXECUTIVE_DECISION_ENGINE_MODULES,
} from "../ai/executive-ai-types.ts";

export type {
  ExecutiveAiResult as ExecutiveDecisionEngineResult,
  ExecutiveAiInput as ExecutiveDecisionEngineInput,
  ExecutiveAiModule as ExecutiveDecisionEngineModule,
} from "../ai/executive-ai-types.ts";

export { composeExecutiveIntelligenceCenter } from "./executive-intelligence-center-compose.ts";
export type { ExecutiveIntelligenceCenterData } from "./executive-intelligence-center-types.ts";
