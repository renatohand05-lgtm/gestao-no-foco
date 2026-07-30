/**
 * Sprint 22.6.2.1 — Store em memória (testes / fallback explícito).
 */

import type {
  BankStatementLine,
  ReconciliationMatch,
  ReconciliationSession,
} from "./reconciliation-types.ts";
import type {
  CreateSessionInput,
  DecideMatchInput,
  InsertMatchInput,
  InsertStatementLineInput,
  ListStatementLinesOptions,
  ReconciliationRepository,
  StatementLineRecord,
} from "./reconciliation-repository.ts";
import { decideMatch as applyDecision } from "./reconciliation-matcher.ts";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveStatus(
  matches: ReconciliationMatch[],
  lineId: string,
): StatementLineRecord["derivedStatus"] {
  const mine = matches.filter((m) => m.statementLineId === lineId);
  if (mine.some((m) => m.decision === "accepted")) return "reconciled";
  if (mine.some((m) => m.decision === "ignored" || m.status === "ignored")) {
    return "ignored";
  }
  if (mine.some((m) => m.status === "divergent")) return "divergent";
  if (
    mine.some(
      (m) =>
        m.status === "suggestion" ||
        m.status === "awaiting_confirmation" ||
        m.status === "auto_matched",
    )
  ) {
    return "suggested";
  }
  if (mine.some((m) => m.status === "unmatched")) return "unmatched";
  return "pending";
}

