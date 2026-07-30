/**
 * Fase 25 — Alertas Supply (somente sobre KPIs resolvidos).
 */

import type { SupplyAlert, SupplyEnterpriseSnapshot, SupplyKpiResult } from "./types.ts";

export function buildSupplyAlerts(args: {
  snap: SupplyEnterpriseSnapshot;
  kpis: SupplyKpiResult[];
}): SupplyAlert[] {
  const alerts: SupplyAlert[] = [];
  const byId = new Map(args.kpis.map((k) => [k.definitionId, k]));

  const ruptura = byId.get("supply.ruptura");
  if (
    ruptura?.availability === "available" &&
    ruptura.value != null &&
    ruptura.value > 0
  ) {
    alerts.push({
      id: "alert-ruptura",
      severity: ruptura.value >= 5 ? "critica" : "alta",
      title: "Risco de ruptura",
      description: `${ruptura.value} produto(s) zerados ou abaixo do mínimo.`,
      kpiId: "supply.ruptura",
      actionHint: "Revisar reposição e pedidos em aberto.",
    });
  }

  const parado = byId.get("supply.parado");
  if (
    parado?.availability === "available" &&
    parado.value != null &&
    parado.value > 0
  ) {
    alerts.push({
      id: "alert-parado",
      severity: "media",
      title: "Estoque parado",
      description: `${parado.value} item(ns) sem movimentação há 90+ dias.`,
      kpiId: "supply.parado",
      actionHint: "Avaliar liquidação ou transferência.",
    });
  }

  const excesso = byId.get("supply.excesso");
  if (
    excesso?.availability === "available" &&
    excesso.value != null &&
    excesso.value > 0
  ) {
    alerts.push({
      id: "alert-excesso",
      severity: "media",
      title: "Excesso de estoque",
      description: `${excesso.value} item(ns) acima do máximo.`,
      kpiId: "supply.excesso",
    });
  }

  const inv = byId.get("supply.inventario");
  if (
    inv?.availability === "available" &&
    inv.value != null &&
    inv.value > 0
  ) {
    alerts.push({
      id: "alert-inventario",
      severity: "alta",
      title: "Divergências de inventário",
      description: `${inv.value} divergência(s) pendente(s).`,
      kpiId: "supply.inventario",
      actionHint: "Conferir e ajustar com auditoria.",
    });
  }

  if (!args.snap.purchaseWorkflowReady) {
    alerts.push({
      id: "alert-compras-schema",
      severity: "baixa",
      title: "Workflow de compras pendente de schema",
      description:
        "Tabelas de pedidos/cotações ainda não aplicadas — aplicar migration 20260813.",
    });
  }

  return alerts;
}

export function dedupeSupplyAlerts(alerts: SupplyAlert[]): SupplyAlert[] {
  const seen = new Set<string>();
  const out: SupplyAlert[] = [];
  for (const a of alerts) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}
