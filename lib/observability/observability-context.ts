/**
 * Sprint 21.9 — Contexto / RBAC Observability.
 * Reutiliza permissões de auditoria (sem migration / seed novo).
 */

import type { EnterpriseContext } from "../enterprise/types.ts";

export type ObservabilityAuthorizationSnapshot = {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
};

export const OBSERVABILITY_READ_PERMISSIONS = [
  "auditoria.visualizar",
  "auditoria.read",
  "observabilidade.visualizar",
] as const;

export function hasObservabilityReadPermission(
  snapshot: ObservabilityAuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  const perms = snapshot?.permissions?.length
    ? snapshot.permissions
    : context.permissions;
  return OBSERVABILITY_READ_PERMISSIONS.some((p) => perms.includes(p));
}

export function mergeObservabilityContext(
  context: EnterpriseContext,
  snapshot: ObservabilityAuthorizationSnapshot | null | undefined,
): EnterpriseContext {
  if (!snapshot) return context;
  return {
    ...context,
    roles: snapshot.roles.length ? snapshot.roles : context.roles,
    permissions: snapshot.permissions.length
      ? snapshot.permissions
      : context.permissions,
  };
}
