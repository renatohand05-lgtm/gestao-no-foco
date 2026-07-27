/**
 * Sprint 21.6 RC1 — Approval Supabase Adapter.
 * saveDefinition: RPC atómica (sem upsert PostgREST genérico).
 */

import { EnterprisePersistenceError, toSafeEnterpriseError } from "../errors.ts";
import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../mappers.ts";
import type {
  ApprovalRepository,
  PersistedApprovalDecision,
  PersistedApprovalDefinition,
  PersistedApprovalHistory,
  PersistedApprovalRequest,
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

export function createApprovalSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): ApprovalRepository {
  const rpcClient = client as unknown as RpcClient;

  return {
    async saveDefinition(def) {
      if (def.tenantId == null) {
        throw new EnterprisePersistenceError(
          "Definições globais não são graváveis via adapter autenticado. Use seed SQL.",
        );
      }
      const { data, error } = await rpcClient.rpc(
        "enterprise_save_approval_definition",
        {
          p_tenant_id: def.tenantId,
          p_approval_key: def.approvalKey,
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
            error.message ?? "enterprise_save_approval_definition failed",
          ),
          "Falha ao gravar approval definition (RPC).",
        );
      }
      return mapKeysSnakeToCamel<PersistedApprovalDefinition>(
        data as Record<string, unknown>,
      );
    },
    async createRequest(req) {
      const now = nowIso();
      const row = mapKeysCamelToSnake({
        ...req,
        createdAt: req.createdAt ?? now,
        updatedAt: req.updatedAt ?? now,
      });
      const { data, error } = await enterpriseFrom(client, "approval_requests")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "approval.createRequest");
      return mapKeysSnakeToCamel<PersistedApprovalRequest>(data);
    },
    async getRequest(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "approval_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "approval.getRequest");
      return data ? mapKeysSnakeToCamel<PersistedApprovalRequest>(data) : null;
    },
    async updateRequest(tenantId, id, patch) {
      const row = mapKeysCamelToSnake({ ...patch, updatedAt: nowIso() });
      delete row.id;
      delete row.tenant_id;
      const { data, error } = await enterpriseFrom(client, "approval_requests")
        .update(row)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single();
      throwIfError(error, "approval.updateRequest");
      return mapKeysSnakeToCamel<PersistedApprovalRequest>(data);
    },
    async appendDecision(decision) {
      const row = mapKeysCamelToSnake({
        ...decision,
        createdAt: nowIso(),
      });
      const { data, error } = await enterpriseFrom(client, "approval_decisions")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "approval.appendDecision");
      return mapKeysSnakeToCamel<PersistedApprovalDecision>(data);
    },
    async appendHistory(entry) {
      const row = mapKeysCamelToSnake({
        ...entry,
        createdAt: nowIso(),
      });
      const { data, error } = await enterpriseFrom(client, "approval_history")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "approval.appendHistory");
      return mapKeysSnakeToCamel<PersistedApprovalHistory>(data);
    },
    async savePendingActions(actions) {
      if (!actions.length) return [];
      const rows = actions.map((a) =>
        mapKeysCamelToSnake({
          ...a,
          approvalRequestId: a.parentId,
        }),
      );
      const { data, error } = await enterpriseFrom(
        client,
        "approval_pending_actions",
      )
        .insert(rows)
        .select("*");
      throwIfError(error, "approval.savePendingActions");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel(r),
      );
    },
    async listDecisions(tenantId, requestId) {
      const { data, error } = await enterpriseFrom(client, "approval_decisions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("approval_request_id", requestId)
        .order("created_at", { ascending: true });
      throwIfError(error, "approval.listDecisions");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedApprovalDecision>(r),
      );
    },
  };
}
