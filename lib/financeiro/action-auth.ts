/**
 * Sprint 33.0 — Auth de server actions do financeiro clássico.
 * Páginas já usam requireFinancePagePermission; actions só tinham requireTenant.
 */
import { requireFinancePagePermission } from "@/lib/finance/page-auth";
import type { FinancePermission } from "@/lib/finance/shared/types";

export async function requireFinanceiroAction(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[],
) {
  const { tenant } = await requireFinancePagePermission(tenantSlug, required);
  return tenant;
}
