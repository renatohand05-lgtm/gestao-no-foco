/**
 * Sprint 22.6.2.1 — Persiste linhas de extrato a partir do resultado do import financeiro.
 * Não altera a Import Engine — apenas grava no módulo bancário após o commit.
 */

import type { EnterpriseSupabaseClient } from "../../enterprise/adapters/supabase-helpers.ts";
import { createSupabaseReconciliationRepository } from "./supabase-reconciliation-repository.ts";
import type { ReconciliationRepository } from "./reconciliation-repository.ts";
import type { InsertStatementLineInput } from "./reconciliation-repository.ts";

export type ImportStatementRowInput = {
  rowNumber: number;
  date: string;
  amount: number;
  description: string;
  document?: string | null;
  counterparty?: string | null;
  externalId?: string | null;
  balanceAfter?: number | null;
  /** Movimento criado a partir da linha (rastreabilidade). */
  movementId?: string | null;
};

/**
 * Grava bank_statement_lines vinculadas ao import_run.
 * Duplicidade por external_id é tratada no repositório (retorna existente).
 * Erros de persistência propagam — sem fallback silencioso.
 */
export async function persistStatementLinesFromFinanceImport(input: {
  repository: ReconciliationRepository;
  tenantId: string;
  bankAccountId: string;
  importRunId: string;
  rows: ImportStatementRowInput[];
}): Promise<{ lines: Awaited<ReturnType<ReconciliationRepository["insertStatementLines"]>> }> {
  const payload: InsertStatementLineInput[] = input.rows.map((row) => ({
    tenantId: input.tenantId,
    bankAccountId: input.bankAccountId,
    date: row.date.slice(0, 10),
    amount: row.amount,
    description: row.description,
    document: row.document ?? null,
    counterparty: row.counterparty ?? null,
    externalId:
      row.externalId?.trim() ||
      `import:${input.importRunId}:row:${row.rowNumber}`,
    balanceAfter: row.balanceAfter ?? null,
    importRunId: input.importRunId,
  }));

  const lines = await input.repository.insertStatementLines(payload);
  return { lines };
}

export function createStatementPersistenceFromClient(
  client: EnterpriseSupabaseClient,
) {
  return createSupabaseReconciliationRepository(client);
}
