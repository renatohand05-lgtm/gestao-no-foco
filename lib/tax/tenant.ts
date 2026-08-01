/**
 * Sprint 26.8 — Helpers de isolamento tenant.
 */

export function assertSameTenant(
  rowTenantId: string,
  expectedTenantId: string,
): boolean {
  return rowTenantId === expectedTenantId;
}

export function filterByTenant<T extends { tenantId: string }>(
  rows: T[],
  tenantId: string,
): T[] {
  return rows.filter((r) => assertSameTenant(r.tenantId, tenantId));
}

export function denyCrossTenantWrite(
  rowTenantId: string,
  actorTenantId: string,
): { ok: true } | { ok: false; code: "TENANT_MISMATCH" } {
  if (!assertSameTenant(rowTenantId, actorTenantId)) {
    return { ok: false, code: "TENANT_MISMATCH" };
  }
  return { ok: true };
}
