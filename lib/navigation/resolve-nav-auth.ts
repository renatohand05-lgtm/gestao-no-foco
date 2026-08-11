import { cache } from "react";

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { resolveNavPermissions } from "@/lib/navigation/filter-nav-by-permissions";
import { createClient } from "@/lib/supabase/server";
import type { TenantWithRole } from "@/types";

export const resolveTenantNavPermissions = cache(
  async (tenant: TenantWithRole): Promise<string[]> => {
    const profile = await getCurrentProfile();
    let snapshotRoles: string[] = [];
    let snapshotPermissions: string[] = [];

    if (profile?.id) {
      try {
        const client = await createClient();
        const rbac = createRbacSupabaseAdapter(client);
        const snap = await rbac.resolveAuthorizationSnapshot(
          tenant.id,
          profile.id,
        );
        snapshotRoles = snap.roles ?? [];
        snapshotPermissions = snap.permissions ?? [];
      } catch {
        /* membership catalog below */
      }
    }

    return resolveNavPermissions({
      membershipRole: tenant.role,
      snapshotRoles,
      snapshotPermissions,
    });
  },
);
