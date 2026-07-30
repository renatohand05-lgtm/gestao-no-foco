/**
 * Sprint 22.6 — Adapter Supabase do histórico de importações (`import_runs`).
 * Mesma interface `ImportHistoryStore` usada pela store em memória — a
 * engine e os adapters de módulo não precisam saber qual está em uso.
 */
import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
  type LooseQuery,
} from "../../enterprise/adapters/supabase-helpers.ts";
import type {
  ImportHistoryListPageOptions,
  ImportHistoryListPageResult,
  ImportHistoryStore,
} from "../history/import-history-store.ts";
import type { ImportHistoryEntry } from "../types/index.ts";

export function createSupabaseHistoryStore(
  client: EnterpriseSupabaseClient,
): ImportHistoryStore {
  return {
    async list(tenantId, module, limit = 20) {
      let query: LooseQuery = enterpriseFrom(client, "import_runs")
        .select("*")
        .eq("tenant_id", tenantId);
      if (module) query = query.eq("module", module);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(limit);
      throwIfError(error, "import.history.list");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<ImportHistoryEntry>(r),
      );
    },

    async append(entry) {
      const row = mapKeysCamelToSnake({
        id: entry.id,
        tenantId: entry.tenantId,
        userId: entry.userId,
        userLabel: entry.userLabel,
        module: entry.module,
        targetEntity: entry.targetEntity ?? "",
        fileName: entry.fileName,
        format: entry.format,
        origin: entry.origin ?? "upload",
        status: entry.status,
        totalRows: entry.totalRows,
        importedRows: entry.importedRows,
        rejectedRows: entry.rejectedRows,
        errorCount: entry.errorCount,
        durationMs: entry.durationMs,
        mappingSnapshot: entry.mappingSnapshot ?? {},
        errorsSample: entry.errorsSample ?? [],
        profileId: entry.profileId ?? null,
        profileName: entry.profileName ?? null,
        engineVersion: entry.engineVersion ?? "22.6",
        correlationId: entry.correlationId ?? null,
        rolledBackAt: entry.rolledBackAt ?? null,
        createdAt: entry.createdAt ?? nowIso(),
      });
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "import.history.append");
      return mapKeysSnakeToCamel<ImportHistoryEntry>(data);
    },

    async getById(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "import.history.getById");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },

    async listPage(
      tenantId,
      options: ImportHistoryListPageOptions = {},
    ): Promise<ImportHistoryListPageResult> {
      let query: LooseQuery = enterpriseFrom(client, "import_runs")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId);
      if (options.module) query = query.eq("module", options.module);
      if (options.status) query = query.eq("status", options.status);
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      throwIfError(error, "import.history.listPage");
      return {
        items: (data ?? []).map((r: Record<string, unknown>) =>
          mapKeysSnakeToCamel<ImportHistoryEntry>(r),
        ),
        total: count ?? 0,
      };
    },

    async markRolledBack(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .update({ status: "rolled_back", rolled_back_at: nowIso() })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      throwIfError(error, "import.history.markRolledBack");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },

    async archive(tenantId: string, id: string, userId: string, reason: string) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .update({
          archived_at: nowIso(),
          archived_by: userId,
          delete_reason: reason,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .select("*")
        .maybeSingle();
      throwIfError(error, "import.history.archive");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },

    async restoreArchive(tenantId: string, id: string) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .update({
          archived_at: null,
          archived_by: null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      throwIfError(error, "import.history.restoreArchive");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },

    async softDeleteHistory(
      tenantId: string,
      id: string,
      userId: string,
      reason: string,
    ) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .update({
          deleted_at: nowIso(),
          deleted_by: userId,
          delete_reason: reason,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();
      throwIfError(error, "import.history.softDeleteHistory");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },

    async restoreSoftDelete(tenantId: string, id: string) {
      const { data, error } = await enterpriseFrom(client, "import_runs")
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      throwIfError(error, "import.history.restoreSoftDelete");
      return data ? mapKeysSnakeToCamel<ImportHistoryEntry>(data) : null;
    },
  };
}
