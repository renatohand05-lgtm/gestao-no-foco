"use server";

/**
 * Fase 23 / Sprint 23.1 — Server actions Analytics (RBAC + tenant isolation).
 * tenantId / companyId / branchId do client NÃO são confiáveis.
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { isAnalyticsEnabled } from "@/lib/analytics/analytics-feature-flags";
import {
  analyticsDrillDown,
  buildExecutiveAnalyticsBundle,
} from "@/lib/analytics/analytics-orchestrator";
import {
  analyticsPermissionSatisfied,
} from "@/lib/analytics/core/analytics-engine";
import { getMetricDefinition } from "@/lib/analytics/core/metric-registry";
import { buildAnalyticsCsv } from "@/lib/analytics/core/csv-safe";
import {
  assertPeriodPreset,
  isValidIsoDate,
  resolvePeriodPreset,
  sanitizeMetricFilter,
} from "@/lib/analytics/core/filter-engine";
import type {
  AnalyticsPeriodPreset,
  MetricFilter,
} from "@/lib/analytics/core/metric-types";
import { loadAnalyticsDomainSnapshot } from "@/lib/analytics/snapshot-loader";
import {
  analyticsRbacPermissionSatisfied,
  resolveAnalyticsEffectivePermissions,
} from "@/lib/analytics/rbac-compat";
import {
  ANALYTICS_VIEW_ANY_OF,
  EXECUTIVE_DASHBOARD_ANY_OF,
  buildAnalyticsAuthContext,
  requireAnalyticsPermission,
} from "@/lib/rbac/executive-access";
import { AccessDeniedError } from "@/lib/rbac/errors";

async function resolveAnalyticsAuth(
  tenantSlug: string,
  required: string | string[],
  options?: { executive?: boolean },
) {
  if (!isAnalyticsEnabled()) {
    throw new Error("Analytics desabilitado por feature flag.");
  }
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveAnalyticsEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  const permissions = effective.permissions;

  const need = Array.isArray(required) ? required : [required];
  const authz = buildAnalyticsAuthContext({
    userId: profile.id,
    tenantId: tenant.id,
    roles: effective.roles,
    permissions,
  });

  try {
    if (options?.executive) {
      // Fonte única: executivo exige analytics.executivo | dashboard.executivo
      requireAnalyticsPermission(authz, [...EXECUTIVE_DASHBOARD_ANY_OF]);
    } else if (
      !need.some(
        (p) =>
          analyticsPermissionSatisfied(permissions, p) ||
          analyticsRbacPermissionSatisfied(permissions, p),
      )
    ) {
      requireAnalyticsPermission(
        authz,
        need.length ? need : [...ANALYTICS_VIEW_ANY_OF],
      );
    }
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const label = options?.executive
        ? EXECUTIVE_DASHBOARD_ANY_OF.join(" | ")
        : need.join(" | ");
      throw new Error(`Sem permissão: ${label}`);
    }
    throw error;
  }

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions,
    source: "server_action",
    metadata: {
      analyticsAuthSource: effective.source,
      membershipRole: tenant.role,
    },
  });

  return { tenant, profile, client, context, permissions, tenantSlug };
}

function resolveSafePeriod(options?: {
  periodPreset?: string;
  customFrom?: string;
  customTo?: string;
}) {
  const preset = assertPeriodPreset(options?.periodPreset);
  const customFrom =
    preset === "custom" && isValidIsoDate(options?.customFrom)
      ? options!.customFrom!
      : undefined;
  const customTo =
    preset === "custom" && isValidIsoDate(options?.customTo)
      ? options!.customTo!
      : undefined;
  return resolvePeriodPreset(preset, { customFrom, customTo });
}

/** Rejeita payloads que tentam injetar tenant/empresa de outro contexto. */
function assertNoCrossTenantPayload(options?: Record<string, unknown>) {
  if (!options) return;
  if ("tenantId" in options || "tenant_id" in options) {
    throw new Error("tenantId do client é rejeitado — isolamento server-side.");
  }
}

export async function getExecutiveAnalyticsDashboard(
  tenantSlug: string,
  options?: {
    periodPreset?: AnalyticsPeriodPreset;
    customFrom?: string;
    customTo?: string;
    filters?: Partial<MetricFilter>;
  },
) {
  try {
    assertNoCrossTenantPayload(options as Record<string, unknown> | undefined);
    const auth = await resolveAnalyticsAuth(
      tenantSlug,
      [...EXECUTIVE_DASHBOARD_ANY_OF],
      { executive: true },
    );
    const period = resolveSafePeriod(options);
    const filters = sanitizeMetricFilter({
      period,
      raw: options?.filters,
      // Sem allow-list de empresas/filiais ainda — client não força escopo
      authorizedEmpresaIds: null,
      authorizedFilialIds: null,
    });
    const domain = await loadAnalyticsDomainSnapshot({
      tenantId: auth.tenant.id,
      tenantSlug,
      period,
    });
    if (domain.tenantId !== auth.tenant.id) {
      throw new Error("Cross-tenant bloqueado no Analytics.");
    }
    const bundle = buildExecutiveAnalyticsBundle({
      snap: domain,
      permissions: auth.permissions,
      periodPreset: assertPeriodPreset(options?.periodPreset),
      customFrom: options?.customFrom,
      customTo: options?.customTo,
      filters,
    });
    return { success: true as const, bundle };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao carregar analytics.",
    };
  }
}

