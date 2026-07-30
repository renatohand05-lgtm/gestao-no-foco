/**
 * Sprint 22.6 — Adapter Supabase dos itens de run (`import_run_items`),
 * base do rollback.
 */
import { mapKeysCamelToSnake, mapKeysSnakeToCamel } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "../../enterprise/adapters/supabase-helpers.ts";
import type { AppendImportRunItemInput, ImportRunItemsStore } from "../history/run-items-store.ts";
import type { ImportRunItem } from "../types/index.ts";

export function createSupabaseRunItemsStore(
  client: EnterpriseSupabaseClient,
): ImportRunItemsStore {
  return {
    async appendMany(items: AppendImportRunItemInput[]) {
      if (!items.length) return [];
      const rows = items.map((it) =>
        mapKeysCamelToSnake({
          tenantId: it.tenantId,
          runId: it.runId,
          rowNumber: it.rowNumber,
          targetType: it.targetType,
          targetId: it.targetId,
          operation: it.operation ?? "create",
          payloadSnapshot: it.payloadSnapshot ?? null,
          rollbackStatus: it.rollbackStatus ?? "pending",
        }),
      );
      const { data, error } = await enterpriseFrom(client, "import_run_items")
        .insert(rows)
        .select("*");
      throwIfError(error, "import.runItems.appendMany");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<ImportRunItem>(r),
      );
    },

    async listByRun(tenantId, runId) {
      const { data, error } = await enterpriseFrom(client, "import_run_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("run_id", runId)
        .order("row_number", { ascending: true });
      throwIfError(error, "import.runItems.listByRun");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<ImportRunItem>(r),
      );
    },

    async markReverted(tenantId, runId, targetIds) {
      if (!targetIds.length) return;
      const { error } = await enterpriseFrom(client, "import_run_items")
        .update({ rollback_status: "reverted" })
        .eq("tenant_id", tenantId)
        .eq("run_id", runId)
        .in("target_id", targetIds);
      throwIfError(error, "import.runItems.markReverted");
    },
  };
}
