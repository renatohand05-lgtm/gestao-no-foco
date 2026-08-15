import type { ProductCapability } from "./capabilities.ts";
import { ESSENTIAL_NAV_IDS } from "./capabilities.ts";
import type { ResolvedSegmentContext } from "./types.ts";
import { hasCapability } from "./resolve.ts";

/** Nav item id → capabilities de relevância (any-of). Ausente = sempre visível (RBAC). */
export const NAV_ITEM_CAPABILITY: Record<string, ProductCapability | ProductCapability[]> =
  {
    "ops-center": "operations_board",
    crm: "crm",
    clients: "customers",
    products: "catalog",
    inventory: "inventory",
    purchases: "purchases",
    sales: "sales",
    "work-orders": "work_orders",
    agenda: "appointments",
    mechanics: ["workshop_mechanics", "professionals"],
    finance: "financial_management",
    integrations: "integrations",
    analytics: "analytics",
    "analytics-reports": "reports",
    "intelligence-hub": "analytics",
    "tax-hub": "tax",
  };

const ESSENTIAL = new Set<string>(ESSENTIAL_NAV_IDS);

export function filterNavByCapabilities<T extends { id: string }>(
  items: T[],
  ctx: ResolvedSegmentContext,
): T[] {
  if (!ctx.usesCapabilityEngine) return items;
  return items.filter((item) => isNavItemRelevant(item.id, ctx));
}

export function isNavItemRelevant(
  itemId: string,
  ctx: ResolvedSegmentContext,
): boolean {
  if (!ctx.usesCapabilityEngine) return true;
  if (ESSENTIAL.has(itemId)) return true;
  const mapped = NAV_ITEM_CAPABILITY[itemId];
  if (!mapped) return true;
  const caps = Array.isArray(mapped) ? mapped : [mapped];
  return caps.some((c) => hasCapability(ctx, c));
}
