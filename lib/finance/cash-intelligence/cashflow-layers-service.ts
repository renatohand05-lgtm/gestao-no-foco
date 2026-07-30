/**
 * Sprint 22.6.2 — Camadas REALIZADO / PREVISTO / PROJETADO.
 */

import type { CashMovement } from "../shared/types.ts";
import type {
  CashFlowLine,
  CashLayersResult,
  OpenTitleSnapshot,
  RecurringSnapshot,
} from "./types.ts";
import { addDays, eachDay, roundMoney, toDateOnly } from "./date-utils.ts";

function sumDir(lines: CashFlowLine[], dir: "in" | "out"): number {
  return roundMoney(
    lines.filter((l) => l.direction === dir).reduce((s, l) => s + l.amount, 0),
  );
}

export function movementToRealizedLine(m: CashMovement): CashFlowLine | null {
  if (m.kind === "transferencia") {
    // Transferências internas: rastreadas mas não misturadas como receita/despesa operacional.
    return {
      id: `realized-xfer-${m.id}`,
      tenantId: m.tenantId,
      layer: "realized",
      date: toDateOnly(m.movementDate),
      amount: m.amount,
      direction: "out",
      description: m.description || "Transferência",
      bankAccountId: m.bankAccountId,
      categoryId: m.categoryId,
      costCenterId: m.costCenterId,
      dreGroup: null,
      status: "transfer",
      origin: {
        kind: "transfer",
        id: m.transferGroupId ?? m.id,
        correlationId: m.transferGroupId,
      },
    };
  }
  if (m.kind !== "entrada" && m.kind !== "saida" && m.kind !== "estorno") {
    return null;
  }
  const direction = m.kind === "entrada" ? "in" : "out";
  return {
    id: `realized-${m.id}`,
    tenantId: m.tenantId,
    layer: "realized",
    date: toDateOnly(m.movementDate),
    amount: Math.abs(m.amount),
    direction,
    description: m.description,
    bankAccountId: m.bankAccountId,
    categoryId: m.categoryId,
    costCenterId: m.costCenterId,
    dreGroup: null,
    status: m.kind,
    origin: { kind: "movement", id: m.id },
  };
}

export function titleToForecastLine(t: OpenTitleSnapshot): CashFlowLine | null {
  if (t.linkedMovementId) return null; // evita duplicidade com realizado
  if (t.status === "cancelado" || t.status === "pago" || t.status === "recebido") {
    return null;
  }
  if (t.amountPending <= 0) return null;
  return {
    id: `forecast-${t.kind}-${t.id}`,
    tenantId: t.tenantId,
    layer: "forecast",
    date: toDateOnly(t.dueDate),
    amount: t.amountPending,
    direction: t.kind === "receivable" ? "in" : "out",
    description: t.description,
    bankAccountId: t.bankAccountId,
    categoryId: t.categoryId,
    costCenterId: t.costCenterId,
    dreGroup: t.dreGroup,
    status: t.status,
    overdue: t.overdue,
    origin: {
      kind: t.kind,
      id: t.id,
      label: t.installmentLabel ?? undefined,
    },
  };
}

export function expandRecurringToForecast(
  recurring: RecurringSnapshot[],
  tenantId: string,
  from: string,
  to: string,
): CashFlowLine[] {
  const lines: CashFlowLine[] = [];
  for (const r of recurring) {
    if (!r.active || r.tenantId !== tenantId) continue;
    for (const day of eachDay(from, to)) {
      const dom = Number(day.slice(8, 10));
      const lastDay = Number(addDays(`${day.slice(0, 8)}01`, 32).slice(8, 10)) || 28;
      const target = Math.min(r.dayOfMonth, lastDay);
      if (dom !== target) continue;
      lines.push({
        id: `forecast-recurring-${r.id}-${day}`,
        tenantId,
        layer: "forecast",
        date: day,
        amount: r.amount,
        direction: r.direction,
        description: r.description,
        bankAccountId: r.bankAccountId,
        categoryId: r.categoryId,
        costCenterId: r.costCenterId,
        dreGroup: null,
        status: "recurring",
        origin: { kind: "recurring", id: r.id },
      });
    }
  }
  return lines;
}

/**
 * Projetado = simulação além do previsto explícito.
 * Usa média diária líquida do realizado histórico apenas quando há amostra mínima.
 * Nunca fabrica valores quando dados são insuficientes (projected = []).
 */
