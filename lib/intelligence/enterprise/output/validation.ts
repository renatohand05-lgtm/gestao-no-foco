/**
 * Fase 27 — Output validation / hallucination guard.
 */

import type { IntelligenceResponse } from "../types.ts";
import { getEvidenceByIds } from "../evidence/registry.ts";
import { scanImportedContent } from "../../../import-engine/assisted-intelligence/prompt-injection.ts";

export type OutputValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateIntelligenceOutput(
  response: IntelligenceResponse,
  expectedTenantId: string,
): OutputValidationResult {
  const errors: string[] = [];

  if (response.tenantId !== expectedTenantId) {
    errors.push("tenant_mismatch");
  }
  if (!response.mode) errors.push("missing_mode");
  if (!response.provider?.id) errors.push("missing_provider");
  if (!response.confidence) errors.push("missing_confidence");

  for (const rec of response.recommendations) {
    if (!rec.sourceEvidenceIds?.length) {
      errors.push(`recommendation_without_evidence:${rec.id}`);
    } else {
      const found = getEvidenceByIds(rec.sourceEvidenceIds);
      if (found.length === 0) {
        errors.push(`recommendation_evidence_missing:${rec.id}`);
      }
    }
  }

  // Bloquear afirmações numéricas inventadas sem evidência no texto + lista vazia
  const moneyClaims = /R\$\s*[\d.]+/g.test(response.answer);
  if (moneyClaims && response.evidence.length === 0) {
    errors.push("numeric_claim_without_evidence");
  }

  const scan = scanImportedContent(response.answer);
  if (!scan.safe) {
    errors.push(`unsafe_content:${scan.signals.join(",")}`);
  }

  if (
    response.mode === "provider_assisted" &&
    response.provider.isExternal === false
  ) {
    errors.push("mode_provider_mismatch");
  }

  return { ok: errors.length === 0, errors };
}

export function safeBlockedResponse(
  base: IntelligenceResponse,
  errors: string[],
): IntelligenceResponse {
  return {
    ...base,
    status: "error",
    answer:
      "Resposta bloqueada pela validação de saída. Nenhuma afirmação insegura foi exibida.",
    summary: "output_validation_blocked",
    recommendations: [],
    actions: [],
    limitations: [
      ...base.limitations,
      `Validação falhou: ${errors.join("; ")}`,
    ],
    evidence: base.evidence,
    confidence: {
      ...base.confidence,
      level: "indisponivel",
      score: null,
      explanation: "Saída bloqueada por guardrails.",
    },
  };
}
