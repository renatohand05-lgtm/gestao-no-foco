/**
 * Sprint 22.2 — Insights determinísticos (sem IA).
 */

import type { BankAccount, CashMovement } from "../shared/types.ts";
import { moneyBRL } from "./treasury-validator.ts";
import type { TreasuryInsight, TreasuryPeriod } from "./treasury-types.ts";

export function createTreasuryInsightsService() {
  return {
    build(input: {
      period: TreasuryPeriod;
      accounts: BankAccount[];
      movements: CashMovement[];
      consolidatedBalance: number;
    }): TreasuryInsight[] {
      const { accounts, movements, consolidatedBalance, period } = input;
      const insights: TreasuryInsight[] = [];
      const active = accounts.filter((a) => a.status === "active");

      const expenses = movements.filter((m) => m.kind === "saida");
      const incomes = movements.filter((m) => m.kind === "entrada");

      if (expenses.length) {
        const maxExp = expenses.reduce((a, b) => (a.amount > b.amount ? a : b));
        insights.push({
          id: "largest-expense",
          title: "Maior despesa do período",
          description: `${maxExp.description} · ${moneyBRL(maxExp.amount)} (${period.label})`,
          tone: "critical",
          metricLabel: "Valor",
          metricValue: maxExp.amount,
        });
      }

      if (incomes.length) {
        const maxIn = incomes.reduce((a, b) => (a.amount > b.amount ? a : b));
        insights.push({
          id: "largest-income",
          title: "Maior entrada do período",
          description: `${maxIn.description} · ${moneyBRL(maxIn.amount)}`,
          tone: "positive",
          metricLabel: "Valor",
          metricValue: maxIn.amount,
        });
      }

      if (active.length) {
        const richest = [...active].sort(
          (a, b) => b.currentBalance - a.currentBalance,
        )[0]!;
        const poorest = [...active].sort(
          (a, b) => a.currentBalance - b.currentBalance,
        )[0]!;
        insights.push({
          id: "highest-balance",
          title: "Conta com maior saldo",
          description: `${richest.name} · ${moneyBRL(richest.currentBalance)}`,
          tone: "positive",
          metricValue: richest.currentBalance,
        });
        insights.push({
          id: "lowest-balance",
          title: "Conta com menor saldo",
          description: `${poorest.name} · ${moneyBRL(poorest.currentBalance)}`,
          tone: poorest.currentBalance < 0 ? "critical" : "neutral",
          metricValue: poorest.currentBalance,
        });

        if (consolidatedBalance > 0) {
          const share = (richest.currentBalance / consolidatedBalance) * 100;
          if (share >= 70) {
            insights.push({
              id: "cash-concentration",
              title: "Concentração de caixa",
              description: `${share.toFixed(0)}% do caixa está em ${richest.name}. Considere diversificar reservas.`,
              tone: "warning" as never,
              metricValue: share,
            });
            insights[insights.length - 1]!.tone =
              share >= 85 ? "critical" : "neutral";
          }
        }
      }

      if (expenses.length >= 3) {
        const avg =
          expenses.reduce((s, m) => s + m.amount, 0) / expenses.length;
        const above = expenses.filter((m) => m.amount > avg * 1.5);
        if (above.length) {
          insights.push({
            id: "above-avg-expense",
            title: "Despesa acima da média",
            description: `${above.length} saída(s) acima de 150% da média (${moneyBRL(avg)}).`,
            tone: "critical",
            metricValue: avg,
          });
        }
      }

      const sortedDates = [...new Set(movements.map((m) => m.movementDate))].sort();
      if (sortedDates.length >= 2) {
        const first = sortedDates[0]!;
        const last = sortedDates[sortedDates.length - 1]!;
        const firstNet = movements
          .filter((m) => m.movementDate === first)
          .reduce(
            (s, m) =>
              s +
              (m.kind === "entrada" ? m.amount : m.kind === "saida" ? -m.amount : 0),
            0,
          );
        const lastNet = movements
          .filter((m) => m.movementDate === last)
          .reduce(
            (s, m) =>
              s +
              (m.kind === "entrada" ? m.amount : m.kind === "saida" ? -m.amount : 0),
            0,
          );
        if (lastNet < firstNet * 0.5 && firstNet > 0) {
          insights.push({
            id: "balance-drop",
            title: "Queda relevante no fluxo líquido",
            description: `Fluxo líquido caiu de ${moneyBRL(firstNet)} para ${moneyBRL(lastNet)} no período.`,
            tone: "critical",
          });
        }
      }

      const outTotal = expenses.reduce((s, m) => s + m.amount, 0);
      const inTotal = incomes.reduce((s, m) => s + m.amount, 0);
      if (outTotal > inTotal * 1.3 && outTotal > 0) {
        insights.push({
          id: "outflow-surge",
          title: "Aumento relevante nas saídas",
          description: `Saídas (${moneyBRL(outTotal)}) superam entradas (${moneyBRL(inTotal)}) em mais de 30%.`,
          tone: "critical",
        });
      }

      if (incomes.length === 0 && movements.length > 0) {
        insights.push({
          id: "no-inflows",
          title: "Ausência de entradas recentes",
          description: `Não há entradas registradas em ${period.label}.`,
          tone: "neutral",
        });
      }

      if (consolidatedBalance < 0) {
        insights.push({
          id: "negative-risk",
          title: "Risco de saldo negativo",
          description: `Saldo consolidado em ${moneyBRL(consolidatedBalance)}.`,
          tone: "critical",
          metricValue: consolidatedBalance,
        });
      }

      return insights.slice(0, 8);
    },
  };
}

export type TreasuryInsightsService = ReturnType<
  typeof createTreasuryInsightsService
>;