export async function getAnalyticsAreaDashboard(
  tenantSlug: string,
  area:
    | "financeiro"
    | "vendas"
    | "clientes"
    | "operacoes"
    | "estoque"
    | "tributario"
    | "metas",
  options?: { periodPreset?: AnalyticsPeriodPreset },
) {
  const permByArea: Record<string, string[]> = {
    financeiro: ["analytics.financeiro", "dashboard.financeiro"],
    vendas: ["analytics.vendas", "dashboard.comercial"],
    clientes: ["analytics.operacional", "dashboard.operacional"],
    operacoes: ["analytics.operacional", "dashboard.operacional"],
    estoque: ["analytics.estoque", "dashboard.estoque"],
    tributario: ["analytics.tributario", "financeiro.tributos.visualizar"],
    metas: ["analytics.vendas", "analytics.visualizar"],
  };

  try {
    assertNoCrossTenantPayload(options as Record<string, unknown> | undefined);
    const auth = await resolveAnalyticsAuth(
      tenantSlug,
      permByArea[area] ?? ["analytics.visualizar"],
    );
    const period = resolveSafePeriod(options);
    const domain = await loadAnalyticsDomainSnapshot({
      tenantId: auth.tenant.id,
      tenantSlug,
      period,
    });
    if (domain.tenantId !== auth.tenant.id) {
      throw new Error("Cross-tenant bloqueado no Analytics.");
    }
    const bundle = buildExecutiveAnalyticsBundle({
      snap: domain,
      permissions: auth.permissions,
      periodPreset: assertPeriodPreset(options?.periodPreset),
    });
    const { listMetricsByArea } = await import(
      "@/lib/analytics/core/metric-registry"
    );
    const areaKey = area === "clientes" ? "clientes" : area;
    const ids = new Set(listMetricsByArea(areaKey).map((d) => d.id));
    return {
      success: true as const,
      bundle: {
        ...bundle,
        metrics: bundle.metrics.filter((m) => ids.has(m.definitionId)),
        kpis: (bundle.kpis as NonNullable<(typeof bundle.kpis)[number]>[]).filter(
          (m) => m && ids.has(m.definitionId),
        ),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao carregar área.",
    };
  }
}

export async function getAnalyticsDrillDown(
  tenantSlug: string,
  definitionId: string,
  options?: { periodPreset?: AnalyticsPeriodPreset },
) {
  try {
    assertNoCrossTenantPayload(options as Record<string, unknown> | undefined);
    const auth = await resolveAnalyticsAuth(tenantSlug, [
      "analytics.visualizar",
      "analytics.executivo",
    ]);
    const def = getMetricDefinition(definitionId);
    if (
      def &&
      !analyticsPermissionSatisfied(auth.permissions, def.requiredPermission)
    ) {
      throw new Error(`Sem permissão para drill-down: ${def.requiredPermission}`);
    }
    const period = resolveSafePeriod(options);
    const domain = await loadAnalyticsDomainSnapshot({
      tenantId: auth.tenant.id,
      tenantSlug,
      period,
    });
    if (domain.tenantId !== auth.tenant.id) {
      throw new Error("Cross-tenant bloqueado no drill-down.");
    }
    return {
      success: true as const,
      drillDown: analyticsDrillDown(domain, definitionId),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha no drill-down.",
    };
  }
}

export async function exportAnalyticsCsv(
  tenantSlug: string,
  options?: { periodPreset?: AnalyticsPeriodPreset },
) {
  try {
    assertNoCrossTenantPayload(options as Record<string, unknown> | undefined);
    const auth = await resolveAnalyticsAuth(tenantSlug, [
      "analytics.exportar",
      "dashboard.exportar",
      "relatorios.exportar",
    ]);
    const period = resolveSafePeriod(options);
    const domain = await loadAnalyticsDomainSnapshot({
      tenantId: auth.tenant.id,
      tenantSlug,
      period,
    });
    if (domain.tenantId !== auth.tenant.id) {
      throw new Error("Cross-tenant bloqueado na exportação.");
    }
    const bundle = buildExecutiveAnalyticsBundle({
      snap: domain,
      permissions: auth.permissions,
      periodPreset: assertPeriodPreset(options?.periodPreset),
    });
    const csv = buildAnalyticsCsv(
      bundle.metrics.map((m) => ({
        id: m.definitionId,
        nome: m.name,
        valor: m.value ?? "",
        unidade: m.unit,
        disponibilidade: m.availability,
        fonte: m.source,
        confianca: m.confidence,
      })),
      [
        "id",
        "nome",
        "valor",
        "unidade",
        "disponibilidade",
        "fonte",
        "confianca",
      ],
    );
    return {
      success: true as const,
      csv,
      filename: `analytics-${tenantSlug}-${period.from}-${period.to}.csv`,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Exportação negada.",
    };
  }
}
