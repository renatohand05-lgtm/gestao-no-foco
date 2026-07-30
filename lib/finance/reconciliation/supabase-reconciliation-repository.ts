/**
 * Sprint 22.6.2.1 — Adapter Supabase da conciliação bancária.
 * Tabelas: bank_reconciliation_sessions, bank_statement_lines, bank_reconciliation_matches.
 * Sem fallback silencioso — erros propagam via throwIfError.
 */

import { mapKeysCamelToSnake, mapKeysSnakeToCamel } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
  type LooseQuery,
} from "../../enterprise/adapters/supabase-helpers.ts";
import { decideMatch as applyDecision } from "./reconciliation-matcher.ts";
import type {
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

function mapLine(row: Record<string, unknown>): StatementLineRecord {
  const camel = mapKeysSnakeToCamel<Record<string, unknown>>(row);
  return {
    id: String(camel.id),
    tenantId: String(camel.tenantId),
    bankAccountId: String(camel.bankAccountId),
    date: String(camel.movementDate ?? camel.date ?? "").slice(0, 10),
    amount: Number(camel.amount),
    description: String(camel.description ?? ""),
    document: (camel.documentRef as string | null) ?? null,
    counterparty: (camel.counterparty as string | null) ?? null,
    externalId: (camel.externalId as string | null) ?? null,
    balanceAfter:
      camel.balanceAfter == null ? null : Number(camel.balanceAfter),
    sessionId: (camel.sessionId as string | null) ?? null,
    importRunId: (camel.importRunId as string | null) ?? null,
    createdAt: camel.createdAt ? String(camel.createdAt) : undefined,
  };
}

function mapMatch(row: Record<string, unknown>): ReconciliationMatch {
  const camel = mapKeysSnakeToCamel<Record<string, unknown>>(row);
  return {
    id: String(camel.id),
    tenantId: String(camel.tenantId),
    sessionId: String(camel.sessionId),
    statementLineId: String(camel.statementLineId),
    internalId: (camel.internalMovementId as string | null) ?? null,
    status: camel.status as ReconciliationMatch["status"],
    confidence: Number(camel.confidence ?? 0),
    decision: (camel.decision as ReconciliationMatch["decision"]) ?? "pending",
    justification: (camel.justification as string | null) ?? null,
    decidedBy: (camel.decidedBy as string | null) ?? null,
    decidedAt: camel.decidedAt ? String(camel.decidedAt) : null,
    criteria: Array.isArray(camel.criteria)
      ? (camel.criteria as string[])
      : [],
  };
}

function mapSession(
  row: Record<string, unknown>,
  matches: ReconciliationMatch[],
): ReconciliationSession {
  const camel = mapKeysSnakeToCamel<Record<string, unknown>>(row);
  return {
    id: String(camel.id),
    tenantId: String(camel.tenantId),
    bankAccountId: String(camel.bankAccountId),
    createdAt: String(camel.createdAt),
    createdBy: String(camel.createdBy ?? ""),
    status: (camel.status as "open" | "closed") ?? "open",
    matches,
  };
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

export function createSupabaseReconciliationRepository(
  client: EnterpriseSupabaseClient,
): ReconciliationRepository {
  return {
    async createSession(input: CreateSessionInput) {
      const row = mapKeysCamelToSnake({
        tenantId: input.tenantId,
        bankAccountId: input.bankAccountId,
        status: "open",
        createdBy: input.userId,
        notes: input.notes ?? null,
      });
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_sessions",
      )
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "reconciliation.session.create");
      return mapSession(data, []);
    },

    async getSession(tenantId, sessionId) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_sessions",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", sessionId)
        .maybeSingle();
      throwIfError(error, "reconciliation.session.get");
      if (!data) return null;
      const matches = await this.listMatchesBySession(tenantId, sessionId);
      return mapSession(data, matches);
    },

    async listSessions(tenantId, bankAccountId) {
      let query: LooseQuery = enterpriseFrom(
        client,
        "bank_reconciliation_sessions",
      )
        .select("*")
        .eq("tenant_id", tenantId);
      if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);
      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      throwIfError(error, "reconciliation.session.list");
      const sessions: ReconciliationSession[] = [];
      for (const row of data ?? []) {
        const id = String(row.id);
        const matches = await this.listMatchesBySession(tenantId, id);
        sessions.push(mapSession(row, matches));
      }
      return sessions;
    },

    async insertStatementLines(inputs: InsertStatementLineInput[]) {
      if (!inputs.length) return [];
      const out: StatementLineRecord[] = [];

      for (const input of inputs) {
        if (input.externalId) {
          const { data: existing, error: findErr } = await enterpriseFrom(
            client,
            "bank_statement_lines",
          )
            .select("*")
            .eq("tenant_id", input.tenantId)
            .eq("bank_account_id", input.bankAccountId)
            .eq("external_id", input.externalId)
            .maybeSingle();
          throwIfError(findErr, "reconciliation.statement.findDuplicate");
          if (existing) {
            out.push(mapLine(existing));
            continue;
          }
        }

        const row: Record<string, unknown> = {
          tenant_id: input.tenantId,
          bank_account_id: input.bankAccountId,
          movement_date: input.date.slice(0, 10),
          amount: input.amount,
          description: input.description,
          document_ref: input.document ?? null,
          counterparty: input.counterparty ?? null,
          external_id: input.externalId ?? null,
          balance_after: input.balanceAfter ?? null,
          session_id: input.sessionId ?? null,
          import_run_id: input.importRunId ?? null,
        };
        if (input.id) row.id = input.id;

        const { data, error } = await enterpriseFrom(
          client,
          "bank_statement_lines",
        )
          .insert(row)
          .select("*")
          .single();
        throwIfError(error, "reconciliation.statement.insert");
        out.push(mapLine(data));
      }
      return out;
    },

    async listStatementLines(
      tenantId,
      options: ListStatementLinesOptions = {},
    ) {
      let query: LooseQuery = enterpriseFrom(client, "bank_statement_lines")
        .select("*")
        .eq("tenant_id", tenantId);
      if (options.bankAccountId) {
        query = query.eq("bank_account_id", options.bankAccountId);
      }
      if (options.importRunId) {
        query = query.eq("import_run_id", options.importRunId);
      }
      if (options.sessionId) {
        query = query.eq("session_id", options.sessionId);
      }
      const { data, error } = await query
        .order("movement_date", { ascending: false })
        .limit(options.limit ?? 500);
      throwIfError(error, "reconciliation.statement.list");

      const lineRows: StatementLineRecord[] = (data ?? []).map(
        (r: Record<string, unknown>) => mapLine(r),
      );
      if (!lineRows.length) return [];

      const ids = lineRows.map((l: StatementLineRecord) => l.id);
      const { data: matchRows, error: matchErr } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .in("statement_line_id", ids);
      throwIfError(matchErr, "reconciliation.statement.listMatches");
      const mappedMatches = (matchRows ?? []).map((r: Record<string, unknown>) =>
        mapMatch(r),
      );

      return lineRows.map((l) => ({
        ...l,
        derivedStatus: deriveStatus(mappedMatches, l.id),
      }));
    },

    async getStatementLine(tenantId, id) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_statement_lines",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "reconciliation.statement.get");
      if (!data) return null;
      const line = mapLine(data);
      const { data: matchRows, error: matchErr } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("statement_line_id", id);
      throwIfError(matchErr, "reconciliation.statement.getMatches");
      return {
        ...line,
        derivedStatus: deriveStatus(
          (matchRows ?? []).map((r: Record<string, unknown>) => mapMatch(r)),
          id,
        ),
      };
    },

    async insertMatches(inputs: InsertMatchInput[]) {
      if (!inputs.length) return [];
      const rows = inputs.map((input) => ({
        ...(input.id ? { id: input.id } : {}),
        tenant_id: input.tenantId,
        session_id: input.sessionId,
        statement_line_id: input.statementLineId,
        internal_movement_id: input.internalMovementId ?? null,
        status: input.status,
        confidence: input.confidence,
        decision: input.decision ?? "pending",
        justification: input.justification ?? null,
        criteria: input.criteria ?? [],
      }));
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .insert(rows)
        .select("*");
      throwIfError(error, "reconciliation.match.insert");
      return (data ?? []).map((r: Record<string, unknown>) => mapMatch(r));
    },

    async listMatchesBySession(tenantId, sessionId) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      throwIfError(error, "reconciliation.match.list");
      return (data ?? []).map((r: Record<string, unknown>) => mapMatch(r));
    },

    async getMatch(tenantId, matchId) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", matchId)
        .maybeSingle();
      throwIfError(error, "reconciliation.match.get");
      return data ? mapMatch(data) : null;
    },

    async decideMatch(input: DecideMatchInput) {
      const current = await this.getMatch(input.tenantId, input.matchId);
      if (!current) throw new Error("Match de conciliação não encontrado.");
      if (current.decision === "accepted") {
        throw new Error("Linha já conciliada — não é possível conciliar novamente.");
      }

      if (input.decision === "accepted") {
        if (current.internalId) {
          const existing = await this.findAcceptedByMovement(
            input.tenantId,
            current.internalId,
          );
          if (existing && existing.id !== current.id) {
            throw new Error(
              "Movimentação já vinculada a outra conciliação aceita.",
            );
          }
        }
        const lineAccepted = await this.findAcceptedByStatementLine(
          input.tenantId,
          current.statementLineId,
        );
        if (lineAccepted && lineAccepted.id !== current.id) {
          throw new Error("Linha de extrato já conciliada.");
        }
      }

      const updated = applyDecision(current, {
        decision: input.decision,
        userId: input.userId,
        justification: input.justification,
      });

      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .update({
          decision: updated.decision,
          status: updated.status,
          justification: updated.justification,
          decided_by: updated.decidedBy,
          decided_at: updated.decidedAt,
          confidence: updated.confidence,
        })
        .eq("tenant_id", input.tenantId)
        .eq("id", input.matchId)
        .select("*")
        .single();
      throwIfError(error, "reconciliation.match.decide");
      return mapMatch(data);
    },

    async findAcceptedByStatementLine(tenantId, statementLineId) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("statement_line_id", statementLineId)
        .eq("decision", "accepted")
        .maybeSingle();
      throwIfError(error, "reconciliation.match.findByLine");
      return data ? mapMatch(data) : null;
    },

    async findAcceptedByMovement(tenantId, movementId) {
      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("internal_movement_id", movementId)
        .eq("decision", "accepted")
        .maybeSingle();
      throwIfError(error, "reconciliation.match.findByMovement");
      return data ? mapMatch(data) : null;
    },

    async undoMatch(input) {
      if (!input.justification?.trim()) {
        throw new Error("Desfazer conciliação exige justificativa.");
      }
      const current = await this.getMatch(input.tenantId, input.matchId);
      if (!current) throw new Error("Match não encontrado.");

      const { data, error } = await enterpriseFrom(
        client,
        "bank_reconciliation_matches",
      )
        .update({
          decision: "rejected",
          status:
            current.status === "auto_matched"
              ? "awaiting_confirmation"
              : current.status,
          justification: input.justification,
          decided_by: input.userId,
          decided_at: new Date().toISOString(),
        })
        .eq("tenant_id", input.tenantId)
        .eq("id", input.matchId)
        .select("*")
        .single();
      throwIfError(error, "reconciliation.match.undo");
      return mapMatch(data);
    },
  };
}
