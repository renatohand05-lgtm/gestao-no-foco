/**
 * Sprint 21.6 — Audit Supabase Adapter (append-only).
 */

import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../mappers.ts";
import type { AuditRepository, PersistedAuditEvent } from "../repositories/contracts.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "./supabase-helpers.ts";

export function createAuditSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): AuditRepository {
  return {
    async append(event) {
      const row = mapKeysCamelToSnake({
        id: event.id,
        tenantId: event.tenantId,
        userId: event.userId,
        actorType: event.actorType,
        systemActorKey: event.systemActorKey,
        event: event.event,
        category: event.category,
        severity: event.severity,
        targetType: event.targetType,
        targetId: event.targetId,
        resource: event.resource,
        module: event.module,
        description: event.description,
        metadata: event.metadata ?? {},
        origin: event.origin,
        correlationId: event.correlationId,
        requestId: event.requestId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        device: event.device,
        createdAt: event.createdAt ?? nowIso(),
      });
      const { data, error } = await enterpriseFrom(client, "audit_events")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "audit.append");
      return mapKeysSnakeToCamel<PersistedAuditEvent>(data);
    },
    async findById(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "audit_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "audit.findById");
      return data ? mapKeysSnakeToCamel<PersistedAuditEvent>(data) : null;
    },
    async list(tenantId, options) {
      const { data, error } = await enterpriseFrom(client, "audit_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(options?.limit ?? 100);
      throwIfError(error, "audit.list");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedAuditEvent>(r),
      );
    },
    async search(tenantId, query) {
      let q = enterpriseFrom(client, "audit_events")
        .select("*")
        .eq("tenant_id", tenantId);
      if (query.event) q = q.eq("event", query.event);
      if (query.category) q = q.eq("category", query.category);
      if (query.correlationId) q = q.eq("correlation_id", query.correlationId);
      const { data, error } = await q.order("created_at", { ascending: false });
      throwIfError(error, "audit.search");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedAuditEvent>(r),
      );
    },
    async listByCorrelationId(tenantId, correlationId) {
      return this.search(tenantId, { correlationId });
    },
    async listByTarget(tenantId, targetType, targetId) {
      const { data, error } = await enterpriseFrom(client, "audit_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      throwIfError(error, "audit.listByTarget");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedAuditEvent>(r),
      );
    },
  };
}
