/**
 * Sprint 22.2 — Alertas financeiros determinísticos.
 */

import type { BankAccount, CashMovement } from "../shared/types.ts";
import { moneyBRL } from "./treasury-validator.ts";
import type { TreasuryAlert } from "./treasury-types.ts";

export type TreasuryAlertsConfig = {
  lowBalanceThreshold?: number;
  tenantSlug?: string;
};

export function createTreasuryAlertsService(
  config: TreasuryAlertsConfig = {},
) {
  const low = config.lowBalanceThreshold ?? 500;
  const slug = config.tenantSlug ?? "";

  return {
    build(input: {
      accounts: BankAccount[];
      movements: CashMovement[];
      consolidatedBalance: number;
      previousNet?: number;
      currentNet?: number;
    }): TreasuryAlert[] {
      const now = new Date().toISOString();
      const alerts: TreasuryAlert[] = [];
      const hrefBase = slug ? `/${slug}/financeiro` : null;

      if (input.consolidatedBalance < 0) {
        alerts.push({
          id: "neg-balance",
          severity: "critical",
          title: "Saldo consolidado negativo",
          description: `Caixa em ${moneyBRL(input.consolidatedBalance)}.`,
          entityType: "treasury",
          entityId: null,
          createdAt: now,
          recommendedAction: "Revisar saídas e reforçar entradas imediatas.",
          href: hrefBase,
        });
      }

      for (const a of input.accounts.filter((x) => x.status === "active")) {
        if (a.currentBalance < 0) {
          alerts.push({
            id: `neg-${a.id}`,
            severity: "critical",
            title: "Saldo negativo em conta",
            description: `${a.name}: ${moneyBRL(a.currentBalance)}.`,
            entityType: "bank_account",
            entityId: a.id,
            createdAt: now,
            recommendedAction: "Transferir reserva ou suspender débitos.",
            href: hrefBase ? `${hrefBase}/contas` : null,
          });
        } else if (a.currentBalance < low) {
          alerts.push({
            id: `low-${a.id}`,
            severity: "warning",
            title: "Saldo abaixo do limite",
            description: `${a.name} abaixo de ${moneyBRL(low)} (${moneyBRL(a.currentBalance)}).`,
            entityType: "bank_account",
            entityId: a.id,
            createdAt: now,
            recommendedAction: "Planejar reforço de caixa nesta conta.",
            href: hrefBase ? `${hrefBase}/contas` : null,
          });
        }

        const moved = input.movements.some((m) => m.bankAccountId === a.id);
        if (!moved) {
          alerts.push({
            id: `idle-${a.id}`,
            severity: "info",
            title: "Conta sem movimentação",
            description: `${a.name} não teve lançamentos no período filtrado.`,
            entityType: "bank_account",
            entityId: a.id,
            createdAt: now,
            recommendedAction: "Confirmar se a conta está em uso.",
            href: hrefBase ? `${hrefBase}/movimentacoes` : null,
          });
        }
      }

      const expenses = input.movements.filter((m) => m.kind === "saida");
      if (expenses.length >= 3) {
        const avg =
          expenses.reduce((s, m) => s + m.amount, 0) / expenses.length;
        const spike = expenses.find((m) => m.amount > avg * 2);
        if (spike) {
          alerts.push({
            id: `spike-${spike.id}`,
            severity: "warning",
            title: "Despesa acima da média",
            description: `${spike.description}: ${moneyBRL(spike.amount)} (média ${moneyBRL(avg)}).`,
            entityType: "cash_movement",
            entityId: spike.id,
            createdAt: now,
            recommendedAction: "Validar categoria e centro de custo.",
            href: hrefBase ? `${hrefBase}/movimentacoes` : null,
          });
        }
      }

      if (
        typeof input.previousNet === "number" &&
        typeof input.currentNet === "number" &&
        input.previousNet > 0 &&
        input.currentNet < input.previousNet * 0.6
      ) {
        alerts.push({
          id: "cash-drop",
          severity: "warning",
          title: "Queda acentuada de caixa (líquido)",
          description: `Líquido caiu de ${moneyBRL(input.previousNet)} para ${moneyBRL(input.currentNet)}.`,
          entityType: "treasury",
          entityId: null,
          createdAt: now,
          recommendedAction: "Comparar períodos e revisar saídas extraordinárias.",
          href: hrefBase,
        });
      }

      // Divergência memória: soma saldos vs consolidado (defesa)
      const sum = input.accounts
        .filter((a) => a.status === "active")
        .reduce((s, a) => s + a.currentBalance, 0);
      if (Math.abs(sum - input.consolidatedBalance) > 0.01) {
        alerts.push({
          id: "balance-divergence",
          severity: "critical",
          title: "Divergência de saldo",
          description: `Soma das contas (${moneyBRL(sum)}) ≠ consolidado (${moneyBRL(input.consolidatedBalance)}).`,
          entityType: "treasury",
          entityId: null,
          createdAt: now,
          recommendedAction: "Recarregar posição e revisar lançamentos recentes.",
          href: hrefBase,
        });
      }

      return alerts.slice(0, 12);
    },
  };
}

export type TreasuryAlertsService = ReturnType<
  typeof createTreasuryAlertsService
>;
