import type { SupabaseClient } from "@supabase/supabase-js";

import { createRbacSupabaseAdapter } from "@/lib/enterprise/adapters/rbac-supabase-adapter";
import type { EnterpriseSupabaseClient } from "@/lib/enterprise/adapters/supabase-helpers";
import type { TenantRole } from "@/lib/constants";
import { PermissionService } from "@/lib/permissoes/permission-service";
import type { PermissionKey } from "@/lib/permissoes/constants";
import type { Database } from "@/types/database";

export async function resolveMobilePermissions(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userId: string,
  role: TenantRole,
): Promise<{ permissions: string[]; role: string }> {
  try {
    const adapter = createRbacSupabaseAdapter(
      supabase as unknown as EnterpriseSupabaseClient,
    );
    const snapshot = await adapter.resolveAuthorizationSnapshot(tenantId, userId);
    if (snapshot.permissions.length > 0) {
      return {
        permissions: snapshot.permissions,
        role: snapshot.roles[0] ?? role,
      };
    }
  } catch {
    // fallback abaixo
  }

  const service = new PermissionService(supabase, tenantId, role);
  const map = await service.loadRolePermissions();
  const permissions = (Object.entries(map) as [PermissionKey, boolean][])
    .filter(([, allowed]) => allowed)
    .map(([key]) => key);

  return { permissions, role };
}
