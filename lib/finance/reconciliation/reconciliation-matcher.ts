/**
 * Sprint 22.6.2 — Matcher de conciliação (nunca auto-confirma baixa confiança).
 */

import type {
  BankStatementLine,
  InternalCandidate,
  ReconciliationMatch,
  ReconciliationMatcherConfig,
  ReconciliationMatchStatus,
} from "./reconciliation-types.ts";

const DEFAULT_CONFIG: ReconciliationMatcherConfig = {
  dayMargin: 3,
  minAutoConfidence: 0.92,
  minSuggestConfidence: 0.55,
};

function daysApart(a: string, b: string): number {
  const da = new Date(`${a.slice(0, 10)}T12:00:00Z`).getTime();
  const db = new Date(`${b.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.abs(Math.round((da - db) / 86_400_000));
}

function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function scorePair(
  stmt: BankStatementLine,
  cand: InternalCandidate,
  config: ReconciliationMatcherConfig,
): { confidence: number; criteria: string[]; status: ReconciliationMatchStatus } {
  if (stmt.tenantId !== cand.tenantId) {
    return { confidence: 0, criteria: ["tenant_mismatch"], status: "unmatched" };
  }
  if (stmt.bankAccountId !== cand.bankAccountId) {
    return { confidence: 0, criteria: ["account_mismatch"], status: "unmatched" };
  }

  const criteria: string[] = [];
  let score = 0;

  const amountOk = Math.abs(Math.abs(stmt.amount) - Math.abs(cand.amount)) < 0.009;
  if (amountOk) {
    score += 0.45;
    criteria.push("valor");
  } else if (
    Math.abs(Math.abs(stmt.amount) - Math.abs(cand.amount)) /
      Math.max(Math.abs(stmt.amount), 1) <
    0.02
  ) {
    score += 0.2;
    criteria.push("valor_aproximado");
  }

  const dayDiff = daysApart(stmt.date, cand.date);
  if (dayDiff === 0) {
    score += 0.25;
    criteria.push("data");
  } else if (dayDiff <= config.dayMargin) {
    score += 0.12;
    criteria.push("data_margem");
  }

  if (stmt.externalId && cand.externalId && stmt.externalId === cand.externalId) {
    score += 0.25;
    criteria.push("identificador_externo");
  }

  if (stmt.document && cand.document && norm(stmt.document) === norm(cand.document)) {
    score += 0.1;
    criteria.push("documento");
  }

  if (
    stmt.counterparty &&
    cand.counterparty &&
    norm(stmt.counterparty) === norm(cand.counterparty)
  ) {
    score += 0.08;
    criteria.push("contraparte");
  }

  const d1 = norm(stmt.description);
  const d2 = norm(cand.description);
  if (d1 && d2 && (d1.includes(d2) || d2.includes(d1))) {
    score += 0.1;
    criteria.push("descricao");
  }

  criteria.push("conta_bancaria");

  const confidence = Math.min(1, Math.round(score * 100) / 100);

  if (!amountOk && confidence < config.minSuggestConfidence) {
    return { confidence, criteria, status: "divergent" };
  }
  if (confidence >= config.minAutoConfidence && amountOk && dayDiff <= 1) {
    return { confidence, criteria, status: "auto_matched" };
  }
  if (confidence >= config.minSuggestConfidence) {
    return { confidence, criteria, status: "suggestion" };
  }
  if (amountOk) {
    return { confidence, criteria, status: "awaiting_confirmation" };
  }
  return { confidence, criteria, status: "unmatched" };
}

export function matchStatementLines(input: {
  tenantId: string;
  sessionId: string;
  statements: BankStatementLine[];
  candidates: InternalCandidate[];
  config?: Partial<ReconciliationMatcherConfig>;
}): ReconciliationMatch[] {
  const config = { ...DEFAULT_CONFIG, ...input.config };
  const used = new Set<string>();
  const matches: ReconciliationMatch[] = [];

  for (const stmt of input.statements) {
    if (stmt.tenantId !== input.tenantId) continue;
    let best: {
      cand: InternalCandidate;
      confidence: number;
      criteria: string[];
      status: ReconciliationMatchStatus;
    } | null = null;

    for (const cand of input.candidates) {
      if (used.has(cand.id)) continue;
      const scored = scorePair(stmt, cand, config);
      if (!best || scored.confidence > best.confidence) {
        best = { cand, ...scored };
      }
    }

    if (!best || best.status === "unmatched" || best.confidence <= 0) {
      matches.push({
        id: `m_${stmt.id}_none`,
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        statementLineId: stmt.id,
        internalId: null,
        status: "unmatched",
        confidence: 0,
        decision: "pending",
        justification: null,
        decidedBy: null,
        decidedAt: null,
        criteria: [],
      });
      continue;
    }

    // Nunca conciliar silenciosamente — decisão sempre pending até confirmação humana
    if (best.status !== "divergent") {
      used.add(best.cand.id);
    }

    matches.push({
      id: `m_${stmt.id}_${best.cand.id}`,
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      statementLineId: stmt.id,
      internalId: best.cand.id,
      status: best.status,
      confidence: best.confidence,
      decision: "pending",
      justification: null,
      decidedBy: null,
      decidedAt: null,
      criteria: best.criteria,
    });
  }

  return matches;
}

/**
 * Aceitar match — exige confiança adequada ou justificativa.
 * Nunca aceita silenciosamente baixa confiança sem justification.
 */
export function decideMatch(
  match: ReconciliationMatch,
  input: {
    decision: "accepted" | "rejected" | "ignored";
    userId: string;
    justification?: string | null;
    minAcceptConfidence?: number;
  },
): ReconciliationMatch {
  const min = input.minAcceptConfidence ?? 0.75;
  if (input.decision === "accepted" && match.confidence < min) {
    if (!input.justification || input.justification.trim().length < 3) {
      throw new Error(
        "Conciliação de baixa confiança exige justificativa explícita — nunca silenciosa.",
      );
    }
  }
  return {
    ...match,
    decision: input.decision,
    status:
      input.decision === "ignored"
        ? "ignored"
        : input.decision === "accepted"
          ? match.status === "suggestion" || match.status === "awaiting_confirmation"
            ? "auto_matched"
            : match.status
          : match.status,
    justification: input.justification ?? null,
    decidedBy: input.userId,
    decidedAt: new Date().toISOString(),
  };
}
