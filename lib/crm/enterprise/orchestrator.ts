/**
 * Fase 24 — Orchestrator CRM Enterprise (facade pura sobre snapshot).
 */

import { getCrmFeatureFlags } from "../crm-feature-flags.ts";
import { buildCrmAlerts } from "./alert-engine.ts";
import { resolveCommercialProvider } from "./commercial-ai-provider.ts";
import { describeCrmIntegrationArchitecture } from "./integration-architecture.ts";
import {
  buildCrmKpiDrillDownFromSnapshot,
  resolveCrmCatalogKpis,
} from "./kpi-engine.ts";
import { defaultPipelineStages, mergePipelineStages } from "./pipeline-config.ts";
import type {
  CrmEnterpriseSnapshot,
  CrmKpiId,
  CrmPipelineStageConfig,
} from "./types.ts";

export function buildExecutiveCrmBundle(args: {
  snap: CrmEnterpriseSnapshot;
  pipelineCustom?: Array<Partial<CrmPipelineStageConfig> & { key: string }> | null;
  permissions?: readonly string[];
}) {
  const flags = getCrmFeatureFlags();
  const kpis = resolveCrmCatalogKpis(args.snap);
  const alerts = buildCrmAlerts({ snap: args.snap, kpis });
  const provider = resolveCommercialProvider();
  const insights = provider.explain({
    kpis,
    alerts,
    tenantId: args.snap.tenantId,
  });
  const pipeline = mergePipelineStages({
    empresaId: args.snap.empresaId ?? null,
    custom: args.pipelineCustom,
  });

  const priority: CrmKpiId[] = [
    "crm.ativos",
    "crm.novos",
    "crm.inativos",
    "crm.conversao",
    "crm.ticket_medio",
    "crm.faturamento_cliente",
    "crm.oportunidades_abertas",
    "crm.valor_negociacao",
    "crm.recorrencia",
    "crm.perda",
    "crm.tempo_fechamento",
    "crm.retencao",
  ];

  const highlighted = priority
    .map((id) => kpis.find((k) => k.definitionId === id))
    .filter(Boolean);

  return {
    version: "24.0" as const,
    context: {
      tenantId: args.snap.tenantId,
      tenantSlug: args.snap.tenantSlug,
      asOf: args.snap.asOf,
      empresaId: args.snap.empresaId ?? null,
      filialId: args.snap.filialId ?? null,
      permissions: args.permissions ?? [],
    },
    kpis,
    highlighted,
    funil: args.snap.funil,
    pipeline,
    defaultPipeline: defaultPipelineStages(args.snap.empresaId ?? null),
    alerts,
    insights,
    ranking: args.snap.ranking ?? [],
    followUpsPendentes: args.snap.followUpsPendentes ?? null,
    metas: args.snap.metas ?? null,
    provider: {
      id: provider.id,
      kind: provider.kind,
      label: provider.label,
    },
    integrations: describeCrmIntegrationArchitecture(),
    flags,
    sourceHealth: args.snap.sourceHealth ?? {},
    empty:
      kpis.every((k) => k.availability !== "available") &&
      args.snap.funil.every((f) => f.total === 0),
    updatedAt: args.snap.asOf,
    clientBase: {
      principle: "single_source_clientes",
      table: "public.clientes",
      note: "CRM Enterprise não cria segunda base de clientes.",
    },
  };
}

export function crmEnterpriseDrillDown(
  snap: CrmEnterpriseSnapshot,
  definitionId: CrmKpiId,
) {
  return buildCrmKpiDrillDownFromSnapshot(snap, definitionId);
}

export type ExecutiveCrmBundle = ReturnType<typeof buildExecutiveCrmBundle>;
