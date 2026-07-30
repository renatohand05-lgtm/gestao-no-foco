"use server";

/**
 * Fase 24 — Server actions CRM Enterprise (RBAC + tenant isolation).
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { createCrmDashboardService } from "@/lib/crm/cliente-360-service";
import { createCrmExecutivoService } from "@/lib/crm/crm-executivo-service";
import { createClienteTarefaService } from "@/lib/crm/cliente-tarefa-service";
import {
  getCrmFeatureFlags,
  isCrmEnterpriseEnabled,
} from "@/lib/crm/crm-feature-flags";
import {
  buildExecutiveCrmBundle,
  crmEnterpriseDrillDown,
} from "@/lib/crm/enterprise/orchestrator";
import {
  buildCrmEnterpriseSnapshotFromSources,
  emptyCrmEnterpriseSnapshot,
} from "@/lib/crm/enterprise/snapshot-builder";
import type { CrmKpiId } from "@/lib/crm/enterprise/types";
import { describeCrmIntegrationArchitecture } from "@/lib/crm/enterprise/integration-architecture";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveCrmAuth(tenantSlug: string) {
  if (!isCrmEnterpriseEnabled()) {
    throw new Error("CRM Enterprise desabilitado por feature flag.");
  }
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const permissions = snap.permissions ?? [];

  if (
    !permissions.includes("crm.visualizar") &&
    !permissions.includes("crm.editar") &&
    !permissions.includes("crm.criar")
  ) {
    throw new Error("Sem permissão crm.visualizar.");
  }

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: snap.roles ?? [],
    permissions,
    source: "server_action",
  });

  return { tenant, profile, client, context, permissions, tenantSlug };
}

function assertNoClientTenantId(options?: Record<string, unknown>) {
  if (!options) return;
  if ("tenantId" in options || "tenant_id" in options) {
    throw new Error("tenantId do client é rejeitado — isolamento server-side.");
  }
}

export async function getExecutiveCrmDashboard(
  tenantSlug: string,
  filters?: {
    tenantId?: string;
    empresaId?: string | null;
    filialId?: string | null;
  },
) {
  assertNoClientTenantId(filters as Record<string, unknown> | undefined);
  const auth = await resolveCrmAuth(tenantSlug);

  const health: Record<
    string,
    { status: "ok" | "error" | "empty"; message: string }
  > = {};

  let dashboard = null;
  let portfolio = null;
  let followUpsPendentes: number | null = null;

  try {
    const dashSvc = await createCrmDashboardService(auth.tenant.id);
    dashboard = await dashSvc.getKpis();
    health.dashboard = { status: "ok", message: "CrmDashboardService" };
  } catch (e) {
    health.dashboard = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha dashboard CRM",
    };
  }

  try {
    const exec = await createCrmExecutivoService(auth.tenant.id);
    portfolio = await exec.loadPortfolio();
    health.executivo = { status: "ok", message: "CrmExecutivoService" };
  } catch (e) {
    health.executivo = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha CRM Executivo",
    };
  }

  try {
    const tarefas = await createClienteTarefaService(auth.tenant.id);
    const open = await tarefas.listAbertas(500);
    followUpsPendentes = open.length;
    health.tarefas = { status: "ok", message: "ClienteTarefaService" };
  } catch (e) {
    health.tarefas = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha tarefas",
    };
  }

  const snap =
    dashboard || portfolio
      ? buildCrmEnterpriseSnapshotFromSources({
          tenantId: auth.tenant.id,
          tenantSlug,
          empresaId: filters?.empresaId ?? null,
          filialId: filters?.filialId ?? null,
          dashboard,
          portfolio: portfolio
            ? {
                kpis: {
                  clientesAtivos: portfolio.kpis.clientesAtivos,
                  novosMes: portfolio.kpis.clientesNovosMes,
                  recorrentes: portfolio.kpis.clientesRecorrentes,
                  inativos: portfolio.kpis.clientesInativos180,
                  ticketMedioPorCliente: portfolio.kpis.ticketMedioPorCliente,
                  receitaPorCliente: portfolio.kpis.faturamentoPorCliente,
                },
                rankings: {
                  faturamento: portfolio.rankings.faturamento.map((r) => ({
                    id: r.id,
                    nome: r.nome,
                    faturamento: r.faturamento,
                  })),
                },
                oportunidades: portfolio.oportunidades,
              }
            : null,
          followUpsPendentes,
          sourceHealth: health,
        })
      : {
          ...emptyCrmEnterpriseSnapshot(auth.tenant.id, tenantSlug),
          sourceHealth: health,
        };

  if (snap.tenantId !== auth.tenant.id) {
    throw new Error("Cross-tenant: snapshot não pertence ao tenant autenticado.");
  }

  return buildExecutiveCrmBundle({
    snap,
    permissions: auth.permissions,
  });
}

export async function getCrmKpiDrillDown(
  tenantSlug: string,
  definitionId: CrmKpiId,
  filters?: { tenantId?: string },
) {
  assertNoClientTenantId(filters as Record<string, unknown> | undefined);
  const auth = await resolveCrmAuth(tenantSlug);
  const bundle = await getExecutiveCrmDashboard(tenantSlug);

  const snap = buildCrmEnterpriseSnapshotFromSources({
    tenantId: auth.tenant.id,
    tenantSlug,
    dashboard: null,
    portfolio: null,
    sourceHealth: bundle.sourceHealth,
  });

  const enriched = {
    ...snap,
    tenantId: auth.tenant.id,
    funil: bundle.funil,
    ranking: bundle.ranking,
    kpisRaw: {
      novos: bundle.kpis.find((k) => k.definitionId === "crm.novos")?.value ?? null,
      ativos: bundle.kpis.find((k) => k.definitionId === "crm.ativos")?.value ?? null,
      inativos:
        bundle.kpis.find((k) => k.definitionId === "crm.inativos")?.value ?? null,
      conversao:
        bundle.kpis.find((k) => k.definitionId === "crm.conversao")?.value ?? null,
      ticketMedio:
        bundle.kpis.find((k) => k.definitionId === "crm.ticket_medio")?.value ??
        null,
      faturamentoPorCliente:
        bundle.kpis.find((k) => k.definitionId === "crm.faturamento_cliente")
          ?.value ?? null,
      recorrentes:
        bundle.kpis.find((k) => k.definitionId === "crm.recorrencia")?.value ??
        null,
      retencao: null,
      perdidos:
        bundle.kpis.find((k) => k.definitionId === "crm.perda")?.value ?? null,
      tempoMedioFechamentoDias:
        bundle.kpis.find((k) => k.definitionId === "crm.tempo_fechamento")
          ?.value ?? null,
      oportunidadesAbertas:
        bundle.kpis.find((k) => k.definitionId === "crm.oportunidades_abertas")
          ?.value ?? null,
      valorNegociacao:
        bundle.kpis.find((k) => k.definitionId === "crm.valor_negociacao")
          ?.value ?? null,
    },
  };

  if (enriched.tenantId !== auth.tenant.id) {
    throw new Error("Cross-tenant bloqueado no drill-down CRM.");
  }

  return crmEnterpriseDrillDown(enriched, definitionId);
}

export async function getCrmIntegrationArchitectureAction(tenantSlug: string) {
  await resolveCrmAuth(tenantSlug);
  return {
    flags: getCrmFeatureFlags(),
    architecture: describeCrmIntegrationArchitecture(),
  };
}
