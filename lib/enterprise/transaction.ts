/**
 * Sprint 21.6 — Estratégia de transação / unidade de trabalho (coordenada).
 *
 * Operações críticas reais usam RPC PostgreSQL (security invoker).
 * Este módulo coordena passos em memória/adapters e documenta rollback lógico
 * quando a atomicidade DB não está disponível no ambiente de teste.
 */

import { EnterpriseError, ENTERPRISE_ERROR_CODES } from "./errors.ts";
import type { TransactionResult, TransactionStepResult } from "./types.ts";

export type TransactionStep = {
  name: string;
  run: () => Promise<void> | void;
  compensate?: () => Promise<void> | void;
};

/**
 * Executa passos em ordem. Em falha, executa compensações em ordem inversa
 * (saga leve). Preferir RPC atómica em produção.
 */
export async function runCoordinatedTransaction<T>(
  steps: readonly TransactionStep[],
  finalize?: () => Promise<T> | T,
): Promise<TransactionResult<T>> {
  const done: TransactionStep[] = [];
  const results: TransactionStepResult[] = [];

  try {
    for (const step of steps) {
      await step.run();
      done.push(step);
      results.push({ name: step.name, ok: true });
    }
    const result = finalize ? await finalize() : (undefined as T);
    return { ok: true, result, steps: results, rolledBack: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na transação.";
    results.push({
      name: done.length < steps.length ? steps[done.length]!.name : "unknown",
      ok: false,
      error: message,
    });

    for (let i = done.length - 1; i >= 0; i -= 1) {
      const step = done[i]!;
      if (step.compensate) {
        try {
          await step.compensate();
        } catch {
          // compensação best-effort
        }
      }
    }

    return {
      ok: false,
      steps: results,
      rolledBack: true,
      error: message,
    };
  }
}

export function assertTransactionOk<T>(
  result: TransactionResult<T>,
): asserts result is TransactionResult<T> & { ok: true } {
  if (!result.ok) {
    throw new EnterpriseError(result.error ?? "Transação falhou.", {
      code: ENTERPRISE_ERROR_CODES.TRANSACTION,
    });
  }
}
