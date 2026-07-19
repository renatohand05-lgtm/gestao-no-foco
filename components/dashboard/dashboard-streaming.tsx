import { Suspense, type ReactNode } from "react";

import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import {
  ExecutiveDailyPerformance,
  ExecutiveDailyPerformanceSkeleton,
  ExecutiveFooter,
  ExecutiveFooterSkeleton,
  ExecutiveHeatmapV2,
  ExecutiveHeatmapV2Skeleton,
  ExecutiveHeroV2,
  ExecutiveHeroV2Skeleton,
  ExecutiveKpiGrid,
  ExecutiveKpiGridSkeleton,
  ExecutiveLivePulse,
  ExecutiveMonthlyEvolution,
  ExecutiveMonthlyEvolutionSkeleton,
  ExecutivePerformanceSection,
  ExecutiveRankingsGrid,
  ExecutiveRankingsGridSkeleton,
  ExecutiveSectionState,
} from "@/components/dashboard/executive";
import { ActionCenterSection } from "@/components/executive/action-center";
import { ExecutiveActionPlan } from "@/components/executive/action-plan";
import { ExecutiveCopilot } from "@/components/executive/copilot";
import {
  BusinessInsightsPanel,
  ExecutiveIntelligenceSection,
} from "@/components/executive/intelligence";
import { ExecutiveInsightsSection } from "@/components/executive/insights";
import { composeExecutiveInsights } from "@/lib/executive-insights";
import { PredictionSection } from "@/components/executive/predictions";
import { ExecutiveTimeline } from "@/components/executive/timeline";
import { ExecutiveFoldChrome } from "@/components/executive/workspace/executive-fold-chrome";
import { ExecutiveWorkspaceFooter } from "@/components/executive/workspace/executive-workspace-footer";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  ExecutiveWorkspace,
} from "@/components/executive/workspace";
import { LayoutSlot } from "@/components/executive/layout";
import {
  loadDashboardCommercialPanel,
  loadDashboardFull,
  loadDashboardPrimary,
} from "@/lib/dashboard/dashboard-loaders";
import { buildActionCenterDecision } from "@/lib/action-center";
import { buildActionPlan } from "@/lib/action-plan";
import { buildBusinessIntelligence } from "@/lib/business-intelligence";
import { buildCopilotResponses } from "@/lib/copilot";
import {
  buildPredictionEngine,
  toPredictionInput,
} from "@/lib/predictions";
import { buildExecutiveIntelligence } from "@/lib/intelligence";
import { buildExecutiveTimelineEvents } from "@/lib/timeline-engine";
import type { BootstrapLayoutResult } from "@/lib/dashboard-layout/persistence/types";
import { exAnimations, exRadius, exStack } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { CONFIANCA_LABEL } from "@/types/commercial-panel";
import type {
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";
import type { TenantSegment } from "@/types";

export type DashboardStreamCtx = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  filters: DashboardFilters;
  greeting: string;
  filterOptions: DashboardFilterOptions;
};

