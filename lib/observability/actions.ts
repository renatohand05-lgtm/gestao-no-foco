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
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { probeSupabase } from "@/lib/platform/health";
import {
  OBSERVABILITY_ERROR_CODES,
  ObservabilityError,
  createObservabilityService,
  type ObservabilityFilters,
} from "@/lib/observability";

async function resolveObservability(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new ObservabilityError(
      "Sessão ausente.",
      OBSERVABILITY_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const client = await createClient();
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

  const service = createObservabilityService({
    audit,
    workflow,
    approval,
    notification,
    outbox,
    probeSupabase: async () => {
      const r = await probeSupabase();
      return { ok: r.ok, latencyMs: r.ms, message: r.detail ?? (r.ok ? "ok" : "down") };
    },
    probeDatabase: async () => {
      const started = Date.now();
      try {
        await audit.list(tenant.id, { limit: 1 });
        return { ok: true, latencyMs: Date.now() - started, message: "ok" };
      } catch (error) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          message: error instanceof Error ? error.message : "db_error",
        };
      }
    },
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
      error instanceof ObservabilityError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro na observabilidade.",
  };
}

export async function getSystemHealth(tenantSlug: string) {
  try {
    const { context, service } = await resolveObservability(tenantSlug);
    const health = await service.getSystemHealth(context);
    return { success: true as const, health };
  } catch (error) {
    return toError(error);
  }
}

export async function getMetrics(
  tenantSlug: string,
  filters: ObservabilityFilters = {},
) {
  try {
    const { context, service } = await resolveObservability(tenantSlug);
    const metrics = await service.getMetrics(context, filters);
    return { success: true as const, metrics };
  } catch (error) {
    return toError(error);
  }
}

export async function getAlerts(
  tenantSlug: string,
  filters: ObservabilityFilters = {},
) {
  try {
    const { context, service } = await resolveObservability(tenantSlug);
    const alerts = await service.getAlerts(context, filters);
    return { success: true as const, alerts };
  } catch (error) {
    return toError(error);
  }
}

export async function getTrace(tenantSlug: string, traceId: string) {
  try {
    const { context, service } = await resolveObservability(tenantSlug);
    const trace = await service.getTrace(context, traceId);
    return { success: true as const, trace };
  } catch (error) {
    return toError(error);
  }
}

export async function getObservabilitySnapshot(
  tenantSlug: string,
  filters: ObservabilityFilters = {},
) {
  try {
    const { context, service } = await resolveObservability(tenantSlug);
    const snapshot = await service.snapshot(context, filters);
    return { success: true as const, snapshot };
  } catch (error) {
    return toError(error);
  }
}