export function createMemoryReconciliationRepository(): ReconciliationRepository {
  const sessions = new Map<string, ReconciliationSession>();
  const lines = new Map<string, StatementLineRecord>();
  const matches = new Map<string, ReconciliationMatch>();

  function allMatches(): ReconciliationMatch[] {
    return [...matches.values()];
  }

  return {
    async createSession(input: CreateSessionInput) {
      const session: ReconciliationSession = {
        id: nid("recs"),
        tenantId: input.tenantId,
        bankAccountId: input.bankAccountId,
        createdAt: new Date().toISOString(),
        createdBy: input.userId,
        status: "open",
        matches: [],
      };
      sessions.set(session.id, session);
      return { ...session, matches: [] };
    },

    async getSession(tenantId, sessionId) {
      const s = sessions.get(sessionId);
      if (!s || s.tenantId !== tenantId) return null;
      const sessionMatches = allMatches().filter(
        (m) => m.sessionId === sessionId && m.tenantId === tenantId,
      );
      return { ...s, matches: sessionMatches };
    },

    async listSessions(tenantId, bankAccountId) {
      return [...sessions.values()]
        .filter(
          (s) =>
            s.tenantId === tenantId &&
            (!bankAccountId || s.bankAccountId === bankAccountId),
        )
        .map((s) => ({
          ...s,
          matches: allMatches().filter((m) => m.sessionId === s.id),
        }));
    },

    async insertStatementLines(inputs: InsertStatementLineInput[]) {
      const out: StatementLineRecord[] = [];
      for (const input of inputs) {
        if (input.externalId) {
          const dup = [...lines.values()].find(
            (l) =>
              l.tenantId === input.tenantId &&
              l.bankAccountId === input.bankAccountId &&
              l.externalId === input.externalId,
          );
          if (dup) {
            out.push(dup);
            continue;
          }
        }
        const row: StatementLineRecord = {
          id: input.id ?? nid("stmt"),
          tenantId: input.tenantId,
          bankAccountId: input.bankAccountId,
          date: input.date.slice(0, 10),
          amount: input.amount,
          description: input.description,
          document: input.document ?? null,
          counterparty: input.counterparty ?? null,
          externalId: input.externalId ?? null,
          balanceAfter: input.balanceAfter ?? null,
          sessionId: input.sessionId ?? null,
          importRunId: input.importRunId ?? null,
          createdAt: new Date().toISOString(),
          derivedStatus: "pending",
        };
        lines.set(row.id, row);
        out.push(row);
      }
      return out;
    },

    async listStatementLines(tenantId, options: ListStatementLinesOptions = {}) {
      const list = [...lines.values()].filter((l) => {
        if (l.tenantId !== tenantId) return false;
        if (options.bankAccountId && l.bankAccountId !== options.bankAccountId) {
          return false;
        }
        if (options.importRunId && l.importRunId !== options.importRunId) {
          return false;
        }
        if (options.sessionId && l.sessionId !== options.sessionId) {
          return false;
        }
        return true;
      });
      const limited = list.slice(0, options.limit ?? 500);
      return limited.map((l) => ({
        ...l,
        derivedStatus: deriveStatus(allMatches(), l.id),
      }));
    },

    async getStatementLine(tenantId, id) {
      const l = lines.get(id);
      if (!l || l.tenantId !== tenantId) return null;
      return { ...l, derivedStatus: deriveStatus(allMatches(), l.id) };
    },

    async insertMatches(inputs: InsertMatchInput[]) {
      const out: ReconciliationMatch[] = [];
      for (const input of inputs) {
        const row: ReconciliationMatch = {
          id: input.id ?? nid("match"),
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          statementLineId: input.statementLineId,
          internalId: input.internalMovementId ?? null,
          status: input.status,
          confidence: input.confidence,
          decision: input.decision ?? "pending",
          justification: input.justification ?? null,
          decidedBy: null,
          decidedAt: null,
          criteria: input.criteria ?? [],
        };
        matches.set(row.id, row);
        out.push(row);
      }
      return out;
    },

    async listMatchesBySession(tenantId, sessionId) {
      return allMatches().filter(
        (m) => m.tenantId === tenantId && m.sessionId === sessionId,
      );
    },

    async getMatch(tenantId, matchId) {
      const m = matches.get(matchId);
      if (!m || m.tenantId !== tenantId) return null;
      return m;
    },

    async decideMatch(input: DecideMatchInput) {
      const current = matches.get(input.matchId);
      if (!current || current.tenantId !== input.tenantId) {
        throw new Error("Match de conciliação não encontrado.");
      }
      if (current.decision === "accepted") {
        throw new Error("Linha já conciliada — não é possível conciliar novamente.");
      }
      if (input.decision === "accepted" && current.internalId) {
        const conflict = allMatches().find(
          (m) =>
            m.tenantId === input.tenantId &&
            m.id !== current.id &&
            m.decision === "accepted" &&
            m.internalId === current.internalId,
        );
        if (conflict) {
          throw new Error(
            "Movimentação já vinculada a outra conciliação aceita.",
          );
        }
        const lineConflict = allMatches().find(
          (m) =>
            m.tenantId === input.tenantId &&
            m.id !== current.id &&
            m.decision === "accepted" &&
            m.statementLineId === current.statementLineId,
        );
        if (lineConflict) {
          throw new Error("Linha de extrato já conciliada.");
        }
      }
      const updated = applyDecision(current, {
        decision: input.decision,
        userId: input.userId,
        justification: input.justification,
      });
      matches.set(updated.id, updated);
      return updated;
    },

    async findAcceptedByStatementLine(tenantId, statementLineId) {
      return (
        allMatches().find(
          (m) =>
            m.tenantId === tenantId &&
            m.statementLineId === statementLineId &&
            m.decision === "accepted",
        ) ?? null
      );
    },

    async findAcceptedByMovement(tenantId, movementId) {
      return (
        allMatches().find(
          (m) =>
            m.tenantId === tenantId &&
            m.internalId === movementId &&
            m.decision === "accepted",
        ) ?? null
      );
    },

    async undoMatch(input) {
      const current = matches.get(input.matchId);
      if (!current || current.tenantId !== input.tenantId) {
        throw new Error("Match não encontrado.");
      }
      if (!input.justification?.trim()) {
        throw new Error("Desfazer conciliação exige justificativa.");
      }
      const updated: ReconciliationMatch = {
        ...current,
        decision: "rejected",
        status:
          current.status === "auto_matched" ? "awaiting_confirmation" : current.status,
        justification: input.justification,
        decidedBy: input.userId,
        decidedAt: new Date().toISOString(),
      };
      matches.set(updated.id, updated);
      return updated;
    },
  };
}

/** @deprecated Prefer createMemoryReconciliationRepository — mantido para testes 22.6.2 */
export function createMemoryReconciliationStore() {
  const repo = createMemoryReconciliationRepository();
  const cache = new Map<string, ReconciliationSession>();
  return {
    get(tenantId: string, sessionId: string) {
      const s = cache.get(sessionId);
      if (!s || s.tenantId !== tenantId) return null;
      return s;
    },
    list(tenantId: string) {
      return [...cache.values()].filter((s) => s.tenantId === tenantId);
    },
    save(session: ReconciliationSession) {
      cache.set(session.id, session);
      return session;
    },
    /** Acesso ao repo real para novos testes. */
    repository: repo,
  };
}

export type ReconciliationStore = ReturnType<typeof createMemoryReconciliationStore>;

let globalMemoryRepo: ReconciliationRepository | null = null;

export function getGlobalMemoryReconciliationRepository(): ReconciliationRepository {
  if (!globalMemoryRepo) {
    globalMemoryRepo = createMemoryReconciliationRepository();
  }
  return globalMemoryRepo;
}

export function getGlobalReconciliationStore(): ReconciliationStore {
  return createMemoryReconciliationStore();
}

export type { BankStatementLine };
