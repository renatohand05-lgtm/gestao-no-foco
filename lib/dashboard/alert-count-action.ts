"use server";

import { loadExecutiveDashboardContext } from "@/lib/dashboard/executive-dashboard-context-service";
import { buildCockpitAlerts } from "@/lib/dashboard/cockpit-v2/alerts";
import { composeExecutiveDecision } from "@/lib/dashboard/executive-decision-service";
import { toDecisionFeeds, toIntelligenceFeeds } from "@/lib/dashboard/executive-dashboard-context-service";
import { composeOpsExecutiveIntelligence } from "@/lib/enterprise";
import { buildPremiumInsights } from "@/lib/dashboard/premium-dashboard-map";
import { composeExecutiveFinancialCockpit } from "@/lib/dashboard/executive-financial-cockpit-service";
import { loadDashboardHojeSnapshot, loadDashboardResumoMes } from "@/lib/dashboard/dashboard-loaders";
import { requireTenant } from "@/lib/tenants";

/**
 * Contagem real de alertas críticos/altos pro sino de notificação do
 * cabeçalho global — reaproveita exatamente a mesma lógica do dashboard,
 * nunca um número inventado.
 */
export async function fetchDashboardAlertCountAction(
  tenantSlug: string,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const [hoje, resumo, execCtx] = await Promise.all([
      loadDashboardHojeSnapshot(tenant.id, null),
      loadDashboardResumoMes(tenant.id, {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        centroCustoId: null,
        vendedorId: null,
        origem: null,
      }),
      loadExecutiveDashboardContext(tenant.id, tenantSlug),
    ]);

    const decision = composeExecutiveDecision({
      tenantSlug,
      hoje,
      resumo,
      feeds: toDecisionFeeds(execCtx),
    });
    const intelligence = composeOpsExecutiveIntelligence({
      feeds: toIntelligenceFeeds(execCtx),
    });
    const cockpit = composeExecutiveFinancialCockpit(execCtx);
    const estoqueAbaixoMinimo = execCtx.estoque?.abaixoMinimo ?? null;

    const insights = buildPremiumInsights({
      cockpit,
      intelligence,
      decision,
      estoqueAbaixoMinimo,
      primary: null,
      charts: null,
      tenantSlug,
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    });

    const alerts = buildCockpitAlerts({ insights, decision, tenantSlug });
    const count = alerts.filter(
      (a) => a.priority === "critica" || a.priority === "alta",
    ).length;

    return { success: true, count };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao contar alertas.",
    };
  }
}
