/**
 * Sprint 22.6 — Adapter Supabase dos perfis de mapeamento (`import_profiles`).
 */
import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "../../enterprise/adapters/supabase-helpers.ts";
import type { ImportMappingStore, SaveImportMappingInput } from "../mapping/mapping-store.ts";
import type { ImportMappingProfile } from "../types/index.ts";

export function createSupabaseMappingStore(
  client: EnterpriseSupabaseClient,
): ImportMappingStore {
  return {
    async list(tenantId, module) {
      const { data, error } = await enterpriseFrom(client, "import_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", module)
        .order("updated_at", { ascending: false });
      throwIfError(error, "import.mapping.list");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<ImportMappingProfile>(r),
      );
    },

    async getDefault(tenantId, module, targetEntity) {
      const { data, error } = await enterpriseFrom(client, "import_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", module)
        .eq("target_entity", targetEntity)
        .eq("is_default", true)
        .maybeSingle();
      throwIfError(error, "import.mapping.getDefault");
      if (data) return mapKeysSnakeToCamel<ImportMappingProfile>(data);

      const { data: fallback, error: fallbackError } = await enterpriseFrom(
        client,
        "import_profiles",
      )
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", module)
        .eq("target_entity", targetEntity)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      throwIfError(fallbackError, "import.mapping.getDefault.fallback");
      return fallback ? mapKeysSnakeToCamel<ImportMappingProfile>(fallback) : null;
    },

    async getById(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "import_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "import.mapping.getById");
      return data ? mapKeysSnakeToCamel<ImportMappingProfile>(data) : null;
    },

    async save(input: SaveImportMappingInput) {
      const now = nowIso();
      if (input.makeDefault) {
        const { error: unsetError } = await enterpriseFrom(client, "import_profiles")
          .update({ is_default: false })
          .eq("tenant_id", input.tenantId)
          .eq("module", input.module)
          .eq("target_entity", input.targetEntity);
        throwIfError(unsetError, "import.mapping.save.unsetDefault");
      }
      const row = mapKeysCamelToSnake({
        tenantId: input.tenantId,
        module: input.module,
        targetEntity: input.targetEntity,
        name: input.name,
        description: input.description ?? null,
        format: input.format ?? null,
        mapping: input.mapping,
        transformations: input.transformations ?? {},
        normalizations: input.normalizations ?? {},
        rules: input.rules ?? {},
        isDefault: input.makeDefault ?? false,
        createdBy: input.createdBy ?? null,
        updatedAt: now,
      });
      const { data, error } = await enterpriseFrom(client, "import_profiles")
        .upsert(row, { onConflict: "tenant_id,module,target_entity,name" })
        .select("*")
        .single();
      throwIfError(error, "import.mapping.save");
      return mapKeysSnakeToCamel<ImportMappingProfile>(data);
    },

    async duplicate(tenantId, id, name) {
      const original = await this.getById(tenantId, id);
      if (!original) {
        throw new Error("Perfil de mapeamento não encontrado.");
      }
      const row = mapKeysCamelToSnake({
        tenantId,
        module: original.module,
        targetEntity: original.targetEntity,
        name,
        description: original.description ?? null,
        format: original.format ?? null,
        mapping: original.mapping,
        transformations: original.transformations ?? {},
        normalizations: original.normalizations ?? {},
        rules: original.rules ?? {},
        isDefault: false,
      });
      const { data, error } = await enterpriseFrom(client, "import_profiles")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "import.mapping.duplicate");
      return mapKeysSnakeToCamel<ImportMappingProfile>(data);
    },

    async remove(tenantId, id) {
      const { error } = await enterpriseFrom(client, "import_profiles")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id);
      throwIfError(error, "import.mapping.remove");
    },

    async touchUsage(tenantId, id) {
      const existing = await this.getById(tenantId, id);
      if (!existing) return;
      const { error } = await enterpriseFrom(client, "import_profiles")
        .update({
          import_count: (existing.importCount ?? 0) + 1,
          last_used_at: nowIso(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", id);
      throwIfError(error, "import.mapping.touchUsage");
    },
  };
}
