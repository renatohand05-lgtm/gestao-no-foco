/**
 * Sprint 22.6.2 — Saldo consolidado / disponível / comprometido.
 * Transferências internas não entram no consolidado (já no saldo das contas).
 */

import type { BankAccount } from "../shared/types.ts";
import type { ConsolidatedBalance, OpenTitleSnapshot } from "./types.ts";
import { roundMoney, todayUtc } from "./date-utils.ts";

export function computeConsolidatedBalance(input: {
  tenantId: string;
  accounts: BankAccount[];
  /** Compromissos (AP abertas) usados como saldo comprometido. */
  openPayables?: OpenTitleSnapshot[];
  asOf?: string;
}): ConsolidatedBalance {
  const active = input.accounts.filter(
    (a) => a.tenantId === input.tenantId && a.status === "active",
  );
  const consolidated = roundMoney(
    active.reduce((s, a) => s + a.currentBalance, 0),
  );
  const payables = (input.openPayables ?? []).filter(
    (t) =>
      t.tenantId === input.tenantId &&
      t.kind === "payable" &&
      !t.linkedMovementId &&
      t.amountPending > 0,
  );
  const committed = roundMoney(
    payables.reduce((s, t) => s + t.amountPending, 0),
  );
  const available = roundMoney(Math.max(0, consolidated - committed));

  return {
    tenantId: input.tenantId,
    asOf: input.asOf ?? todayUtc(),
    consolidated,
    available,
    committed,
    activeAccounts: active.length,
    accounts: active.map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.currentBalance,
      status: a.status,
    })),
    methodology:
      "Consolidado = soma dos saldos de contas ativas do tenant. Comprometido = AP abertas sem movimentação vinculada. Disponível = max(0, consolidado − comprometido). Transferências entre contas do mesmo tenant já estão refletidas nos saldos e têm impacto líquido zero no consolidado.",
  };
}

/** Impacto líquido de um par de transferência no consolidado (deve ser 0). */
export function transferConsolidatedNetImpact(
  outAmount: number,
  inAmount: number,
): number {
  return roundMoney(-Math.abs(outAmount) + Math.abs(inAmount));
}
