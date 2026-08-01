/**
 * Fase 27 — Confidence Engine.
 */

import type {
  ConfidenceLevel,
  ConfidenceResult,
  EvidenceItem,
} from "../types.ts";

export function confidenceLevelFromScore(score: number | null): ConfidenceLevel {
  if (score == null || Number.isNaN(score)) return "indisponivel";
  if (score >= 0.75) return "alta";
  if (score >= 0.45) return "media";
  if (score > 0) return "baixa";
  return "indisponivel";
}

export function computeConfidence(input: {
  evidence: EvidenceItem[];
  missingSources?: string[];
  sampleSize?: number;
  consistency?: number;
}): ConfidenceResult {
  const evidence = input.evidence ?? [];
  const sourceCount = evidence.length;
  const missingSources = input.missingSources ?? [];
  const sampleSize = input.sampleSize ?? sourceCount;

  if (sourceCount === 0) {
    return {
      level: "indisponivel",
      score: null,
      coverage: 0,
      freshness: 0,
      consistency: input.consistency ?? 0,
      sampleSize,
      sourceCount: 0,
      missingSources,
      explanation: "Sem evidências canônicas — confiança indisponível.",
    };
  }

  const freshCount = evidence.filter((e) => e.freshness === "fresh").length;
  const freshness = freshCount / sourceCount;
  const reliable = evidence.filter(
    (e) => e.reliability === "alta" || e.reliability === "media",
  ).length;
  const coverageBase =
    missingSources.length === 0
      ? 1
      : Math.max(0, 1 - missingSources.length / (missingSources.length + sourceCount));
  const coverage = Math.min(1, coverageBase * (reliable / sourceCount || 0));
  const consistency = input.consistency ?? 0.8;
  const sampleFactor = Math.min(1, sampleSize / 5);
  const score = Number(
    (coverage * 0.4 + freshness * 0.3 + consistency * 0.2 + sampleFactor * 0.1).toFixed(3),
  );

  let level = confidenceLevelFromScore(score);
  if (evidence.some((e) => e.value == null) && level === "alta") {
    level = "media";
  }
  if (missingSources.length > 0 && level === "alta") {
    level = "media";
  }

  return {
    level,
    score,
    coverage: Number(coverage.toFixed(3)),
    freshness: Number(freshness.toFixed(3)),
    consistency,
    sampleSize,
    sourceCount,
    missingSources,
    explanation: `Cobertura ${Math.round(coverage * 100)}% · atualidade ${Math.round(freshness * 100)}% · ${sourceCount} fonte(s).`,
  };
}