function SectionError({
  tenantSlug,
  description,
}: {
  tenantSlug: string;
  description: string;
}) {
  return (
    <DashboardEmptyState
      variant="error"
      title="Não foi possível carregar esta seção"
      description={description}
      actionHref={`/${tenantSlug}/dashboard`}
      actionLabel="Recarregar dashboard"
    />
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Bloco principal Premium — Hero + KPIs + Performance + séries comerciais.
 * Usa loaders existentes (React.cache); sem novos fetches.
 */
async function PremiumExecutiveBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let primary;
  let panel;

  try {
    [primary, panel] = await Promise.all([
      loadDashboardPrimary(ctx.tenantId, ctx.segment, ctx.filters),
      loadDashboardCommercialPanel(ctx.tenantId, ctx.filters),
    ]);
  } catch (error) {
    return (
      <SectionError
        tenantSlug={ctx.tenantSlug}
        description={errorMessage(
          error,
          "Erro ao carregar o dashboard executivo.",
        )}
      />
    );
  }

  const intelligence = buildExecutiveIntelligence(panel, ctx.tenantSlug);
  const business = buildBusinessIntelligence(panel, ctx.tenantSlug);
  const predictions = buildPredictionEngine(panel, ctx.tenantSlug);
  const predictionInput = toPredictionInput(panel, ctx.tenantSlug);
  const executiveTimeline = buildExecutiveTimelineEvents({
    intelligence,
    business,
    predictions,
  });
  const actionDecision = buildActionCenterDecision(intelligence);
  const copilot = buildCopilotResponses({
    intelligence,
    business,
    predictions,
    timeline: executiveTimeline,
    action: actionDecision,
  });
  const actionPlan = buildActionPlan({
    intelligence,
    business,
    predictions,
    timeline: executiveTimeline,
    copilot,
  });

  const insightsPack = composeExecutiveInsights({
    business,
    intelligence,
    predictions,
    action: actionDecision,
    confidence: panel.confianca,
    confidenceReason: panel.confianca_motivo,
    periodLabel: `${panel.competencia} · ${ctx.filters.dataDe} → ${ctx.filters.dataAte}`,
    referenceDate: ctx.filters.dataAte,
  });

  const updatedAtLabel = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const receitaCmp = primary.comparisons.faturamento;

  return (
    <>
      <LayoutSlot id="hero">
        <ExecutiveHeroV2
          tenantSlug={ctx.tenantSlug}
          tenantName={ctx.tenantName}
          greeting={ctx.greeting}
          data={panel}
          score={intelligence.score}
          nextAction={{
            title: actionDecision.headline,
            impact: actionDecision.impact,
            href: actionDecision.cta.href,
            actionLabel: intelligence.action.actionLabel,
          }}
          topRisk={
            business.risks[0]
              ? {
                  title: business.risks[0].title,
                  detail: business.risks[0].impact,
                }
              : null
          }
          topOpportunity={
            business.opportunities[0]
              ? {
                  title: business.opportunities[0].title,
                  detail: business.opportunities[0].estimatedImpact,
                }
              : null
          }
          updatedAtLabel={updatedAtLabel}
          trendPct={receitaCmp.variationPct}
          trend={receitaCmp.trend}
          businessSummary={business.summary}
        />

        <ExecutiveLivePulse
          updatedAtLabel={updatedAtLabel}
          vendasCount={primary.kpis.quantidade_vendas}
          clientesCount={primary.kpis.quantidade_clientes}
          confidenceLabel={CONFIANCA_LABEL[panel.confianca]}
          className="mt-3"
        />

        {!primary.hasData ? (
          <ExecutiveSectionState
            variant="empty"
            title="Sem movimento no período"
            description="Registre vendas faturadas para alimentar receita, ticket e rankings."
            actionHref={`/${ctx.tenantSlug}/vendas/nova`}
            actionLabel="Registrar venda"
          />
        ) : null}
      </LayoutSlot>

      <LayoutSlot id="kpis">
        <ExecutiveKpiGrid
          tenantSlug={ctx.tenantSlug}
          primary={primary}
          panel={panel}
          kpiExplanations={business.kpiExplanations}
        />
      </LayoutSlot>

      <LayoutSlot id="action_center">
        <div className="space-y-4">
          <ActionCenterSection
            intelligence={intelligence}
            decision={actionDecision}
          />
          <ExecutiveFoldChrome
            tenantSlug={ctx.tenantSlug}
            tenantName={ctx.tenantName}
            filters={ctx.filters}
            filterOptions={ctx.filterOptions}
          />
        </div>
      </LayoutSlot>

      <LayoutSlot id="performance">
        <ExecutivePerformanceSection data={panel} />
      </LayoutSlot>

      <LayoutSlot id="business">
        <ExecutiveInsightsSection
          pack={insightsPack}
          details={
            <BusinessInsightsPanel
              data={business}
              confidence={panel.confianca}
              confidenceReason={panel.confianca_motivo}
              embedded
            />
          }
        />
      </LayoutSlot>

      <LayoutSlot id="timeline">
        <ExecutiveTimeline data={executiveTimeline} />
      </LayoutSlot>

      <LayoutSlot id="prediction">
        <PredictionSection
          data={predictions}
          predictionInput={predictionInput}
        />
      </LayoutSlot>

      <LayoutSlot id="monthly">
        <ExecutiveMonthlyEvolution
          tenantSlug={ctx.tenantSlug}
          data={panel}
        />
      </LayoutSlot>

      <LayoutSlot id="daily">
        <ExecutiveDailyPerformance
          tenantSlug={ctx.tenantSlug}
          data={panel}
        />
      </LayoutSlot>

      <LayoutSlot id="heatmap">
        <ExecutiveHeatmapV2 tenantSlug={ctx.tenantSlug} data={panel} />
      </LayoutSlot>

      <LayoutSlot id="rankings">
        <ExecutiveRankingsGrid
          tenantSlug={ctx.tenantSlug}
          data={panel}
          filters={ctx.filters}
        />
      </LayoutSlot>

      <LayoutSlot id="intelligence">
        <ExecutiveIntelligenceSection data={intelligence} />
      </LayoutSlot>

      <LayoutSlot id="copilot">
        <ExecutiveCopilot data={copilot} />
      </LayoutSlot>

      <LayoutSlot id="action_plan">
        <ExecutiveActionPlan data={actionPlan} />
      </LayoutSlot>
    </>
  );
}

async function FooterBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let primary;
  let panel;

  try {
    [primary, panel] = await Promise.all([
      loadDashboardPrimary(ctx.tenantId, ctx.segment, ctx.filters),
      loadDashboardCommercialPanel(ctx.tenantId, ctx.filters),
    ]);
  } catch (error) {
    return (
      <SectionError
        tenantSlug={ctx.tenantSlug}
        description={errorMessage(error, "Erro ao carregar o rodapé.")}
      />
    );
  }

  const updatedAtLabel = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const intelligence = buildExecutiveIntelligence(panel, ctx.tenantSlug);
  const business = buildBusinessIntelligence(panel, ctx.tenantSlug);
  const predictions = buildPredictionEngine(panel, ctx.tenantSlug);
  const executiveTimeline = buildExecutiveTimelineEvents({
    intelligence,
    business,
    predictions,
  });
  const actionDecision = buildActionCenterDecision(intelligence);
  const copilot = buildCopilotResponses({
    intelligence,
    business,
    predictions,
    timeline: executiveTimeline,
    action: actionDecision,
  });
  const actionPlan = buildActionPlan({
    intelligence,
    business,
    predictions,
    timeline: executiveTimeline,
    copilot,
  });

  const today = panel.daily[panel.daily.length - 1];
  const smartItems = [
    ...actionPlan.tasks.slice(0, 3).map((t) => ({
      kind: "acao" as const,
      title: t.title,
      detail: t.impactoEsperado,
    })),
    ...business.risks.slice(0, 2).map((r) => ({
      kind: "risco" as const,
      title: r.title,
      detail: r.impact,
    })),
    ...business.opportunities.slice(0, 1).map((o) => ({
      kind: "oportunidade" as const,
      title: o.title,
      detail: o.estimatedImpact,
    })),
  ];

  const filterChips = [
    `Período: ${primary.periodo.label}`,
    ctx.filters.centroCusto ? `Centro filtrado` : "Centro: todos",
    ctx.filters.categoria ? `Categoria filtrada` : null,
    ctx.filters.contaBancaria ? `Canal filtrado` : null,
    ctx.filters.status ? `Status: ${ctx.filters.status}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <ExecutiveWorkspaceFooter
        tenantSlug={ctx.tenantSlug}
        updatedAtLabel={updatedAtLabel}
        statusLabel={business.summary.headline}
        metaDiaria={
          today ? formatCurrency(today.meta_diaria) : undefined
        }
        realizadoDia={
          today ? formatCurrency(today.realizado) : undefined
        }
        items={smartItems}
        panelDetails={{
          periodoLabel: primary.periodo.label,
          filterChips,
          observacao: panel.projecao.observacao_feriados,
          fontes:
            "DRE receita bruta · meta/projeção comercial · vendas faturadas",
          versao: "Gestão no Foco · v0.1.0",
        }}
      />

      <ExecutiveFooter
        tenantSlug={ctx.tenantSlug}
        tenantName={ctx.tenantName}
        exportActions={
          <Suspense fallback={<DashboardExportActionsSkeleton />}>
            <ExportActionsBlock ctx={ctx} />
          </Suspense>
        }
      />
    </div>
  );
}

export async function ExportActionsBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let data;

  try {
    data = await loadDashboardFull(
      ctx.tenantId,
      ctx.segment,
      ctx.filters,
      { tenantSlug: ctx.tenantSlug, tenantName: ctx.tenantName },
    );
  } catch {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        Exportação indisponível no momento.
      </p>
    );
  }

  return (
    <DashboardActions
      tenantSlug={ctx.tenantSlug}
      tenantName={ctx.tenantName}
      data={data}
    />
  );
}

export function DashboardExportActionsSkeleton() {
  return (
    <div
      className="h-9 w-36 animate-pulse rounded-md bg-muted/40"
      aria-busy="true"
      aria-label="Preparando exportação"
    />
  );
}

type DashboardStreamingViewProps = {
  ctx: DashboardStreamCtx;
  layoutBootstrap?: BootstrapLayoutResult | null;
  /** Banner soft de onboarding — Design Freeze: não altera Hero/KPIs. */
  onboardingLead?: ReactNode;
};

export function DashboardStreamingView({
  ctx,
  layoutBootstrap = null,
  onboardingLead,
}: DashboardStreamingViewProps) {
  const updatedAtLabel = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <ExecutiveWorkspace
      tenantSlug={ctx.tenantSlug}
      tenantName={ctx.tenantName}
      greeting={ctx.greeting}
      filters={ctx.filters}
      filterOptions={ctx.filterOptions}
      updatedAtLabel={updatedAtLabel}
      layoutBootstrap={layoutBootstrap}
      lead={onboardingLead}
      footer={
        <Suspense fallback={<ExecutiveFooterSkeleton />}>
          <FooterBlock ctx={ctx} />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div className={exStack[32]}>
            <ExecutiveHeroV2Skeleton />
            <div
              className={cn(
                "h-36 bg-white dark:bg-card",
                exRadius[24],
                exAnimations.shimmer,
              )}
              aria-hidden
            />
            <ExecutiveKpiGridSkeleton />
            <div
              className={cn(
                "h-40 bg-white dark:bg-card",
                exRadius[20],
                exAnimations.shimmer,
              )}
              aria-hidden
            />
            <ExecutiveMonthlyEvolutionSkeleton />
            <ExecutiveDailyPerformanceSkeleton />
            <ExecutiveHeatmapV2Skeleton />
            <ExecutiveRankingsGridSkeleton />
            <div
              className={cn(
                "h-48 bg-white dark:bg-card",
                exRadius[20],
                exAnimations.shimmer,
              )}
              aria-hidden
            />
          </div>
        }
      >
        <PremiumExecutiveBlock ctx={ctx} />
      </Suspense>
    </ExecutiveWorkspace>
  );
}

export function DashboardExecutiveLoading() {
  return (
    <div
      className={cn("mx-auto w-full max-w-[88rem]", exStack[32])}
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <ExecutiveHeroV2Skeleton />
      <div
        className={cn(
          "h-36 bg-white dark:bg-card",
          exRadius[24],
          exAnimations.shimmer,
        )}
        aria-hidden
      />
      <ExecutiveKpiGridSkeleton />
      <div
        className={cn(
          "h-40 bg-white dark:bg-card",
          exRadius[20],
          exAnimations.shimmer,
        )}
        aria-hidden
      />
      <ExecutiveMonthlyEvolutionSkeleton />
      <ExecutiveDailyPerformanceSkeleton />
      <ExecutiveHeatmapV2Skeleton />
      <ExecutiveRankingsGridSkeleton />
      <div
        className={cn(
          "h-48 bg-white dark:bg-card",
          exRadius[20],
          exAnimations.shimmer,
        )}
        aria-hidden
      />
      <ExecutiveFooterSkeleton />
    </div>
  );
}
