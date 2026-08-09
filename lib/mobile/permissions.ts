import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantRole } from "@/lib/constants";
import { createRbacSupabaseAdapter } from "@/lib/enterprise/adapters/rbac-supabase-adapter";
import type { EnterpriseSupabaseClient } from "@/lib/enterprise/adapters/supabase-helpers";
import {
  mergeMobileEffectivePermissions,
} from "@/lib/mobile/effective-permissions";
import type { PermissionKey } from "@/lib/permissoes/constants";
import { PermissionService } from "@/lib/permissoes/permission-service";
import type { Database } from "@/types/database";

export {
  mergeMobileEffectivePermissions,
  type MobileEffectivePermissions,
  type MobileEffectivePermissionsInput,
} from "@/lib/mobile/effective-permissions";

async function loadLegacyPermissionKeys(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  role: TenantRole,
): Promise<string[]> {
  const service = new PermissionService(supabase, tenantId, role);
  const map = await service.loadRolePermissions();
  return (Object.entries(map) as [PermissionKey, boolean][])
    .filter(([, allowed]) => allowed)
    .map(([key]) => key);
}

export async function resolveMobilePermissions(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userId: string,
  role: TenantRole,
): Promise<{ permissions: string[]; role: string }> {
  let snapshotRoles: string[] = [];
  let snapshotPermissions: string[] = [];

  try {
    const adapter = createRbacSupabaseAdapter(
      supabase as unknown as EnterpriseSupabaseClient,
    );
    const snapshot = await adapter.resolveAuthorizationSnapshot(tenantId, userId);
    snapshotRoles = snapshot.roles;
    snapshotPermissions = snapshot.permissions;
  } catch {
    // continua com legado / bridges
  }

  let legacyPermissions: string[] = [];
  try {
    legacyPermissions = await loadLegacyPermissionKeys(supabase, tenantId, role);
  } catch {
    // snapshot-only
  }

  const merged = mergeMobileEffectivePermissions({
    membershipRole: role,
    snapshotRoles,
    snapshotPermissions,
    legacyPermissions,
  });

  return {
    permissions: merged.permissions,
    role: merged.roles[0] ?? role,
  };
}
