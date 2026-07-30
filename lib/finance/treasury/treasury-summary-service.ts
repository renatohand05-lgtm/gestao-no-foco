/**
 * Sprint 22.2 — Treasury summary KPIs (single collect).
 */

import type { BankAccountRepository } from "../bank/bank-account-repository.ts";
import type { CashMovementRepository } from "../cashflow/cash-movement-repository.ts";
import type { CashMovement } from "../shared/types.ts";
import { createTreasuryAlertsService } from "./treasury-alerts-service.ts";
import {
  deltaTone,
  pctChange,
  previousPeriodOf,
  resolveTreasuryPeriod,
} from "./treasury-validator.ts";
import type {
  TreasuryKpi,
  TreasuryPeriod,
  TreasuryPeriodKey,
  TreasurySummary,
} from "./treasury-types.ts";

function periodTotals(movements: CashMovement[]) {
  let inflows = 0;
  let outflows = 0;
  for (const m of movements) {
    if (m.kind === "entrada") inflows += m.amount;
    if (m.kind === "saida" || m.kind === "estorno") outflows += m.amount;
  }
  return { inflows, outflows, net: inflows - outflows };
}

function kpi(
  key: string,
  label: string,
  value: number,
  previousValue: number,
  legend: string,
  invert = false,
): TreasuryKpi {
  const delta = value - previousValue;
  return {
    key,
    label,
    value,
    previousValue,
    delta,
    deltaPct: pctChange(value, previousValue),
    tone: deltaTone(delta, invert),
    legend,
    format: "currency",
  };
}

export function createTreasurySummaryService(deps: {
  accounts: BankAccountRepository;
  movements: CashMovementRepository;
  tenantSlug?: string;
  lowBalanceThreshold?: number;
}) {
  const alertsSvc = createTreasuryAlertsService({
    tenantSlug: deps.tenantSlug,
    lowBalanceThreshold: deps.lowBalanceThreshold,
  });

  return {
    async getSummary(
      tenantId: string,
      periodKey: TreasuryPeriodKey = "30d",
      custom?: { from?: string; to?: string },
    ): Promise<TreasurySummary> {
      const period = resolveTreasuryPeriod(periodKey, custom);
      const previousPeriod = previousPeriodOf(period);

      const [accounts, currentMoves, previousMoves] = await Promise.all([
        deps.accounts.list(tenantId),
        deps.movements.list(tenantId, {
          from: period.from,
          to: period.to,
          limit: 500,
        }),
        deps.movements.list(tenantId, {
          from: previousPeriod.from,
          to: previousPeriod.to,
          limit: 500,
        }),
      ]);

      const active = accounts.filter((a) => a.status === "active");
      const consolidatedBalance = active.reduce(
        (s, a) => s + a.currentBalance,
        0,
      );
      const cur = periodTotals(currentMoves);
      const prev = periodTotals(previousMoves);

      const day = new Date().getDate();
      const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).getDate();
      const avgDaily = day > 0 ? cur.net / day : 0;
      const projectedBalance =
        Math.round(
          (consolidatedBalance + avgDaily * Math.max(daysInMonth - day, 0)) *
            100,
        ) / 100;

      const kpis: TreasuryKpi[] = [
        kpi(
          "consolidated",
          "Saldo total consolidado",
          consolidatedBalance,
          consolidatedBalance - cur.net,
          `Posição atual · ${period.label}`,
        ),
        kpi(
          "available",
          "Saldo disponível",
          consolidatedBalance,
          consolidatedBalance - cur.net,
          "Disponível operacional (sem bloqueios nesta sprint)",
        ),
        kpi(
          "projected",
          "Saldo previsto",
          projectedBalance,
          consolidatedBalance,
          "Projeção linear simples até o fim do mês",
        ),
        kpi(
          "inflows",
          "Entradas no período",
          cur.inflows,
          prev.inflows,
          `Comparado a ${previousPeriod.label}`,
        ),
        kpi(
          "outflows",
          "Saídas no período",
          cur.outflows,
          prev.outflows,
          `Comparado a ${previousPeriod.label}`,
          true,
        ),
        kpi(
          "net",
          "Resultado líquido",
          cur.net,
          prev.net,
          `Entradas − saídas · ${period.label}`,
        ),
        {
          key: "accounts",
          label: "Contas ativas",
          value: active.length,
          previousValue: active.length,
          delta: 0,
          deltaPct: 0,
          tone: "neutral",
          legend: "Contas bancárias ativas no tenant",
          format: "number",
        },
      ];

      const alerts = alertsSvc.build({
        accounts,
        movements: currentMoves,
        consolidatedBalance,
        previousNet: prev.net,
        currentNet: cur.net,
      });

      return {
        tenantId,
        period,
        previousPeriod,
        consolidatedBalance,
        availableBalance: consolidatedBalance,
        projectedBalance,
        inflows: cur.inflows,
        outflows: cur.outflows,
        net: cur.net,
        activeAccounts: active.length,
        kpis,
        alerts,
        asOf: new Date().toISOString(),
      };
    },

    resolvePeriod(
      key: TreasuryPeriodKey,
      custom?: { from?: string; to?: string },
    ): TreasuryPeriod {
      return resolveTreasuryPeriod(key, custom);
    },
  };
}

export type TreasurySummaryService = ReturnType<
  typeof createTreasurySummaryService
>;
