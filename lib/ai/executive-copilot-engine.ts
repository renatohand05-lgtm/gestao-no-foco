/**
 * Executive Copilot Engine — Gate 20.3
 * Consome Decision Engine / EIC / Business Health · sem fetch · sem LLM.
 */

import {
  buildExecutiveCopilotContext,
  type ExecutiveCopilotContext,
} from "./executive-copilot-context.ts";
import { detectExecutiveCopilotIntent } from "./executive-copilot-intents.ts";
import { buildResponseForIntent } from "./executive-copilot-responses.ts";
import type { ExecutiveAiResult } from "./executive-ai-types.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import {
  EXECUTIVE_COPILOT_ENGINE_VERSION,
  type ExecutiveCopilotAccess,
  type ExecutiveCopilotIntent,
  type ExecutiveCopilotResponse,
} from "./executive-copilot-types.ts";

export type RunExecutiveCopilotInput = {
  query: string;
  tenantSlug: string;
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  access?: Partial<ExecutiveCopilotAccess>;
  /** Contexto pré-montado (evita recompose em histórico da sessão). */
  context?: ExecutiveCopilotContext;
};

export function runExecutiveCopilot(
  input: RunExecutiveCopilotInput,
): ExecutiveCopilotResponse {
  const ctx =
    input.context ??
    buildExecutiveCopilotContext({
      tenantSlug: input.tenantSlug,
      ai: input.ai,
      decision: input.decision,
      access: input.access,
    });

  const intent: ExecutiveCopilotIntent = detectExecutiveCopilotIntent(
    input.query,
  );
  return buildResponseForIntent(intent, ctx);
}

export const ExecutiveCopilotEngine = {
  version: EXECUTIVE_COPILOT_ENGINE_VERSION,
  run: runExecutiveCopilot,
  detectIntent: detectExecutiveCopilotIntent,
  buildContext: buildExecutiveCopilotContext,
} as const;

export type { ExecutiveCopilotContext, ExecutiveCopilotResponse };
