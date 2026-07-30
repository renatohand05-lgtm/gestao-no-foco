/**
 * Sprint 22.6.2.1 — Serviço de conciliação (async) sobre ReconciliationRepository.
 */

import { decideMatch, matchStatementLines } from "./reconciliation-matcher.ts";
import type {
  InternalCandidate,
  ReconciliationMatch,
  ReconciliationSession,
} from "./reconciliation-types.ts";
import type {
  ReconciliationRepository,
  StatementLineRecord,
} from "./reconciliation-repository.ts";
import {
  createMemoryReconciliationRepository,
  createMemoryReconciliationStore,
  getGlobalMemoryReconciliationRepository,
  getGlobalReconciliationStore,
  type ReconciliationStore,
} from "./memory-reconciliation-repository.ts";

export {
  createMemoryReconciliationRepository,
  createMemoryReconciliationStore,
  getGlobalMemoryReconciliationRepository,
  getGlobalReconciliationStore,
  type ReconciliationStore,
};

export function createReconciliationService(repo: ReconciliationRepository) {
  return {
    async openSession(input: {
      tenantId: string;
      bankAccountId: string;
      userId: string;
      statements?: StatementLineRecord[];
      candidates: InternalCandidate[];
      dayMargin?: number;
      /** Quando true (default) e sem statements, carrega pendentes do store. */
      loadPendingFromStore?: boolean;
      notes?: string | null;
    }): Promise<ReconciliationSession> {
      const session = await repo.createSession({
        tenantId: input.tenantId,
        bankAccountId: input.bankAccountId,
        userId: input.userId,
        notes: input.notes,
      });

      let statements: StatementLineRecord[] = (input.statements ?? []).filter(
        (s) =>
          s.tenantId === input.tenantId &&
          s.bankAccountId === input.bankAccountId,
      );

      if (
        (input.loadPendingFromStore ?? true) &&
        statements.length === 0
      ) {
        const stored = await repo.listStatementLines(input.tenantId, {
          bankAccountId: input.bankAccountId,
          limit: 500,
        });
        statements = stored.filter(
          (l) =>
            l.derivedStatus !== "reconciled" && l.derivedStatus !== "ignored",
        );
      }

      if (input.statements && input.statements.length > 0) {
        statements = await repo.insertStatementLines(
          input.statements.map((s) => ({
            id: s.id?.startsWith("stmt-") || s.id?.length < 30 ? undefined : s.id,
            tenantId: s.tenantId,
            bankAccountId: s.bankAccountId,
            date: s.date,
            amount: s.amount,
            description: s.description,
            document: s.document,
            counterparty: s.counterparty,
            externalId: s.externalId,
            balanceAfter: s.balanceAfter,
            sessionId: session.id,
            importRunId: s.importRunId,
          })),
        );
      }

      const candidates = input.candidates.filter(
        (c) =>
          c.tenantId === input.tenantId &&
          c.bankAccountId === input.bankAccountId,
      );

      const drafted = matchStatementLines({
        tenantId: input.tenantId,
        sessionId: session.id,
        statements,
        candidates,
        config: { dayMargin: input.dayMargin },
      });

      const matches = await repo.insertMatches(
        drafted.map((m) => ({
          tenantId: m.tenantId,
          sessionId: session.id,
          statementLineId: m.statementLineId,
          internalMovementId: m.internalId,
          status: m.status,
          confidence: m.confidence,
          decision: "pending",
          criteria: m.criteria,
        })),
      );

      return { ...session, matches };
    },

    async decide(input: {
      tenantId: string;
      sessionId: string;
      matchId: string;
      decision: "accepted" | "rejected" | "ignored";
      userId: string;
      justification?: string | null;
    }): Promise<ReconciliationMatch> {
      const session = await repo.getSession(input.tenantId, input.sessionId);
      if (!session) throw new Error("Sessão de conciliação não encontrada.");
      if (!session.matches.some((m) => m.id === input.matchId)) {
        throw new Error("Match não encontrado.");
      }
      return repo.decideMatch({
        tenantId: input.tenantId,
        matchId: input.matchId,
        decision: input.decision,
        userId: input.userId,
        justification: input.justification,
      });
    },

    async getSession(tenantId: string, sessionId: string) {
      return repo.getSession(tenantId, sessionId);
    },

    async listStatementLines(
      tenantId: string,
      options?: { bankAccountId?: string; importRunId?: string },
    ) {
      return repo.listStatementLines(tenantId, options);
    },

    async undo(input: {
      tenantId: string;
      matchId: string;
      userId: string;
      justification: string;
    }) {
      return repo.undoMatch(input);
    },

    repository: repo,
  };
}

/** Helper de testes síncronos sobre o matcher puro (sem I/O). */
export function draftMatchesForTest(input: {
  tenantId: string;
  sessionId: string;
  statements: StatementLineRecord[];
  candidates: InternalCandidate[];
}) {
  return matchStatementLines(input);
}

export { decideMatch };
