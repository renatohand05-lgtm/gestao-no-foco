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
  ApprovalListRequestsQuery,
  ApprovalListRequestsResult,
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

const MAX_LIST_LIMIT = 100;

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
    async getDefinition(tenantId, approvalKey, version = "1.0.0") {
      let q = enterpriseFrom(client, "approval_definitions")
        .select("*")
        .eq("approval_key", approvalKey)
        .eq("version", version)
        .eq("is_active", true);
      q =
        tenantId == null ? q.is("tenant_id", null) : q.eq("tenant_id", tenantId);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "approval.getDefinition");
      if (data) {
        return mapKeysSnakeToCamel<PersistedApprovalDefinition>(data);
      }
      if (tenantId != null) {
        const { data: globalDef, error: globalErr } = await enterpriseFrom(
          client,
          "approval_definitions",
        )
          .select("*")
          .eq("approval_key", approvalKey)
          .eq("version", version)
          .eq("is_active", true)
          .is("tenant_id", null)
          .maybeSingle();
        throwIfError(globalErr, "approval.getDefinition.global");
        return globalDef
          ? mapKeysSnakeToCamel<PersistedApprovalDefinition>(globalDef)
          : null;
      }
      return null;
    },
    async listRequests(query: ApprovalListRequestsQuery): Promise<ApprovalListRequestsResult> {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, query.limit ?? 25));
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const orderCol =
        query.orderBy === "updatedAt" ? "updated_at" : "created_at";
      const ascending = query.orderDir === "asc";

      let approverRequestIds: string[] | null = null;
      if (query.approverId) {
        const { data: decisions, error: decErr } = await enterpriseFrom(
          client,
          "approval_decisions",
        )
          .select("approval_request_id")
          .eq("tenant_id", query.tenantId)
          .eq("approver_id", query.approverId);
        throwIfError(decErr, "approval.listRequests.approver");
        approverRequestIds = Array.from(
          new Set(
            (decisions ?? []).map(
              (d: { approval_request_id: string }) =>
                String(d.approval_request_id),
            ),
          ),
        );
        if (approverRequestIds.length === 0) {
          return { items: [], total: 0, page, limit };
        }
      }

      let q = enterpriseFrom(client, "approval_requests")
        .select("*", { count: "exact" })
        .eq("tenant_id", query.tenantId);

      if (query.status) q = q.eq("status", query.status);
      if (query.requesterId) q = q.eq("requester_id", query.requesterId);
      if (query.dateFrom) q = q.gte("created_at", query.dateFrom);
      if (query.dateTo) q = q.lte("created_at", query.dateTo);
      if (query.priority) {
        q = q.filter("metadata->>priority", "eq", query.priority);
      }
      if (query.module) {
        q = q.filter("metadata->>category", "eq", query.module);
      }
      if (query.workflowId) {
        q = q.filter("metadata->>workflowId", "eq", query.workflowId);
      }
      if (approverRequestIds) {
        q = q.in("id", approverRequestIds);
      }

      const { data, error, count } = await q
        .order(orderCol, { ascending })
        .range(from, to);
      throwIfError(error, "approval.listRequests");

      return {
        items: (data ?? []).map((r: Record<string, unknown>) =>
          mapKeysSnakeToCamel<PersistedApprovalRequest>(r),
        ),
        total: count ?? 0,
        page,
        limit,
      };
    },
  };
}
