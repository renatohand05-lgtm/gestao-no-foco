import type { ProductCapability } from "./capabilities.ts";
import type { ResolvedSegmentContext } from "./types.ts";
import { hasCapability } from "./resolve.ts";

/** Nav item id → capability de relevância. Ausente = sempre visível (ainda sujeito a RBAC). */
export const NAV_ITEM_CAPABILITY: Record<string, ProductCapability> = {
  "ops-center": "operations_board",
  crm: "crm",
  clients: "customers",
  products: "catalog",
  inventory: "inventory",
  purchases: "purchases",
  sales: "sales",
  "work-orders": "work_orders",
  agenda: "appointments",
  mechanics: "workshop_mechanics",
  finance: "financial_management",
};

function isRecommendedNavItem(
  itemId: string,
  ctx: ResolvedSegmentContext,
): boolean {
  return Boolean(ctx.profile?.recommendedNavIds.includes(itemId));
}

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
  const cap = NAV_ITEM_CAPABILITY[itemId];
  if (cap && hasCapability(ctx, cap)) return true;
  // Preset inteligente: atalho sem capability 1:1 (ex.: equipe da barbearia).
  if (isRecommendedNavItem(itemId, ctx)) return true;
  if (!cap) return true;
  return false;
}
