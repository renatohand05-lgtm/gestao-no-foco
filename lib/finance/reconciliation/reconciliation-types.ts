/**
 * Sprint 22.6.2 — Conciliação bancária · tipos.
 */

export type ReconciliationMatchStatus =
  | "auto_matched"
  | "suggestion"
  | "awaiting_confirmation"
  | "divergent"
  | "unmatched"
  | "ignored";

export type BankStatementLine = {
  id: string;
  tenantId: string;
  bankAccountId: string;
  date: string;
  amount: number;
  description: string;
  document: string | null;
  counterparty: string | null;
  externalId: string | null;
  balanceAfter: number | null;
  sessionId?: string | null;
  importRunId?: string | null;
};

export type InternalCandidate = {
  id: string;
  tenantId: string;
  bankAccountId: string;
  date: string;
  amount: number;
  description: string;
  document: string | null;
  counterparty: string | null;
  externalId: string | null;
  source:
    | "movement"
    | "payable_settlement"
    | "receivable_settlement"
    | "transfer";
};

export type ReconciliationMatch = {
  id: string;
  tenantId: string;
  sessionId: string;
  statementLineId: string;
  internalId: string | null;
  status: ReconciliationMatchStatus;
  confidence: number;
  decision: "pending" | "accepted" | "rejected" | "ignored";
  justification: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  criteria: string[];
};

export type ReconciliationSession = {
  id: string;
  tenantId: string;
  bankAccountId: string;
  createdAt: string;
  createdBy: string;
  status: "open" | "closed";
  matches: ReconciliationMatch[];
};

export type ReconciliationMatcherConfig = {
  dayMargin: number;
  minAutoConfidence: number;
  minSuggestConfidence: number;
};
