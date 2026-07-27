"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createApprovalSupabaseAdapter,
  createNotificationSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  createEnterpriseContext,
  type EnterpriseOutboxEvent,
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import {
  TimelineError,
  TIMELINE_ERROR_CODES,
  createTimelineService,
  type TimelineFilters,
  type TimelineGroupBy,
  type TimelinePagination,
} from "@/lib/timeline";
import type { TimelineActorProfile } from "@/lib/timeline/timeline-enrichment";

async function resolveTimeline(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new TimelineError(
      "Sessão ausente.",
      TIMELINE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const client = await createClient();
  const { enterpriseFrom } = await import(
    "@/lib/enterprise/adapters/supabase-helpers"
  );
  const audit = createAuditSupabaseAdapter(client);
  const workflow = createWorkflowSupabaseAdapter(client);
  const approval = createApprovalSupabaseAdapter(client);
  const notification = createNotificationSupabaseAdapter(client);
  const outbox = createOutboxSupabaseAdapter(client);
  const rbac = createRbacSupabaseAdapter(client);

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    source: "server_action",
  });

  const profileCache = new Map<string, TimelineActorProfile | null>();

  const service = createTimelineService({
    audit,
    workflow,
    approval,
    notification,
    tenantSlug,
    resolveActorProfile: async (userId) => {
      if (profileCache.has(userId)) return profileCache.get(userId)!;
      const { data, error } = await client
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error || !data) {
        profileCache.set(userId, null);
        return null;
      }
      const resolved: TimelineActorProfile = {
        id: data.id,
        name: data.full_name ?? null,
        avatar: data.avatar_url ?? null,
        role: null,
      };
      profileCache.set(userId, resolved);
      return resolved;
    },
    listOutbox: async (tenantId, limit = 40) => {
      if (!tenantId?.trim()) return [];
      // SELECT autenticado · filtrado por tenant · RLS do projeto · sem claim/bypass
      const { data, error } = await enterpriseFrom(client, "enterprise_outbox")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const r = row;
          return {
            id: String(r.id),
            tenantId: String(r.tenant_id),
            eventType: String(r.event_type),
            aggregateType: String(r.aggregate_type),
            aggregateId: String(r.aggregate_id),
            payload: (r.payload as EnterpriseOutboxEvent["payload"]) ?? {},
            status: String(r.status) as EnterpriseOutboxEvent["status"],
            attempts: Number(r.attempts ?? 0),
            maxAttempts: Number(r.max_attempts ?? 5),
            correlationId: (r.correlation_id as string) ?? null,
            requestId: (r.request_id as string) ?? null,
            availableAt: String(r.available_at ?? r.created_at),
            lockedAt: (r.locked_at as string) ?? null,
            lockedBy: (r.locked_by as string) ?? null,
            processedAt: (r.processed_at as string) ?? null,
            lastError: (r.last_error as string) ?? null,
            createdAt: String(r.created_at),
            updatedAt: String(r.updated_at ?? r.created_at),
          } satisfies EnterpriseOutboxEvent;
        })
        .filter((e: EnterpriseOutboxEvent) => e.tenantId === tenantId);
    },
    countOutboxPending: (tenantId) => outbox.countByStatus(tenantId, "pending"),
    resolveAuthorization: async (ctx) => {
      if (!ctx.userId) return null;
      const snap = await rbac.resolveAuthorizationSnapshot(
        ctx.tenantId,
        ctx.userId,
      );
      return {
        tenantId: snap.tenantId,
        userId: snap.userId,
        roles: snap.roles,
        permissions: snap.permissions.length
          ? snap.permissions
          : ["auditoria.visualizar"],
      };
    },
  });

  return { tenant, context, service, tenantSlug };
}

function toError(error: unknown): { success: false; error: string } {
  return {
    success: false,
    error:
      error instanceof TimelineError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro na timeline.",
  };
}

/** Lista atividade global do tenant (RBAC). */
export async function listActivity(
  tenantSlug: string,
  filters: TimelineFilters = {},
  pagination: TimelinePagination = {},
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const { page, kpis } = await service.queryGlobalWithKpis(
      context,
      filters,
      pagination,
    );
    return { success: true as const, page, kpis };
  } catch (error) {
    return toError(error);
  }
}

/** Busca textual na atividade (RBAC). */
export async function searchActivity(
  tenantSlug: string,
  text: string,
  filters: TimelineFilters = {},
  pagination: TimelinePagination = {},
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const page = await service.search(context, text, filters, pagination);
    return { success: true as const, page };
  } catch (error) {
    return toError(error);
  }
}

/** Detalhes de um evento + relacionados (RBAC). */
export async function getActivityDetails(
  tenantSlug: string,
  eventId: string,
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const details = await service.getDetails(context, eventId);
    return { success: true as const, details };
  } catch (error) {
    return toError(error);
  }
}

/** Aliases compatíveis Sprint 21.8 */
export const queryTimelineAction = listActivity;
export const searchTimelineAction = searchActivity;
export const getTimelineDetailsAction = getActivityDetails;

export async function queryEntityTimelineAction(
  tenantSlug: string,
  entityType: string,
  entityId: string,
  filters: TimelineFilters = {},
  pagination: TimelinePagination = {},
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const page = await service.queryEntity(
      context,
      entityType,
      entityId,
      filters,
      pagination,
    );
    return { success: true as const, page };
  } catch (error) {
    return toError(error);
  }
}

export async function groupTimelineAction(
  tenantSlug: string,
  groupBy: TimelineGroupBy,
  filters: TimelineFilters = {},
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const groups = await service.group(context, groupBy, filters);
    return { success: true as const, groups };
  } catch (error) {
    return toError(error);
  }
}

export async function timelineDashboardAction(
  tenantSlug: string,
  filters: TimelineFilters = {},
) {
  try {
    const { context, service } = await resolveTimeline(tenantSlug);
    const kpis = await service.dashboard(context, filters);
    return { success: true as const, kpis };
  } catch (error) {
    return toError(error);
  }
}
