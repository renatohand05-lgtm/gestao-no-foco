/**
 * Sprint 35.1 — Relevância das abas/atalhos mobile (puro).
 * RBAC continua soberano no cliente e nas APIs.
 */
import type { ProductCapability } from "./capabilities.ts";
import { hasCapability, type ResolveSegmentInput, resolveSegmentContext } from "./resolve.ts";

export type MobileTabId =
  | "dashboard"
  | "intelligence"
  | "crm"
  | "stock"
  | "ops"
  | "finance";

const TAB_CAPS: Record<MobileTabId, ProductCapability | ProductCapability[] | null> = {
  dashboard: null,
  intelligence: "analytics",
  crm: "crm",
  stock: "inventory",
  ops: ["operations_board", "appointments", "work_orders"],
  finance: "financial_management",
};

export type MobileModuleFlags = Record<MobileTabId, boolean>;

export function resolveMobileModuleFlags(
  input: ResolveSegmentInput,
): MobileModuleFlags {
  const ctx = resolveSegmentContext(input);
  const flags = {} as MobileModuleFlags;
  for (const tab of Object.keys(TAB_CAPS) as MobileTabId[]) {
    const mapped = TAB_CAPS[tab];
    if (!mapped) {
      flags[tab] = true;
      continue;
    }
    const caps = Array.isArray(mapped) ? mapped : [mapped];
    flags[tab] = caps.some((c) => hasCapability(ctx, c));
  }
  return flags;
}

export const OPS_ACTION_CAPABILITY: Record<string, ProductCapability | ProductCapability[]> = {
  ordens: "work_orders",
  agenda: "appointments",
  equipe: ["workshop_mechanics", "professionals"],
  veiculos: "vehicles",
  clientes: "customers",
};

export function isOpsActionRelevant(
  actionId: string,
  input: ResolveSegmentInput,
): boolean {
  const mapped = OPS_ACTION_CAPABILITY[actionId];
  if (!mapped) return true;
  const ctx = resolveSegmentContext(input);
  const caps = Array.isArray(mapped) ? mapped : [mapped];
  return caps.some((c) => hasCapability(ctx, c));
}
