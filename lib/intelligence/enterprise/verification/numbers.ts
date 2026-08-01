/**
 * Sprint 27.6.1 — Number Verification Layer.
 * Bloqueia afirmações numéricas divergentes das evidências.
 */

import type { EvidenceItem } from "../types.ts";

export type NumberClaim = {
  metric: string;
  value: number;
  toleranceAbs?: number;
  tolerancePct?: number;
};

export type NumberVerificationResult = {
  ok: boolean;
  divergences: Array<{
    metric: string;
    claimed: number;
    evidence: number | null;
    reason: string;
  }>;
};

function approxEqual(
  a: number,
  b: number,
  toleranceAbs = 0.01,
  tolerancePct = 0.001,
): boolean {
  if (Object.is(a, b)) return true;
  const abs = Math.abs(a - b);
  if (abs <= toleranceAbs) return true;
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return abs / base <= tolerancePct;
}

export function verifyNumericClaimsAgainstEvidence(
  claims: NumberClaim[],
  evidence: EvidenceItem[],
): NumberVerificationResult {
  const divergences: NumberVerificationResult["divergences"] = [];
  for (const claim of claims) {
    const matches = evidence.filter(
      (e) => e.metric === claim.metric && typeof e.value === "number",
    );
    if (matches.length === 0) {
      divergences.push({
        metric: claim.metric,
        claimed: claim.value,
        evidence: null,
        reason: "Sem evidência numérica canônica para a métrica.",
      });
      continue;
    }
    const values = matches.map((m) => m.value as number);
    const consistent = values.every((v) =>
      approxEqual(v, values[0]!, claim.toleranceAbs, claim.tolerancePct),
    );
    if (!consistent) {
      divergences.push({
        metric: claim.metric,
        claimed: claim.value,
        evidence: values[0] ?? null,
        reason: "Evidências internas divergentes entre si.",
      });
      continue;
    }
    const canonical = values[0]!;
    if (
      !approxEqual(
        claim.value,
        canonical,
        claim.toleranceAbs,
        claim.tolerancePct,
      )
    ) {
      divergences.push({
        metric: claim.metric,
        claimed: claim.value,
        evidence: canonical,
        reason: "Valor da resposta diverge da fonte canônica.",
      });
    }
  }
  return { ok: divergences.length === 0, divergences };
}

/** Extrai números com rótulos simples do texto (heurística determinística). */
export function extractSimpleMetricClaims(
  answer: string,
  evidence: EvidenceItem[],
): NumberClaim[] {
  const claims: NumberClaim[] = [];
  for (const e of evidence) {
    if (typeof e.value !== "number" || !e.metric) continue;
    const label = e.metric;
    // Se a resposta menciona o número da evidência, claim bate.
    const formatted = String(e.value);
    if (answer.includes(formatted) || answer.includes(e.value.toFixed(2))) {
      claims.push({ metric: label, value: e.value });
    }
  }
  return claims;
}

export function blockDivergentAnswer(input: {
  answer: string;
  evidence: EvidenceItem[];
  claims?: NumberClaim[];
}): { answer: string; blocked: boolean; limitations: string[] } {
  const claims =
    input.claims ?? extractSimpleMetricClaims(input.answer, input.evidence);
  if (claims.length === 0) {
    return { answer: input.answer, blocked: false, limitations: [] };
  }
  const result = verifyNumericClaimsAgainstEvidence(claims, input.evidence);
  if (result.ok) {
    return { answer: input.answer, blocked: false, limitations: [] };
  }
  const detail = result.divergences
    .map((d) => `${d.metric}: alegado ${d.claimed} vs evidência ${d.evidence}`)
    .join("; ");
  return {
    answer:
      "Dados divergentes entre a resposta e as fontes canônicas. Afirmação numérica bloqueada.",
    blocked: true,
    limitations: [
      "Validação cruzada bloqueou números inconsistentes.",
      detail,
    ],
  };
}
