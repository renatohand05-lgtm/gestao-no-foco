/**
 * Sprint 22.6.2.1 — Contrato do repositório de conciliação bancária.
 */

import type {
  BankStatementLine,
  ReconciliationMatch,
  ReconciliationSession,
} from "./reconciliation-types.ts";

export type StatementLineRecord = BankStatementLine & {
  sessionId?: string | null;
  importRunId?: string | null;
  createdAt?: string;
  /** Derivado dos matches — não é coluna dedicada na migration. */
  derivedStatus?:
    | "pending"
    | "suggested"
    | "reconciled"
    | "divergent"
    | "unmatched"
    | "ignored";
};

export type CreateSessionInput = {
  tenantId: string;
  bankAccountId: string;
  userId: string;
  notes?: string | null;
};

export type InsertStatementLineInput = {
  tenantId: string;
  bankAccountId: string;
  date: string;
  amount: number;
  description: string;
  document?: string | null;
  counterparty?: string | null;
  externalId?: string | null;
  balanceAfter?: number | null;
  sessionId?: string | null;
  importRunId?: string | null;
  /** Cliente pode sugerir id (testes); Supabase gera uuid se omitido. */
  id?: string;
};

export type InsertMatchInput = {
  tenantId: string;
  sessionId: string;
  statementLineId: string;
  internalMovementId?: string | null;
  status: ReconciliationMatch["status"];
  confidence: number;
  decision?: ReconciliationMatch["decision"];
  justification?: string | null;
  criteria?: string[];
  id?: string;
};

export type DecideMatchInput = {
  tenantId: string;
  matchId: string;
  decision: "accepted" | "rejected" | "ignored";
  userId: string;
  justification?: string | null;
};

export type ListStatementLinesOptions = {
  bankAccountId?: string;
  importRunId?: string;
  sessionId?: string;
  limit?: number;
};

export type ReconciliationRepository = {
  createSession(input: CreateSessionInput): Promise<ReconciliationSession>;
  getSession(
    tenantId: string,
    sessionId: string,
  ): Promise<ReconciliationSession | null>;
  listSessions(tenantId: string, bankAccountId?: string): Promise<ReconciliationSession[]>;

  insertStatementLines(
    lines: InsertStatementLineInput[],
  ): Promise<StatementLineRecord[]>;
  listStatementLines(
    tenantId: string,
    options?: ListStatementLinesOptions,
  ): Promise<StatementLineRecord[]>;
  getStatementLine(
    tenantId: string,
    id: string,
  ): Promise<StatementLineRecord | null>;

  insertMatches(matches: InsertMatchInput[]): Promise<ReconciliationMatch[]>;
  listMatchesBySession(
    tenantId: string,
    sessionId: string,
  ): Promise<ReconciliationMatch[]>;
  getMatch(
    tenantId: string,
    matchId: string,
  ): Promise<ReconciliationMatch | null>;
  decideMatch(input: DecideMatchInput): Promise<ReconciliationMatch>;
  findAcceptedByStatementLine(
    tenantId: string,
    statementLineId: string,
  ): Promise<ReconciliationMatch | null>;
  findAcceptedByMovement(
    tenantId: string,
    movementId: string,
  ): Promise<ReconciliationMatch | null>;
  undoMatch(input: {
    tenantId: string;
    matchId: string;
    userId: string;
    justification: string;
  }): Promise<ReconciliationMatch>;
};
