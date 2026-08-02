import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantRole } from "@/lib/constants";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissoes/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

function defaultsForRole(role: TenantRole): Record<PermissionKey, boolean> {
  return { ...DEFAULT_ROLE_PERMISSIONS[role] };
}

function isPermissionKey(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

/**
 * Serviço de permissões oficina (tenant_role_permissions).
 * Sprint 29.2: 1 query por role/request via mapa em memória na instância.
 */
export class PermissionService {
  private roleMap: Record<PermissionKey, boolean> | null = null;

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly role: TenantRole,
  ) {}

  /**
   * Carrega todas as permissões do papel em uma única query e mescla com
   * DEFAULT_ROLE_PERMISSIONS (mesmo fallback de `has` por chave).
   */
  async loadRolePermissions(): Promise<Record<PermissionKey, boolean>> {
    if (this.roleMap) return this.roleMap;

    const fallback = defaultsForRole(this.role);
    const { data, error } = await this.supabase
      .from("tenant_role_permissions")
      .select("permission_key, allowed")
      .eq("tenant_id", this.tenantId)
      .eq("role", this.role);

    if (error || !data) {
      this.roleMap = fallback;
      return this.roleMap;
    }

    const map = defaultsForRole(this.role);
    for (const row of data) {
      const key = row.permission_key;
      if (typeof key === "string" && isPermissionKey(key)) {
        map[key] = Boolean(row.allowed);
      }
    }
    this.roleMap = map;
    return this.roleMap;
  }

  async has(key: PermissionKey): Promise<boolean> {
    const map = await this.loadRolePermissions();
    return map[key] ?? false;
  }

  /**
   * Batch: uma carga de role (ou reutiliza mapa) → N booleans.
   * Semântica idêntica a N× `has` com fallback DEFAULT.
   */
  async hasMany(
    keys: readonly PermissionKey[],
  ): Promise<Record<PermissionKey, boolean>> {
    const map = await this.loadRolePermissions();
    const out = {} as Record<PermissionKey, boolean>;
    for (const key of keys) {
      out[key] = map[key] ?? false;
    }
    return out;
  }

  async require(key: PermissionKey, message?: string): Promise<void> {
    const ok = await this.has(key);
    if (!ok) {
      throw new Error(
        message ?? `Sem permissão para esta operação (${key}).`,
      );
    }
  }

  async requireAll(
    keys: readonly PermissionKey[],
    message?: string,
  ): Promise<void> {
    const map = await this.hasMany(keys);
    const missing = keys.filter((k) => !map[k]);
    if (missing.length > 0) {
      throw new Error(
        message ??
          `Sem permissão para esta operação (${missing.join(", ")}).`,
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
