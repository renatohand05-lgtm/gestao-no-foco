/**
 * Sprint 22.2 — Queries / evolução / histórico paginado.
 */

import type { BankAccountRepository } from "../bank/bank-account-repository.ts";
import type { CashMovementRepository } from "../cashflow/cash-movement-repository.ts";
import type { CashMovement } from "../shared/types.ts";
import type {
  TreasuryBalanceEvolution,
  TreasuryBalancePoint,
  TreasuryMovementFilters,
  TreasuryMovementPage,
  TreasuryPeriod,
} from "./treasury-types.ts";

const MAX_FETCH = 500;

function matchesFilters(
  m: CashMovement,
  f: TreasuryMovementFilters,
): boolean {
  if (f.accountId && m.bankAccountId !== f.accountId) {
    if (m.counterpartyAccountId !== f.accountId) return false;
  }
  if (f.kind && f.kind !== "all" && m.kind !== f.kind) return false;
  if (f.categoryId && m.categoryId !== f.categoryId) return false;
  if (f.costCenterId && m.costCenterId !== f.costCenterId) return false;
  if (f.minAmount != null && m.amount < f.minAmount) return false;
  if (f.maxAmount != null && m.amount > f.maxAmount) return false;
  if (f.search?.trim()) {
    const q = f.search.trim().toLowerCase();
    if (!m.description.toLowerCase().includes(q) && !(m.notes ?? "").toLowerCase().includes(q)) {
      return false;
    }
  }
  if (f.status && f.status !== "all") {
    if (f.status === "estornada" && m.kind !== "estorno") return false;
    if (f.status === "normal" && m.kind === "estorno") return false;
  }
  return true;
}

export function createTreasuryQueryService(deps: {
  accounts: BankAccountRepository;
  movements: CashMovementRepository;
}) {
  return {
    async listMovements(
      tenantId: string,
      filters: TreasuryMovementFilters = {},
    ): Promise<TreasuryMovementPage> {
      const page = Math.max(1, filters.page ?? 1);
      const perPage = Math.min(100, Math.max(1, filters.perPage ?? 25));
      const raw = await deps.movements.list(tenantId, {
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
        accountId: filters.accountId ?? undefined,
        limit: MAX_FETCH,
      });
      let items = raw.filter((m) => matchesFilters(m, filters));

      const sort = filters.sort ?? "date_desc";
      items = [...items].sort((a, b) => {
        if (sort === "date_asc") return a.movementDate.localeCompare(b.movementDate);
        if (sort === "amount_desc") return b.amount - a.amount;
        if (sort === "amount_asc") return a.amount - b.amount;
        return b.movementDate.localeCompare(a.movementDate);
      });

      let totalInflows = 0;
      let totalOutflows = 0;
      for (const m of items) {
        if (m.kind === "entrada") totalInflows += m.amount;
        if (m.kind === "saida" || m.kind === "estorno") totalOutflows += m.amount;
      }

      const total = items.length;
      const start = (page - 1) * perPage;
      const pageItems = items.slice(start, start + perPage);

      return {
        items: pageItems,
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        totalInflows,
        totalOutflows,
        net: totalInflows - totalOutflows,
      };
    },

    async balanceEvolution(
      tenantId: string,
      period: TreasuryPeriod,
      accountId?: string | null,
    ): Promise<TreasuryBalanceEvolution> {
      const [accounts, movements] = await Promise.all([
        deps.accounts.list(tenantId),
        deps.movements.list(tenantId, {
          from: period.from,
          to: period.to,
          accountId: accountId ?? undefined,
          limit: MAX_FETCH,
        }),
      ]);

      const active = accounts.filter((a) => a.status === "active");
      const closing = accountId
        ? (active.find((a) => a.id === accountId)?.currentBalance ?? 0)
        : active.reduce((s, a) => s + a.currentBalance, 0);

      const byDay = new Map<string, { inflows: number; outflows: number }>();
      for (const m of movements) {
        const bucket = byDay.get(m.movementDate) ?? { inflows: 0, outflows: 0 };
        if (m.kind === "entrada") bucket.inflows += m.amount;
        else if (m.kind === "saida" || m.kind === "estorno") bucket.outflows += m.amount;
        else if (m.kind === "transferencia" && accountId) {
          if (m.bankAccountId === accountId) bucket.outflows += m.amount;
          else if (m.counterpartyAccountId === accountId) bucket.inflows += m.amount;
        }
        byDay.set(m.movementDate, bucket);
      }

      const dates = [...byDay.keys()].sort();
      const hasMovements = dates.length > 0;
      const periodNet = [...byDay.values()].reduce(
        (s, d) => s + d.inflows - d.outflows,
        0,
      );
      let running = closing - periodNet;
      const points: TreasuryBalancePoint[] = [];
      for (const date of dates) {
        const d = byDay.get(date)!;
        running += d.inflows - d.outflows;
        points.push({
          date,
          balance: Math.round(running * 100) / 100,
          inflows: d.inflows,
          outflows: d.outflows,
        });
      }

      if (!hasMovements) {
        return {
          period,
          points: [],
          minBalance: closing,
          maxBalance: closing,
          minDate: null,
          maxDate: null,
          trend: "flat",
          trendPct: 0,
          hasMovements: false,
        };
      }

      const balances = points.map((p) => p.balance);
      const minBalance = Math.min(...balances);
      const maxBalance = Math.max(...balances);
      const minPoint = points.find((p) => p.balance === minBalance) ?? null;
      const maxPoint = points.find((p) => p.balance === maxBalance) ?? null;
      const first = points[0]!.balance;
      const last = points[points.length - 1]!.balance;
      const delta = last - first;
      const trend: TreasuryBalanceEvolution["trend"] =
        Math.abs(delta) < 0.01 ? "flat" : delta > 0 ? "up" : "down";
      const trendPct =
        first === 0 ? null : Math.round((delta / Math.abs(first)) * 1000) / 10;

      return {
        period,
        points,
        minBalance,
        maxBalance,
        minDate: minPoint?.date ?? null,
        maxDate: maxPoint?.date ?? null,
        trend,
        trendPct,
        hasMovements: true,
      };
    },
  };
}

export type TreasuryQueryService = ReturnType<typeof createTreasuryQueryService>;
