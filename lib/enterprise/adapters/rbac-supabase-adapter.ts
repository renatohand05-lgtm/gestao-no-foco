/**
 * Sprint 21.6 — RBAC Supabase Adapter.
 */

import { mapKeysSnakeToCamel } from "../mappers.ts";
import type {
  AuthorizationSnapshot,
  PersistedTenantRole,
  RbacRepository,
} from "../repositories/contracts.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "./supabase-helpers.ts";

export function createRbacSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): RbacRepository {
  return {
    async listRoles(tenantId) {
      const { data, error } = await enterpriseFrom(client, "tenant_roles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      throwIfError(error, "rbac.listRoles");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedTenantRole>(r),
      );
    },
    async getUserRoles(tenantId, userId) {
      const { data, error } = await enterpriseFrom(client, "tenant_user_roles")
        .select("role_id, tenant_roles(role_key)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      throwIfError(error, "rbac.getUserRoles");
      return (data ?? [])
        .map((r: { tenant_roles?: { role_key?: string } | null }) =>
          r.tenant_roles?.role_key,
        )
        .filter(Boolean) as string[];
    },
    async getRolePermissions(tenantId, roleId) {
      const { data, error } = await enterpriseFrom(
        client,
        "tenant_rbac_role_permissions",
      )
        .select("permission_key")
        .eq("tenant_id", tenantId)
        .eq("role_id", roleId)
        .eq("effect", "allow");
      throwIfError(error, "rbac.getRolePermissions");
      return (data ?? []).map(
        (r: { permission_key: string }) => r.permission_key,
      );
    },
    async getUserOverrides(tenantId, userId) {
      const { data, error } = await enterpriseFrom(
        client,
        "tenant_user_permission_overrides",
      )
        .select("permission_key, effect")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      throwIfError(error, "rbac.getUserOverrides");
      return (data ?? []).map(
        (r: { permission_key: string; effect: string }) => ({
          permissionKey: r.permission_key,
          effect: r.effect,
        }),
      );
    },
    async resolveAuthorizationSnapshot(
      tenantId,
      userId,
    ): Promise<AuthorizationSnapshot> {
      const roles = await this.getUserRoles(tenantId, userId);
      const { data: roleRows, error } = await enterpriseFrom(
        client,
        "tenant_user_roles",
      )
        .select("role_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);
      throwIfError(error, "rbac.resolve.roles");
      const permissions = new Set<string>();
      for (const row of roleRows ?? []) {
        for (const p of await this.getRolePermissions(tenantId, row.role_id)) {
          permissions.add(p);
        }
      }
      const overrides = await this.getUserOverrides(tenantId, userId);
      for (const o of overrides) {
        if (o.effect === "deny") permissions.delete(o.permissionKey);
        if (o.effect === "allow") permissions.add(o.permissionKey);
      }
      return {
        tenantId,
        userId,
        roles,
        permissions: [...permissions].sort(),
        overrides,
      };
    },
  };
}
