/**
 * Sprint 22.1 — CashFlowService + FinancialSummaryService.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { BankAccountRepository } from "../bank/bank-account-repository.ts";
import { assertFinancePermission } from "../shared/rbac.ts";
import type { CashFlow, CashFlowPoint, FinancialSummary } from "../shared/types.ts";
import type { CashMovementRepository } from "./cash-movement-repository.ts";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function createCashFlowService(deps: {
  movements: CashMovementRepository;
  accounts: BankAccountRepository;
}) {
  return {
    async listCashFlow(
      context: EnterpriseContext,
      opts: { from?: string; to?: string; accountId?: string } = {},
    ): Promise<CashFlow> {
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_fluxo_caixa",
      ]);
      const to = opts.to ?? todayIso();
      const from =
        opts.from ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

      const [accounts, movements] = await Promise.all([
        deps.accounts.list(context.tenantId),
        deps.movements.list(context.tenantId, {
          from,
          to,
          accountId: opts.accountId,
          limit: 500,
        }),
      ]);

      const active = accounts.filter((a) => a.status === "active");
      const openingBalance = opts.accountId
        ? (active.find((a) => a.id === opts.accountId)?.currentBalance ?? 0)
        : active.reduce((s, a) => s + a.currentBalance, 0);

      const byDay = new Map<string, CashFlowPoint>();
      let totalInflows = 0;
      let totalOutflows = 0;

      for (const m of [...movements].reverse()) {
        const point = byDay.get(m.movementDate) ?? {
          date: m.movementDate,
          inflows: 0,
          outflows: 0,
          net: 0,
          balance: 0,
        };
        if (m.kind === "entrada" || (m.kind === "transferencia" && m.counterpartyAccountId)) {
          // entrada explícita; transferência: conta destino conta como entrada no filtro da conta
          if (m.kind === "entrada") {
            point.inflows += m.amount;
            totalInflows += m.amount;
          } else if (
            m.kind === "transferencia" &&
            opts.accountId &&
            m.bankAccountId === opts.accountId &&
            m.balanceAfter != null
          ) {
            // lado da conta filtrada: inferir pelo saldo após vs valor é frágil — usar papel via counterparty
          }
        }
        if (m.kind === "entrada") {
          /* already counted */
        } else if (m.kind === "saida" || m.kind === "estorno") {
          point.outflows += m.amount;
          totalOutflows += m.amount;
        } else if (m.kind === "transferencia") {
          // na visão consolidada, transferências internas não alteram total
          if (opts.accountId) {
            if (m.bankAccountId === opts.accountId) {
              point.outflows += m.amount;
              totalOutflows += m.amount;
            }
          }
        } else if (m.kind === "ajuste") {
          point.inflows += m.amount;
          totalInflows += m.amount;
        }
        point.net = point.inflows - point.outflows;
        byDay.set(m.movementDate, point);
      }

      // recálculo limpo
      totalInflows = 0;
      totalOutflows = 0;
      byDay.clear();
      for (const m of movements) {
        const point = byDay.get(m.movementDate) ?? {
          date: m.movementDate,
          inflows: 0,
          outflows: 0,
          net: 0,
          balance: 0,
        };
        const isIn =
          m.kind === "entrada" ||
          (m.kind === "ajuste" && m.amount > 0) ||
          (m.kind === "transferencia" &&
            !!opts.accountId &&
            m.bankAccountId === opts.accountId &&
            false);
        // Transfer in: when this account received (counterparty is source) — our map stores out leg on source
        const isTransferIn =
          m.kind === "transferencia" &&
          opts.accountId &&
          m.counterpartyAccountId === opts.accountId;
        const isTransferOut =
          m.kind === "transferencia" &&
          opts.accountId &&
          m.bankAccountId === opts.accountId;
        const isOut =
          m.kind === "saida" ||
          m.kind === "estorno" ||
          isTransferOut ||
          (m.kind === "ajuste" && m.amount < 0);

        if (m.kind === "entrada" || isTransferIn) {
          point.inflows += m.amount;
          totalInflows += m.amount;
        } else if (isOut) {
          point.outflows += Math.abs(m.amount);
          totalOutflows += Math.abs(m.amount);
        } else if (m.kind === "ajuste") {
          point.inflows += m.amount;
          totalInflows += m.amount;
        } else if (m.kind === "transferencia" && !opts.accountId) {
          // consolidado: ignora
        } else if (isIn) {
          point.inflows += m.amount;
          totalInflows += m.amount;
        }
        point.net = point.inflows - point.outflows;
        byDay.set(m.movementDate, point);
      }

      const points = [...byDay.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      let running = openingBalance - (totalInflows - totalOutflows);
      for (const p of points) {
        running += p.net;
        p.balance = running;
      }

      const closingBalance = active.reduce((s, a) => s + a.currentBalance, 0);

      return {
        tenantId: context.tenantId,
        from,
        to,
        openingBalance: closingBalance - (totalInflows - totalOutflows),
        closingBalance: opts.accountId
          ? (active.find((a) => a.id === opts.accountId)?.currentBalance ?? 0)
          : closingBalance,
        totalInflows,
        totalOutflows,
        points,
        movements,
      };
    },
  };
}

export function createFinancialSummaryService(deps: {
  movements: CashMovementRepository;
  accounts: BankAccountRepository;
}) {
  return {
    async getFinancialSummary(
      context: EnterpriseContext,
    ): Promise<FinancialSummary> {
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_saldos",
      ]);
      const today = todayIso();
      const monthStart = monthStartIso();
      const [accounts, todayMoves, monthMoves] = await Promise.all([
        deps.accounts.list(context.tenantId),
        deps.movements.list(context.tenantId, { from: today, to: today }),
        deps.movements.list(context.tenantId, { from: monthStart, to: today }),
      ]);

      const currentBalance = accounts
        .filter((a) => a.status === "active")
        .reduce((s, a) => s + a.currentBalance, 0);

      let inflowsToday = 0;
      let outflowsToday = 0;
      for (const m of todayMoves) {
        if (m.kind === "entrada") inflowsToday += m.amount;
        if (m.kind === "saida" || m.kind === "estorno") outflowsToday += m.amount;
      }

      let monthIn = 0;
      let monthOut = 0;
      for (const m of monthMoves) {
        if (m.kind === "entrada") monthIn += m.amount;
        if (m.kind === "saida" || m.kind === "estorno") monthOut += m.amount;
      }

      const dailyNet = inflowsToday - outflowsToday;
      const monthlyNet = monthIn - monthOut;
      // previsto simples: saldo + entradas líquidas do mês projetadas (net diário * dias restantes) — MVP
      const day = new Date().getDate();
      const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).getDate();
      const avgDaily = day > 0 ? monthlyNet / day : 0;
      const projectedBalance =
        currentBalance + avgDaily * Math.max(daysInMonth - day, 0);

      return {
        tenantId: context.tenantId,
        currentBalance,
        inflowsToday,
        outflowsToday,
        projectedBalance: Math.round(projectedBalance * 100) / 100,
        availableBalance: currentBalance,
        dailyNet,
        monthlyNet,
        asOf: new Date().toISOString(),
      };
    },
  };
}

export type CashFlowService = ReturnType<typeof createCashFlowService>;
export type FinancialSummaryService = ReturnType<
  typeof createFinancialSummaryService
>;
