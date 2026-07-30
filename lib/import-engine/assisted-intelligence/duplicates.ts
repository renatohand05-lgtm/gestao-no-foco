/**
 * Sprint 22.7 — Detecção de duplicidades (nunca exclui silenciosamente).
 */

import { stripDiacritics, normalizeText } from "../parsers/normalize.ts";
import { clampConfidence } from "./confidence.ts";
import type { DuplicateVerdict } from "./types.ts";

export type DuplicateCandidate = {
  tenantId: string;
  account?: string | null;
  date?: string | null;
  amount?: number | null;
  description?: string | null;
  document?: string | null;
  externalId?: string | null;
  counterparty?: string | null;
  hash?: string | null;
  importRunId?: string | null;
};

export type DuplicateAssessment = {
  verdict: DuplicateVerdict;
  confidence: number;
  signals: string[];
  reason: string;
  matchedAgainst?: DuplicateCandidate;
};

function normDesc(s: string | null | undefined): string {
  return stripDiacritics(normalizeText(s ?? "")).toLowerCase();
}

export function fingerprintCandidate(c: DuplicateCandidate): string {
  return [
    c.tenantId,
    c.account ?? "",
    c.date ?? "",
    c.amount != null ? String(c.amount) : "",
    normDesc(c.description).slice(0, 80),
    c.document ?? "",
    c.externalId ?? "",
    c.hash ?? "",
  ].join("|");
}

export function assessDuplicate(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate[],
): DuplicateAssessment {
  const sameTenant = existing.filter((e) => e.tenantId === candidate.tenantId);
  if (!sameTenant.length) {
    return {
      verdict: "not_duplicate",
      confidence: 0.95,
      signals: ["no_existing_same_tenant"],
      reason: "Nenhum registro existente no mesmo tenant para comparar.",
    };
  }

  // Exact by external id / hash
  for (const e of sameTenant) {
    if (candidate.externalId && e.externalId && candidate.externalId === e.externalId) {
      return {
        verdict: "exact_duplicate",
        confidence: 0.99,
        signals: ["external_id"],
        reason: "Mesmo identificador externo no tenant.",
        matchedAgainst: e,
      };
    }
    if (candidate.hash && e.hash && candidate.hash === e.hash) {
      return {
        verdict: "exact_duplicate",
        confidence: 0.99,
        signals: ["hash"],
        reason: "Mesmo hash de conteúdo no tenant.",
        matchedAgainst: e,
      };
    }
  }

  for (const e of sameTenant) {
    const signals: string[] = [];
    let score = 0;
    if (
      candidate.date &&
      e.date &&
      candidate.date === e.date &&
      candidate.amount != null &&
      e.amount != null &&
      Math.abs(candidate.amount - e.amount) < 0.005
    ) {
      score += 0.45;
      signals.push("date_amount");
    }
    if (candidate.account && e.account && candidate.account === e.account) {
      score += 0.15;
      signals.push("account");
    }
    const d1 = normDesc(candidate.description);
    const d2 = normDesc(e.description);
    if (d1 && d2 && d1 === d2) {
      score += 0.35;
      signals.push("description_exact");
    } else if (d1 && d2 && (d1.includes(d2.slice(0, 20)) || d2.includes(d1.slice(0, 20)))) {
      score += 0.2;
      signals.push("description_partial");
    }
    if (candidate.document && e.document && candidate.document === e.document) {
      score += 0.2;
      signals.push("document");
    }
    if (candidate.counterparty && e.counterparty && candidate.counterparty === e.counterparty) {
      score += 0.1;
      signals.push("counterparty");
    }

    const confidence = clampConfidence(score);
    if (confidence >= 0.9 && signals.includes("description_exact") && signals.includes("date_amount")) {
      return {
        verdict: "exact_duplicate",
        confidence,
        signals,
        reason: "Data, valor e descrição normalizada idênticos.",
        matchedAgainst: e,
      };
    }
    if (confidence >= 0.7) {
      return {
        verdict: "probable_duplicate",
        confidence,
        signals,
        reason: "Alta sobreposição de sinais (data/valor/descrição/conta).",
        matchedAgainst: e,
      };
    }
    if (confidence >= 0.45) {
      return {
        verdict: "possible_repeat",
        confidence,
        signals,
        reason: "Sobreposição parcial — exigir revisão humana.",
        matchedAgainst: e,
      };
    }
  }

  return {
    verdict: "not_duplicate",
    confidence: 0.8,
    signals: ["insufficient_overlap"],
    reason: "Sinais insuficientes para marcar duplicidade.",
  };
}
