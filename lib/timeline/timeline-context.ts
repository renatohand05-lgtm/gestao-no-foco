/**
 * Sprint 21.8 — Contexto da Timeline (EnterpriseContext + RBAC).
 */

import type { EnterpriseContext } from "../enterprise/types.ts";

export type TimelineAuthorizationSnapshot = {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
};

export const TIMELINE_READ_PERMISSIONS = [
  "auditoria.visualizar",
  "auditoria.read",
] as const;

export function hasTimelineReadPermission(
  snapshot: TimelineAuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  const perms = snapshot?.permissions?.length
    ? snapshot.permissions
    : context.permissions;
  return TIMELINE_READ_PERMISSIONS.some((p) => perms.includes(p));
}

export function mergeTimelineContext(
  context: EnterpriseContext,
  snapshot: TimelineAuthorizationSnapshot | null | undefined,
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
