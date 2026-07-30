/**
 * Sprint 22.2 — Treasury errors / validators / periods.
 */

import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import type { TreasuryPeriod, TreasuryPeriodKey, TreasuryTransferInput } from "./treasury-types.ts";

export {
  FINANCE_ERROR_CODES as TREASURY_ERROR_CODES,
  FinanceError as TreasuryError,
} from "../shared/errors.ts";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveTreasuryPeriod(
  key: TreasuryPeriodKey,
  custom?: { from?: string; to?: string },
): TreasuryPeriod {
  const today = new Date();
  const to = isoDate(today);
  const startOf = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return isoDate(d);
  };

  switch (key) {
    case "today":
      return { key, from: to, to, label: "Hoje" };
    case "7d":
      return { key, from: startOf(6), to, label: "7 dias" };
    case "30d":
      return { key, from: startOf(29), to, label: "30 dias" };
    case "60d":
      return { key, from: startOf(59), to, label: "60 dias" };
    case "90d":
      return { key, from: startOf(89), to, label: "90 dias" };
    case "12m": {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      return { key, from: isoDate(d), to, label: "12 meses" };
    }
    case "this_month": {
      const from = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
      return { key, from, to, label: "Este mês" };
    }
    case "last_month": {
      const from = isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const end = isoDate(new Date(today.getFullYear(), today.getMonth(), 0));
      return { key, from, to: end, label: "Mês anterior" };
    }
    case "this_year": {
      const from = isoDate(new Date(today.getFullYear(), 0, 1));
      return { key, from, to, label: "Este ano" };
    }
    case "custom": {
      const from = custom?.from?.trim() || startOf(29);
      const end = custom?.to?.trim() || to;
      return { key, from, to: end, label: "Personalizado" };
    }
    default:
      return { key: "30d", from: startOf(29), to, label: "30 dias" };
  }
}

export function previousPeriodOf(period: TreasuryPeriod): TreasuryPeriod {
  const from = new Date(period.from);
  const to = new Date(period.to);
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return {
    key: "custom",
    from: isoDate(prevFrom),
    to: isoDate(prevTo),
    label: "Período anterior",
  };
}

export function assertTransferInput(input: TreasuryTransferInput) {
  if (!input.idempotencyKey?.trim()) {
    throw new FinanceError(
      "idempotencyKey obrigatória.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (!input.fromAccountId || !input.toAccountId) {
    throw new FinanceError(
      "Contas de origem e destino obrigatórias.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new FinanceError(
      "Conta de origem e destino devem ser diferentes.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (!input.amount || input.amount <= 0) {
    throw new FinanceError(
      "Valor deve ser maior que zero.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (input.currency && input.currency !== "BRL") {
    throw new FinanceError(
      "Moeda não suportada nesta sprint (apenas BRL).",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (!input.description?.trim()) {
    throw new FinanceError(
      "Descrição obrigatória.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (!input.movementDate?.trim()) {
    throw new FinanceError(
      "Data da movimentação obrigatória.",
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
}

export function moneyBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function deltaTone(
  delta: number,
  invert = false,
): "positive" | "neutral" | "critical" {
  const v = invert ? -delta : delta;
  if (Math.abs(v) < 0.0001) return "neutral";
  return v > 0 ? "positive" : "critical";
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
