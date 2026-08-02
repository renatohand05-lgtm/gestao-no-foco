/**
 * Camada centralizada de autorização oficina (Sprint 29.2).
 * Request-scoped via React.cache — sem TTL cross-request.
 * Não altera DEFAULT_ROLE_PERMISSIONS nem seeds.
 */

import { cache } from "react";

import type { TenantRole } from "@/lib/constants";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";

/**
 * Mapa completo de permissões do papel — 1 query / (tenantId, role) / request.
 */
export const loadPermissionMap = cache(
  async (
    tenantId: string,
    role: TenantRole,
  ): Promise<Record<PermissionKey, boolean>> => {
    const service = await createPermissionService(tenantId, role);
    return service.loadRolePermissions();
  },
);

/**
 * Subconjunto tipado a partir do mapa em cache (0 queries extras na request).
 */
export async function resolvePermissions(
  tenantId: string,
  role: TenantRole,
  keys: readonly PermissionKey[],
): Promise<Record<PermissionKey, boolean>> {
  const map = await loadPermissionMap(tenantId, role);
  const out = {} as Record<PermissionKey, boolean>;
  for (const key of keys) {
    out[key] = map[key] ?? false;
  }
  return out;
}

/**
 * Padrão das pages: tenta DB; em falha mantém DEFAULT_ROLE_PERMISSIONS.
 */
export async function tryResolvePermissions(
  tenantId: string,
  role: TenantRole,
  keys: readonly PermissionKey[],
): Promise<Record<PermissionKey, boolean>> {
  const fallback = {} as Record<PermissionKey, boolean>;
  for (const key of keys) {
    fallback[key] = DEFAULT_ROLE_PERMISSIONS[role][key] ?? false;
  }
  try {
    return await resolvePermissions(tenantId, role, keys);
  } catch {
    return fallback;
  }
}

export async function getPermission(
  tenantId: string,
  role: TenantRole,
  key: PermissionKey,
): Promise<boolean> {
  const map = await loadPermissionMap(tenantId, role);
  return map[key] ?? false;
}

export async function requirePermissionKeys(
  tenantId: string,
  role: TenantRole,
  keys: readonly PermissionKey[],
  message?: string,
): Promise<Record<PermissionKey, boolean>> {
  const map = await resolvePermissions(tenantId, role, keys);
  const missing = keys.filter((k) => !map[k]);
  if (missing.length > 0) {
    throw new Error(
      message ?? `Sem permissão para esta operação (${missing.join(", ")}).`,
    );
  }
  return map;
}
