/**
 * Sprint 22.6.2 — Capital de giro necessário (estimativa rastreável).
 */

import type { CashProjectionResult, OpenTitleSnapshot, WorkingCapitalResult } from "./types.ts";
import { roundMoney } from "./date-utils.ts";

export function computeWorkingCapital(input: {
  tenantId: string;
  projection: CashProjectionResult;
  openTitles: OpenTitleSnapshot[];
  safetyMarginPct?: number;
  avgPaymentDays?: number | null;
  avgReceivableDays?: number | null;
}): WorkingCapitalResult {
  const safetyMarginPct = input.safetyMarginPct ?? 0.15;
  const minProjected = input.projection.minBalance;
  const capitalFromFloor = Math.max(0, -minProjected);

  const payables = input.openTitles.filter(
    (t) => t.tenantId === input.tenantId && t.kind === "payable" && t.amountPending > 0,
  );
  const receivables = input.openTitles.filter(
    (t) =>
      t.tenantId === input.tenantId && t.kind === "receivable" && t.amountPending > 0,
  );
  const commitments = roundMoney(
    payables.reduce((s, t) => s + t.amountPending, 0),
  );
  const expectedIn = roundMoney(
    receivables.reduce((s, t) => s + t.amountPending, 0),
  );

  const safetyReserve = roundMoney(
    (capitalFromFloor + commitments) * safetyMarginPct,
  );
  const minimum = roundMoney(capitalFromFloor);
  const recommended = roundMoney(minimum + safetyReserve);
  const netGap = roundMoney(commitments - expectedIn - Math.max(0, minProjected));
  const deficit = roundMoney(Math.max(0, netGap));
  const surplus = roundMoney(Math.max(0, -netGap));

  const placeholders: string[] = [];
  if (input.avgPaymentDays == null) placeholders.push("prazo_medio_pagamento");
  if (input.avgReceivableDays == null) placeholders.push("prazo_medio_recebimento");
  placeholders.push("sazonalidade");

  let confidence: WorkingCapitalResult["confidence"] = input.projection.confidence;
  if (placeholders.length >= 2 && input.projection.insufficientData) {
    confidence = "low";
  }

  return {
    tenantId: input.tenantId,
    horizonDays: input.projection.horizonDays,
    minimum,
    recommended,
    safetyReserve,
    deficit,
    surplus,
    minProjectedBalance: minProjected,
    avgPaymentDays: input.avgPaymentDays ?? null,
    avgReceivableDays: input.avgReceivableDays ?? null,
    confidence,
    methodology:
      "Mínimo = max(0, −menor saldo projetado). Reserva = (mínimo + compromissos AP) × margem de segurança configurável (padrão 15%). Recomendado = mínimo + reserva. Déficit/excesso = compromissos − recebimentos − max(0, menor saldo). Prazos médios e sazonalidade entram como placeholders quando não há histórico suficiente. Estimativa — não é certeza absoluta.",
    placeholderFields: placeholders,
  };
}
