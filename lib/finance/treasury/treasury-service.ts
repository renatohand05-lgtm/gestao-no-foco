/**
 * Sprint 22.2 — Orquestrador Treasury Experience.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { IdempotencyRepository } from "../../enterprise/repositories/idempotency-repository.ts";
import type { BankAccountRepository } from "../bank/bank-account-repository.ts";
import type { CashMovementRepository } from "../cashflow/cash-movement-repository.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import { assertFinancePermission } from "../shared/rbac.ts";
import { createTreasuryAlertsService } from "./treasury-alerts-service.ts";
import { createTreasuryInsightsService } from "./treasury-insights-service.ts";
import { createTreasuryQueryService } from "./treasury-query-service.ts";
import { createTreasurySummaryService } from "./treasury-summary-service.ts";
import { createTreasuryTransferService } from "./treasury-transfer-service.ts";
import type {
  TreasuryAccountView,
  TreasuryMovementFilters,
  TreasuryPeriodKey,
  TreasuryTransferInput,
} from "./treasury-types.ts";

export type TreasuryServiceDeps = {
  accounts: BankAccountRepository;
  movements: CashMovementRepository;
  bridge: FinanceEnterpriseBridge;
  idempotency: IdempotencyRepository;
  tenantSlug?: string;
  lowBalanceThreshold?: number;
};

function assertFinanceContext(context: EnterpriseContext) {
  if (!context.permissions?.length) {
    throw new FinanceError(
      "Sem permissão para o módulo financeiro.",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

export function createTreasuryService(deps: TreasuryServiceDeps) {
  const summary = createTreasurySummaryService({
    accounts: deps.accounts,
    movements: deps.movements,
    tenantSlug: deps.tenantSlug,
    lowBalanceThreshold: deps.lowBalanceThreshold,
  });
  const query = createTreasuryQueryService({
    accounts: deps.accounts,
    movements: deps.movements,
  });
  const transfer = createTreasuryTransferService({
    accounts: deps.accounts,
    movements: deps.movements,
    bridge: deps.bridge,
    idempotency: deps.idempotency,
  });
  const insights = createTreasuryInsightsService();
  const alerts = createTreasuryAlertsService({
    tenantSlug: deps.tenantSlug,
    lowBalanceThreshold: deps.lowBalanceThreshold,
  });

  return {
    async getTreasurySummary(
      context: EnterpriseContext,
      periodKey: TreasuryPeriodKey = "30d",
      custom?: { from?: string; to?: string },
    ) {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_saldos",
        "financeiro.contas.visualizar",
      ]);
      const started = Date.now();
      try {
        const result = await summary.getSummary(
          context.tenantId,
          periodKey,
          custom,
        );
        deps.bridge.metrics.recordRequest(
          context.tenantId,
          "treasury",
          Date.now() - started,
          "ok",
          { kind: "server_action", action: "getTreasurySummary" },
        );
        return result;
      } catch (error) {
        deps.bridge.metrics.recordRequest(
          context.tenantId,
          "treasury",
          Date.now() - started,
          "error",
          { kind: "server_action", action: "getTreasurySummary" },
        );
        throw error;
      }
    },

    async getTreasuryAccounts(context: EnterpriseContext): Promise<TreasuryAccountView[]> {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.contas.visualizar",
        "financeiro.ver_saldos",
      ]);
      const [accounts, movements] = await Promise.all([
        deps.accounts.list(context.tenantId),
        deps.movements.list(context.tenantId, { limit: 200 }),
      ]);
      const active = accounts.filter((a) => a.status === "active");
      const total = active.reduce((s, a) => s + a.currentBalance, 0) || 1;
      return active.map((account) => {
        const lastMovement =
          movements.find((m) => m.bankAccountId === account.id) ?? null;
        return {
          account,
          availableBalance: account.currentBalance,
          shareOfTotalPct:
            Math.round((account.currentBalance / total) * 1000) / 10,
          lastMovement,
          canTransfer: account.status === "active",
        };
      });
    },

    async getTreasuryBalanceEvolution(
      context: EnterpriseContext,
      periodKey: TreasuryPeriodKey = "30d",
      accountId?: string | null,
      custom?: { from?: string; to?: string },
    ) {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_fluxo_caixa",
      ]);
      const period = summary.resolvePeriod(periodKey, custom);
      return query.balanceEvolution(context.tenantId, period, accountId);
    },

    async listTreasuryMovements(
      context: EnterpriseContext,
      filters: TreasuryMovementFilters = {},
    ) {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.movimentacoes.visualizar",
        "financeiro.ver_fluxo_caixa",
      ]);
      return query.listMovements(context.tenantId, filters);
    },

    async transferBetweenAccounts(
      context: EnterpriseContext,
      input: TreasuryTransferInput,
    ) {
      assertFinanceContext(context);
      return transfer.transfer(context, input);
    },

    async getTreasuryInsights(
      context: EnterpriseContext,
      periodKey: TreasuryPeriodKey = "30d",
    ) {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.alertas.visualizar",
      ]);
      const snap = await summary.getSummary(context.tenantId, periodKey);
      const [accounts, movements] = await Promise.all([
        deps.accounts.list(context.tenantId),
        deps.movements.list(context.tenantId, {
          from: snap.period.from,
          to: snap.period.to,
          limit: 500,
        }),
      ]);
      return insights.build({
        period: snap.period,
        accounts,
        movements,
        consolidatedBalance: snap.consolidatedBalance,
      });
    },

    async getTreasuryAlerts(
      context: EnterpriseContext,
      periodKey: TreasuryPeriodKey = "30d",
    ) {
      assertFinanceContext(context);
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.alertas.visualizar",
      ]);
      const snap = await summary.getSummary(context.tenantId, periodKey);
      return snap.alerts.length
        ? snap.alerts
        : alerts.build({
            accounts: await deps.accounts.list(context.tenantId),
            movements: await deps.movements.list(context.tenantId, {
              from: snap.period.from,
              to: snap.period.to,
              limit: 500,
            }),
            consolidatedBalance: snap.consolidatedBalance,
            previousNet: 0,
            currentNet: snap.net,
          });
    },
  };
}

export type TreasuryService = ReturnType<typeof createTreasuryService>;
