import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantRole } from "@/lib/constants";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissoes/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export class PermissionService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly role: TenantRole,
  ) {}

  async has(key: PermissionKey): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("tenant_role_permissions")
      .select("allowed")
      .eq("tenant_id", this.tenantId)
      .eq("role", this.role)
      .eq("permission_key", key)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_ROLE_PERMISSIONS[this.role][key] ?? false;
    }

    return Boolean(data.allowed);
  }

  async require(key: PermissionKey, message?: string): Promise<void> {
    const ok = await this.has(key);
    if (!ok) {
      throw new Error(
        message ?? `Sem permissão para esta operação (${key}).`,
      );
    }
  }

  async ensureSeeds(): Promise<void> {
    await this.supabase.rpc("seed_role_permissions_padrao", {
      p_tenant_id: this.tenantId,
    });
    await this.supabase.rpc("seed_desconto_alcadas_padrao", {
      p_tenant_id: this.tenantId,
    });
  }
}

export async function createPermissionService(
  tenantId: string,
  role: TenantRole,
) {
  const supabase = await createClient();
  return new PermissionService(supabase, tenantId, role);
}
