/**
 * Executive Copilot — tipos (Sprint 11.6)
 * 100% determinístico — sem LLM / API / prompt.
 */

export type CopilotConfidence = "baixa" | "media" | "alta";

export type CopilotSource =
  | "action_center"
  | "executive_intelligence"
  | "business_intelligence"
  | "prediction_engine"
  | "timeline";

export type CopilotResponse = {
  id: string;
  headline: string;
  resposta: string;
  evidencias: string[];
  confidence: CopilotConfidence;
  fontes: CopilotSource[];
  proximaAcao: string;
  /** Ordenação interna (menor = mais urgente). */
  rank: number;
};

export type CopilotEngineResult = {
  responses: CopilotResponse[];
};

export const COPILOT_MAX_RESPONSES = 3;
