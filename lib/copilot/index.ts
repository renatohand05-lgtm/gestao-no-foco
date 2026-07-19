/**
 * Executive Copilot — Sprint 11.6
 * Determinístico. Zero IA externa.
 */

export { buildCopilotResponses } from "@/lib/copilot/copilot-engine";
export type { CopilotEngineInput } from "@/lib/copilot/copilot-engine";

export { COPILOT_MAX_RESPONSES } from "@/lib/copilot/types";

export type {
  CopilotResponse,
  CopilotEngineResult,
  CopilotConfidence,
  CopilotSource,
} from "@/lib/copilot/types";