export function buildProjectedLines(input: {
  tenantId: string;
  from: string;
  to: string;
  realizedHistory: CashFlowLine[];
  minHistoryDays?: number;
}): { lines: CashFlowLine[]; confidence: "high" | "medium" | "low"; reason: string } {
  const minDays = input.minHistoryDays ?? 14;
  const ops = input.realizedHistory.filter(
    (l) => l.origin.kind === "movement" && l.status !== "transfer",
  );
  if (ops.length < 5) {
    return {
      lines: [],
      confidence: "low",
      reason:
        "Dados insuficientes para projetar além do previsto (menos de 5 movimentos operacionais).",
    };
  }

  const dates = ops.map((l) => l.date).sort();
  const span = Math.max(
    1,
    (new Date(`${dates[dates.length - 1]}T12:00:00Z`).getTime() -
      new Date(`${dates[0]}T12:00:00Z`).getTime()) /
      86_400_000 +
      1,
  );
  if (span < minDays) {
    return {
      lines: [],
      confidence: "low",
      reason: `Histórico curto (${Math.floor(span)} dias) — projeção automática omitida.`,
    };
  }

  let net = 0;
  for (const l of ops) {
    net += l.direction === "in" ? l.amount : -l.amount;
  }
  const avgDaily = net / span;
  if (Math.abs(avgDaily) < 0.01) {
    return {
      lines: [],
      confidence: "medium",
      reason: "Média diária ~0 — sem linhas projetadas adicionais.",
    };
  }

  const lines: CashFlowLine[] = [];
  for (const day of eachDay(input.from, input.to)) {
    const amount = roundMoney(Math.abs(avgDaily));
    lines.push({
      id: `projected-trend-${day}`,
      tenantId: input.tenantId,
      layer: "projected",
      date: day,
      amount,
      direction: avgDaily >= 0 ? "in" : "out",
      description: "Tendência histórica (projetado)",
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "trend",
      origin: { kind: "scenario", id: "historical-trend", label: "trend" },
    });
  }

  return {
    lines,
    confidence: span >= 60 ? "high" : "medium",
    reason: `Tendência baseada em ${ops.length} movimentos ao longo de ${Math.floor(span)} dias. Separada do previsto (títulos).`,
  };
}

export function buildCashLayers(input: {
  tenantId: string;
  from: string;
  to: string;
  openingBalance: number;
  movements: CashMovement[];
  openTitles: OpenTitleSnapshot[];
  recurring?: RecurringSnapshot[];
  includeProjectedTrend?: boolean;
}): CashLayersResult {
  const from = toDateOnly(input.from);
  const to = toDateOnly(input.to);

  const realizedAll = input.movements
    .filter((m) => m.tenantId === input.tenantId)
    .map(movementToRealizedLine)
    .filter((l): l is CashFlowLine => Boolean(l));

  const realized = realizedAll.filter((l) => l.date >= from && l.date <= to);

  const forecastTitles = input.openTitles
    .filter((t) => t.tenantId === input.tenantId)
    .map(titleToForecastLine)
    .filter((l): l is CashFlowLine => Boolean(l))
    .filter((l) => l.date >= from && l.date <= to);

  const forecastRecurring = expandRecurringToForecast(
    input.recurring ?? [],
    input.tenantId,
    from,
    to,
  );

  const forecast = [...forecastTitles, ...forecastRecurring];

  let projected: CashFlowLine[] = [];
  let confidence: CashLayersResult["confidence"] = "medium";
  let confidenceReason =
    "Previsto baseado em títulos abertos; projetado opcional.";

  if (input.includeProjectedTrend !== false) {
    const proj = buildProjectedLines({
      tenantId: input.tenantId,
      from,
      to,
      realizedHistory: realizedAll.filter((l) => l.date < from),
    });
    projected = proj.lines;
    confidence = proj.confidence;
    confidenceReason = proj.reason;
  } else {
    confidence = forecast.length > 0 ? "medium" : "low";
    confidenceReason =
      forecast.length > 0
        ? "Apenas previsto (títulos/recorrências) — sem camada projetada."
        : "Sem títulos previstos nem tendência projetada.";
  }

  // Operacional: exclui transferências dos totais de receita/despesa
  const realizedOps = realized.filter((l) => l.status !== "transfer");

  return {
    tenantId: input.tenantId,
    from,
    to,
    openingBalance: input.openingBalance,
    realized,
    forecast,
    projected,
    totals: {
      realizedIn: sumDir(realizedOps, "in"),
      realizedOut: sumDir(realizedOps, "out"),
      forecastIn: sumDir(forecast, "in"),
      forecastOut: sumDir(forecast, "out"),
      projectedIn: sumDir(projected, "in"),
      projectedOut: sumDir(projected, "out"),
    },
    confidence,
    confidenceReason,
  };
}
