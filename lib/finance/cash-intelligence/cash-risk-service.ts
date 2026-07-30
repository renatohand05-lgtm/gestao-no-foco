/**
 * Sprint 22.6.2 — Alertas preventivos de falta de caixa (deduplicados).
 */

import type {
  CashProjectionResult,
  CashRiskAlert,
  OpenTitleSnapshot,
} from "./types.ts";
import { addDays, roundMoney, todayUtc } from "./date-utils.ts";

function pushUnique(
  map: Map<string, CashRiskAlert>,
  alert: CashRiskAlert,
) {
  if (!map.has(alert.dedupeKey)) map.set(alert.dedupeKey, alert);
}

export function buildCashRiskAlerts(input: {
  tenantSlug: string;
  projection: CashProjectionResult;
  openTitles: OpenTitleSnapshot[];
  consolidatedBalance: number;
}): CashRiskAlert[] {
  const map = new Map<string, CashRiskAlert>();
  const today = todayUtc();
  const { projection, openTitles, consolidatedBalance, tenantSlug } = input;

  const payables = openTitles.filter(
    (t) => t.kind === "payable" && t.amountPending > 0 && !t.linkedMovementId,
  );
  const receivables = openTitles.filter(
    (t) => t.kind === "receivable" && t.amountPending > 0 && !t.linkedMovementId,
  );

  for (const windowDays of [7, 15] as const) {
    const until = addDays(today, windowDays);
    const due = payables.filter((t) => t.dueDate >= today && t.dueDate <= until);
    const need = roundMoney(due.reduce((s, t) => s + t.amountPending, 0));
    if (need > consolidatedBalance) {
      pushUnique(map, {
        id: `risk-insuff-${windowDays}`,
        severity: windowDays <= 7 ? "critical" : "warning",
        title: `Saldo insuficiente para compromissos dos próximos ${windowDays} dias`,
        description: `Compromissos ${need.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} vs saldo consolidado ${consolidatedBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
        expectedDate: due[0]?.dueDate ?? until,
        amountNeeded: roundMoney(need - consolidatedBalance),
        causes: due.slice(0, 5).map((t) => t.description),
        relatedOrigins: due.slice(0, 10).map((t) => ({
          kind: "payable" as const,
          id: t.id,
        })),
        recommendedAction:
          "Revisar vencimentos, antecipar recebimentos ou reprogramar pagamentos flexíveis.",
        href: `/${tenantSlug}/financeiro/caixa?horizon=${windowDays}`,
        dedupeKey: `insuff-${windowDays}`,
      });
    }
  }

  if (projection.ruptureDate) {
    pushUnique(map, {
      id: "risk-rupture",
      severity:
        projection.ruptureDate <= addDays(today, 15) ? "critical" : "warning",
      title: "Risco de saldo negativo no horizonte projetado",
      description: `Ruptura estimada em ${projection.ruptureDate}. Necessidade acumulada ${projection.capitalNeed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      expectedDate: projection.ruptureDate,
      amountNeeded: projection.capitalNeed,
      causes: ["Projeção de caixa com saídas superiores às entradas"],
      relatedOrigins: [],
      recommendedAction:
        "Abrir drill-down do menor saldo e avaliar recomendações de reprogramação.",
      href: `/${tenantSlug}/financeiro/caixa?focus=rupture`,
      dedupeKey: `rupture-${projection.ruptureDate}`,
    });
  }

  const byDate = new Map<string, number>();
  for (const t of payables) {
    byDate.set(t.dueDate, (byDate.get(t.dueDate) ?? 0) + t.amountPending);
  }
  for (const [date, total] of byDate) {
    if (total >= Math.max(consolidatedBalance * 0.4, 1) && total > 0) {
      pushUnique(map, {
        id: `risk-conc-${date}`,
        severity: "warning",
        title: "Concentração excessiva de pagamentos",
        description: `${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} concentrados em ${date}.`,
        expectedDate: date,
        amountNeeded: total,
        causes: [`Vencimentos concentrados em ${date}`],
        relatedOrigins: payables
          .filter((t) => t.dueDate === date)
          .slice(0, 8)
          .map((t) => ({ kind: "payable" as const, id: t.id })),
        recommendedAction: "Distribuir vencimentos flexíveis ao longo da semana.",
        href: `/${tenantSlug}/financeiro/contas-pagar`,
        dedupeKey: `concentration-${date}`,
      });
    }
  }

  const overdueRecv = receivables.filter((t) => t.overdue);
  const overdueAmt = roundMoney(
    overdueRecv.reduce((s, t) => s + t.amountPending, 0),
  );
  if (overdueRecv.length >= 3 || overdueAmt > consolidatedBalance * 0.2) {
    pushUnique(map, {
      id: "risk-ar-delay",
      severity: overdueAmt > consolidatedBalance * 0.5 ? "critical" : "warning",
      title: "Atraso relevante em contas a receber",
      description: `${overdueRecv.length} título(s) vencido(s) · ${overdueAmt.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      expectedDate: today,
      amountNeeded: overdueAmt,
      causes: overdueRecv.slice(0, 5).map((t) => t.description),
      relatedOrigins: overdueRecv.slice(0, 10).map((t) => ({
        kind: "receivable" as const,
        id: t.id,
      })),
      recommendedAction: "Priorizar cobrança dos maiores valores em atraso.",
      href: `/${tenantSlug}/financeiro/contas-receber`,
      dedupeKey: "ar-overdue",
    });
  }

  const expectedIn30 = receivables
    .filter((t) => t.dueDate <= addDays(today, 30))
    .reduce((s, t) => s + t.amountPending, 0);
  const expectedOut30 = payables
    .filter((t) => t.dueDate <= addDays(today, 30))
    .reduce((s, t) => s + t.amountPending, 0);
  if (expectedOut30 > expectedIn30 + consolidatedBalance) {
    pushUnique(map, {
      id: "risk-recv-insuff",
      severity: "warning",
      title: "Recebimentos esperados insuficientes (30 dias)",
      description: `Saídas previstas ${expectedOut30.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} vs entradas ${expectedIn30.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} + saldo.`,
      expectedDate: addDays(today, 30),
      amountNeeded: roundMoney(
        expectedOut30 - expectedIn30 - consolidatedBalance,
      ),
      causes: ["Descompasso entre recebimentos e pagamentos no mês"],
      relatedOrigins: [],
      recommendedAction: "Antecipar cobranças ou reprogramar pagamentos flexíveis.",
      href: `/${tenantSlug}/financeiro/caixa?horizon=30`,
      dedupeKey: "recv-insuff-30",
    });
  }

  return [...map.values()].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}
