/**
 * Sprint 35.1 — Relevância de cards/atalhos do dashboard.
 * Não inventa KPI; só esconde superfície incompatível quando o motor está ligado.
 */
import {
  hasCapability,
  resolveSegmentContext,
  type ResolveSegmentInput,
} from "./resolve.ts";

export type SegmentDashboardFlags = {
  engine: boolean;
  workOrders: boolean;
  inventory: boolean;
  purchases: boolean;
  vehicles: boolean;
};

export function segmentDashboardFlags(
  input: ResolveSegmentInput,
): SegmentDashboardFlags {
  const ctx = resolveSegmentContext(input);
  if (!ctx.usesCapabilityEngine) {
    return {
      engine: false,
      workOrders: true,
      inventory: true,
      purchases: true,
      vehicles: true,
    };
  }
  return {
    engine: true,
    workOrders: hasCapability(ctx, "work_orders"),
    inventory: hasCapability(ctx, "inventory"),
    purchases: hasCapability(ctx, "purchases"),
    vehicles: hasCapability(ctx, "vehicles"),
  };
}

export function isDashboardSurfaceRelevant(
  id: string,
  flags: SegmentDashboardFlags,
): boolean {
  if (id === "ordens" || id === "pedidos" || id === "os" || id === "nova-os") {
    return flags.workOrders;
  }
  if (id === "estoque") return flags.inventory;
  if (id === "compra") return flags.purchases;
  if (id === "novo-veiculo" || id === "veiculos") return flags.vehicles;
  return true;
}

export function filterDashboardSurface<T extends { id: string }>(
  items: T[],
  input: ResolveSegmentInput,
): T[] {
  const flags = segmentDashboardFlags(input);
  return items.filter((item) => isDashboardSurfaceRelevant(item.id, flags));
}
