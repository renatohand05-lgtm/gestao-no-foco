/**
 * Executive Timeline Engine — Gate 20.5
 * Consome BH + AI + EIC + Predictive · sem fetch · sem LLM.
 */

import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import {
  runBusinessHealthEngine,
  type BusinessHealthResult,
} from "../dashboard/business-health-engine.ts";
import { composeExecutiveIntelligenceCenter } from "../dashboard/executive-intelligence-center-compose.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import {
  dedupeTimelineEvents,
  filterByCategory,
  groupTimelineEvents,
  sortTimelineEvents,
} from "./grouping.ts";
import {
  eventsFromBusinessHealth,
  eventsFromExecutiveAi,
  eventsFromIntelligenceCenter,
  eventsFromPredictive,
} from "./events.ts";
import {
  EXECUTIVE_TIMELINE_ENGINE_VERSION,
  EXECUTIVE_TIMELINE_MAX_EVENTS,
  type ExecutiveTimelineCategory,
  type ExecutiveTimelineResult,
  type ExecutiveTimelineSort,
} from "./types.ts";

export type RunExecutiveTimelineInput = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  decision?: ExecutiveDecisionResult | null;
  /** BH pré-computado (evita recompose desnecessário). */
  businessHealth?: BusinessHealthResult;
  sort?: ExecutiveTimelineSort;
  categories?: ExecutiveTimelineCategory[] | null;
};

export function runExecutiveTimeline(
  input: RunExecutiveTimelineInput,
): ExecutiveTimelineResult {
  const bh =
    input.businessHealth ?? runBusinessHealthEngine(input.ai);
  const eic = composeExecutiveIntelligenceCenter({
    ai: input.ai,
    decision: input.decision ?? null,
  });

  const raw = [
    ...eventsFromBusinessHealth(bh),
    ...eventsFromExecutiveAi(input.ai),
    ...eventsFromIntelligenceCenter(eic),
    ...eventsFromPredictive(input.predictive),
  ];

  const deduped = dedupeTimelineEvents(raw);
  const filtered = filterByCategory(deduped, input.categories ?? null);
  const sorted = sortTimelineEvents(filtered, input.sort ?? "recent");
  const events = sorted.slice(0, EXECUTIVE_TIMELINE_MAX_EVENTS);

  return {
    events,
    groups: groupTimelineEvents(events),
    total: events.length,
    generatedAt: input.ai.generatedAt || new Date().toISOString(),
    engineVersion: EXECUTIVE_TIMELINE_ENGINE_VERSION,
    tenantSlug: input.tenantSlug,
  };
}

export const ExecutiveTimelineEngine = {
  version: EXECUTIVE_TIMELINE_ENGINE_VERSION,
  run: runExecutiveTimeline,
} as const;
