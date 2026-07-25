/**
 * Executive Timeline — formatação e helpers (Gate 20.5).
 */

import type {
  ExecutiveTimelineConfidence,
  ExecutiveTimelineSeverity,
} from "./types.ts";
import {
  EXECUTIVE_TIMELINE_CONFIDENCE_LABEL,
  EXECUTIVE_TIMELINE_SEVERITY_LABEL,
} from "./types.ts";

export function severityRank(s: ExecutiveTimelineSeverity): number {
  switch (s) {
    case "critical":
      return 4;
    case "attention":
      return 3;
    case "positive":
      return 2;
    default:
      return 1;
  }
}

export function confidenceRank(c: ExecutiveTimelineConfidence): number {
  if (c === "alta") return 3;
  if (c === "media") return 2;
  return 1;
}

export function confidenceFromCoverage(
  partial: boolean,
  hasEvidence: boolean,
): ExecutiveTimelineConfidence {
  if (!hasEvidence) return "baixa";
  if (partial) return "media";
  return "alta";
}

export function mapBhConfidence(
  c: "alta" | "media" | "baixa",
): ExecutiveTimelineConfidence {
  return c;
}

export function mapPredictiveConfidence(
  c: "alta" | "media" | "baixa",
): ExecutiveTimelineConfidence {
  return c;
}

export function labelSeverity(s: ExecutiveTimelineSeverity): string {
  return EXECUTIVE_TIMELINE_SEVERITY_LABEL[s];
}

export function labelConfidence(c: ExecutiveTimelineConfidence): string {
  return EXECUTIVE_TIMELINE_CONFIDENCE_LABEL[c];
}

export function clampImpact(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function formatTimelineTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
