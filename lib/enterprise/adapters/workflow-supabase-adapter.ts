/**
 * Sprint 21.6 RC1 — Workflow Supabase Adapter.
 * saveDefinition: RPC atómica (sem upsert PostgREST genérico).
 */

import { EnterprisePersistenceError, toSafeEnterpriseError } from "../errors.ts";
import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../mappers.ts";
import type {
  PersistedWorkflowDefinition,
  PersistedWorkflowHistory,
  PersistedWorkflowInstance,
  WorkflowRepository,
} from "../repositories/contracts.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "./supabase-helpers.ts";

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export function createWorkflowSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): WorkflowRepository {
  const rpcClient = client as unknown as RpcClient;

  return {
    async saveDefinition(def) {
      if (def.tenantId == null) {
        throw new EnterprisePersistenceError(
          "Definições globais não são graváveis via adapter autenticado. Use seed SQL.",
        );
      }
      const { data, error } = await rpcClient.rpc(
        "enterprise_save_workflow_definition",
        {
          p_tenant_id: def.tenantId,
          p_workflow_key: def.workflowKey,
          p_version: def.version,
          p_name: def.name,
          p_definition: def.definition,
          p_description: def.description,
          p_status: def.status,
          p_is_active: def.isActive,
        },
      );
      if (error) {
        throw toSafeEnterpriseError(
          new EnterprisePersistenceError(
            error.message ?? "enterprise_save_workflow_definition failed",
          ),
          "Falha ao gravar workflow definition (RPC).",
        );
      }
      return mapKeysSnakeToCamel<PersistedWorkflowDefinition>(
        data as Record<string, unknown>,
      );
    },
    async getDefinition(tenantId, workflowKey, version = "1.0.0") {
      let q = enterpriseFrom(client, "workflow_definitions")
        .select("*")
        .eq("workflow_key", workflowKey)
        .eq("version", version);
      q = tenantId == null ? q.is("tenant_id", null) : q.eq("tenant_id", tenantId);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "workflow.getDefinition");
      return data
        ? mapKeysSnakeToCamel<PersistedWorkflowDefinition>(data)
        : null;
    },
    async createInstance(instance) {
      const now = nowIso();
      const row = mapKeysCamelToSnake({
        ...instance,
        transitionCount: instance.transitionCount ?? 0,
        createdAt: now,
        updatedAt: now,
      });
      const { data, error } = await enterpriseFrom(client, "workflow_instances")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "workflow.createInstance");
      return mapKeysSnakeToCamel<PersistedWorkflowInstance>(data);
    },
    async getInstance(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "workflow_instances")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "workflow.getInstance");
      return data
        ? mapKeysSnakeToCamel<PersistedWorkflowInstance>(data)
        : null;
    },
    async updateInstance(tenantId, id, patch) {
      const row = mapKeysCamelToSnake({ ...patch, updatedAt: nowIso() });
      delete row.id;
      delete row.tenant_id;
      const { data, error } = await enterpriseFrom(client, "workflow_instances")
        .update(row)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single();
      throwIfError(error, "workflow.updateInstance");
      return mapKeysSnakeToCamel<PersistedWorkflowInstance>(data);
    },
    async appendHistory(entry) {
      const row = mapKeysCamelToSnake({
        ...entry,
        createdAt: nowIso(),
      });
      const { data, error } = await enterpriseFrom(client, "workflow_history")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "workflow.appendHistory");
      return mapKeysSnakeToCamel<PersistedWorkflowHistory>(data);
    },
    async savePendingActions(actions) {
      if (!actions.length) return [];
      const rows = actions.map((a) =>
        mapKeysCamelToSnake({
          ...a,
          workflowInstanceId: a.parentId,
        }),
      );
      const { data, error } = await enterpriseFrom(
        client,
        "workflow_pending_actions",
      )
        .insert(rows)
        .select("*");
      throwIfError(error, "workflow.savePendingActions");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel(r),
      );
    },
    async listInstances(tenantId, options) {
      let q = enterpriseFrom(client, "workflow_instances")
        .select("*")
        .eq("tenant_id", tenantId);
      if (options?.status) q = q.eq("status", options.status);
      const { data, error } = await q.order("created_at", { ascending: false });
      throwIfError(error, "workflow.listInstances");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedWorkflowInstance>(r),
      );
    },
    async listHistory(tenantId, instanceId) {
      const { data, error } = await enterpriseFrom(client, "workflow_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("workflow_instance_id", instanceId)
        .order("created_at", { ascending: true });
      throwIfError(error, "workflow.listHistory");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedWorkflowHistory>(r),
      );
    },
  };
}
