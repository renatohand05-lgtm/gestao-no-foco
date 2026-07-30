/**
 * Fase 25 — Orchestrator Supply Chain Enterprise.
 */

import { getSupplyFeatureFlags } from "../supply-feature-flags.ts";
import { buildSupplyAlerts, dedupeSupplyAlerts } from "./alert-engine.ts";
import { describeSupplyIntegrationArchitecture } from "./integration-bridges.ts";
import {
  buildSupplyKpiDrillDownFromSnapshot,
  resolveSupplyCatalogKpis,
} from "./kpi-engine.ts";
import { resolveSupplyProvider } from "./supply-ai-provider.ts";
import type { SupplyEnterpriseSnapshot, SupplyKpiId } from "./types.ts";

export function buildExecutiveSupplyBundle(args: {
  snap: SupplyEnterpriseSnapshot;
  permissions?: readonly string[];
}) {
  const flags = getSupplyFeatureFlags();
  const kpis = resolveSupplyCatalogKpis(args.snap);
  const alerts = dedupeSupplyAlerts(
    buildSupplyAlerts({ snap: args.snap, kpis }),
  );
  const provider = resolveSupplyProvider();
  const insights = provider.explain({
    kpis,
    alerts,
    snap: args.snap,
  });

  const priority: SupplyKpiId[] = [
    "supply.valorizacao",
    "supply.ruptura",
    "supply.cobertura",
    "supply.giro",
    "supply.parado",
    "supply.excesso",
    "supply.compras_mes",
    "supply.consumo",
    "supply.margem",
    "supply.custo_medio",
    "supply.fornecedores",
    "supply.perdas",
    "supply.inventario",
    "supply.curva_abc",
  ];

  const highlighted = priority
    .map((id) => kpis.find((k) => k.definitionId === id))
    .filter(Boolean);

  return {
    version: "25.0" as const,
    context: {
      tenantId: args.snap.tenantId,
      tenantSlug: args.snap.tenantSlug,
      asOf: args.snap.asOf,
      empresaId: args.snap.empresaId ?? null,
      filialId: args.snap.filialId ?? null,
      permissions: args.permissions ?? [],
      warehouseReady: args.snap.warehouseReady,
      purchaseWorkflowReady: args.snap.purchaseWorkflowReady,
    },
    kpis,
    highlighted,
    alerts,
    insights,
    purchases: args.snap.purchases,
    inventory: args.snap.inventory,
    productsCount: args.snap.products.length,
    provider: {
      id: provider.id,
      kind: provider.kind,
      label: provider.label,
    },
    flags,
    integrations: describeSupplyIntegrationArchitecture(),
    health: args.snap.health,
    updatedAt: args.snap.asOf,
  };
}

export type ExecutiveSupplyBundle = ReturnType<typeof buildExecutiveSupplyBundle>;

export function supplyEnterpriseDrillDown(
  snap: SupplyEnterpriseSnapshot,
  definitionId: SupplyKpiId,
) {
  return buildSupplyKpiDrillDownFromSnapshot(snap, definitionId);
}
