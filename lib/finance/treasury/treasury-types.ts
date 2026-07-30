/**
 * Sprint 22.2 — Treasury Experience · types.
 */

import type { BankAccount, CashMovement, CashMovementKind } from "../shared/types.ts";

export type TreasuryTone = "positive" | "neutral" | "critical";

export type TreasuryPeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "60d"
  | "90d"
  | "12m"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export type TreasuryPeriod = {
  key: TreasuryPeriodKey;
  from: string;
  to: string;
  label: string;
};

export type TreasuryKpi = {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  delta: number;
  deltaPct: number | null;
  tone: TreasuryTone;
  legend: string;
  format: "currency" | "number" | "percent";
};

export type TreasuryAlertSeverity = "info" | "warning" | "critical";

export type TreasuryAlert = {
  id: string;
  severity: TreasuryAlertSeverity;
  title: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  recommendedAction: string;
  href: string | null;
};

export type TreasuryInsight = {
  id: string;
  title: string;
  description: string;
  tone: TreasuryTone;
  metricLabel?: string;
  metricValue?: number;
};

export type TreasuryAccountView = {
  account: BankAccount;
  availableBalance: number;
  shareOfTotalPct: number;
  lastMovement: CashMovement | null;
  canTransfer: boolean;
};

export type TreasuryBalancePoint = {
  date: string;
  balance: number;
  inflows: number;
  outflows: number;
};

export type TreasuryBalanceEvolution = {
  period: TreasuryPeriod;
  points: TreasuryBalancePoint[];
  minBalance: number;
  maxBalance: number;
  minDate: string | null;
  maxDate: string | null;
  trend: "up" | "down" | "flat";
  trendPct: number | null;
  /** False quando não há movimentações no período (empty state do gráfico). */
  hasMovements: boolean;
};

export type TreasurySummary = {
  tenantId: string;
  period: TreasuryPeriod;
  previousPeriod: TreasuryPeriod;
  consolidatedBalance: number;
  availableBalance: number;
  projectedBalance: number;
  inflows: number;
  outflows: number;
  net: number;
  activeAccounts: number;
  kpis: TreasuryKpi[];
  alerts: TreasuryAlert[];
  asOf: string;
};

export type TreasuryMovementFilters = {
  from?: string | null;
  to?: string | null;
  accountId?: string | null;
  kind?: CashMovementKind | "all" | null;
  categoryId?: string | null;
  costCenterId?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string | null;
  page?: number;
  perPage?: number;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  /** Sem status nativo no movimento: normal = não-estorno; estornada = estorno. */
  status?: "all" | "normal" | "estornada" | null;
};

export type TreasuryMovementPage = {
  items: CashMovement[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  totalInflows: number;
  totalOutflows: number;
  net: number;
};

export type TreasuryTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  movementDate: string;
  description: string;
  categoryId?: string | null;
  costCenterId?: string | null;
  notes?: string | null;
  idempotencyKey: string;
  currency?: "BRL";
};

export type TreasuryTransferResult = {
  transferGroupId: string | null;
  correlationId: string;
  outMovement: CashMovement;
  inMovement: CashMovement | null;
  replayed: boolean;
  fromAccountName: string;
  toAccountName: string;
  amount: number;
};
