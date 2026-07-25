/**
 * Executive Timeline — prioridade composta (Gate 20.5).
 */

import { clampImpact, confidenceRank, severityRank } from "./format.ts";
import type {
  ExecutiveTimelineConfidence,
  ExecutiveTimelineSeverity,
} from "./types.ts";

/**
 * Prioridade 0–100:
 * severidade (40%) + impacto (40%) + confiança (20%).
 */
export function computeTimelinePriority(
  severity: ExecutiveTimelineSeverity,
  impact: number,
  confidence: ExecutiveTimelineConfidence,
): number {
  const sev = (severityRank(severity) / 4) * 40;
  const imp = (clampImpact(impact) / 100) * 40;
  const conf = (confidenceRank(confidence) / 3) * 20;
  return Math.round(sev + imp + conf);
}
