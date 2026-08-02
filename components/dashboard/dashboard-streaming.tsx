import { Suspense, type ReactNode } from "react";

import { PremiumGlobalLoader } from "@/components/brand";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { ExecutiveAiCard } from "@/components/dashboard/executive/executive-ai-card";
import {
  ExecutiveFooter,
  ExecutiveFooterSkeleton,
} from "@/components/dashboard/executive/executive-footer";
import { PremiumDashboardView } from "@/components/dashboard/premium/premium-dashboard-view";
import { PremiumMainRow } from "@/components/dashboard/premium/premium-main-row";
import { buildPremiumInsights } from "@/lib/dashboard/premium-dashboard-map";
import { buildExecutiveAiBundle } from "@/lib/ai/executive-ai-snapshot";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import {
  runPredictiveEngine,
  type PredictiveIntelligenceResult,
} from "@/lib/predictive";
import {
  formatDateTimeInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { composeExecutiveDecision } from "@/lib/dashboard/executive-decision-service";
import {
  composeOpsExecutiveIntelligence,
} from "@/lib/enterprise";
import {
  loadExecutiveDashboardContext,
  toDecisionFeeds,
  toIntelligenceFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";
import { composeExecutiveFinancialCockpit } from "@/lib/dashboard/executive-financial-cockpit-service";
import { ExecutiveWorkspace } from "@/components/executive/workspace";
import {
  loadDashboardCharts,
  loadDashboardFull,
  loadDashboardHojeSnapshot,
  loadDashboardPrimary,
  loadDashboardResumoMes,
} from "@/lib/dashboard/dashboard-loaders";
import { createCommercialIntelligenceService } from "@/lib/vendas/commercial-intelligence-service";
import type { CommercialIntelligenceData } from "@/lib/vendas/commercial-intelligence-compose";
import { ExecutiveCommandCenterSkeleton } from "@/components/dashboard/executive-command-center";
import { ExecutivePage, ExecutiveSkeleton } from "@/components/executive";
import { gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardCharts,
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";
import type { TenantSegment } from "@/types";

export type ResumoMesUiFilters = {
  year: number;
  month: number;
  centroCustoId?: string;
  vendedorId?: string;
  origem?: string;
};

export type DashboardStreamCtx = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  filters: DashboardFilters;
  greeting: string;
  filterOptions: DashboardFilterOptions;
  resumoFilters: ResumoMesUiFilters;
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

async function FooterBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  return (
    <ExecutiveFooter
      tenantSlug={ctx.tenantSlug}
      tenantName={ctx.tenantName}
      exportActions={
        <Suspense fallback={<DashboardExportActionsSkeleton />}>
          <ExportActionsBlock ctx={ctx} />
        </Suspense>
      }
    />
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
  onboardingLead?: ReactNode;
};

async function softLoadCommercial(tenantId: string) {
  try {
    const service = await createCommercialIntelligenceService(tenantId);
    return await service.load({ preset: "mes" });
  } catch {
    return null;
  }
}

async function softLoadPrimary(
  tenantId: string,
  segment: TenantSegment | null,
  filters: DashboardFilters,
) {
  try {
    return await loadDashboardPrimary(tenantId, segment, filters);
  } catch {
    return null;
  }
}

async function softLoadCharts(
  tenantId: string,
  segment: TenantSegment | null,
  filters: DashboardFilters,
) {
  try {
    return await loadDashboardCharts(tenantId, segment, filters);
  } catch {
    return null;
  }
}

function ExecutiveAiSkeleton() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Carregando inteligência executiva"
      data-dashboard-block="ia-executiva-loading"
    >
      <ExecutiveCommandCenterSkeleton />
      <div
        className={cn(
          "space-y-3 border border-border/60 bg-card p-5",
          gofRadius.xl,
        )}
      >
        <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
        <ExecutiveSkeleton heightClassName="h-24" widthClassName="w-full" />
      </div>
    </div>
  );
}

function formatLongDateLabel(civilDate: string) {
  const [y, m, d] = civilDate.split("-").map(Number);
  if (!y || !m || !d) return civilDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function ExecutiveAiLazyBlock({
  tenantId,
  tenantSlug,
  cockpit,
  execCtx,
  hoje,
  decision,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  charts = null,
}: {
  tenantId: string;
  tenantSlug: string;
  cockpit: NonNullable<
    Awaited<ReturnType<typeof composeExecutiveFinancialCockpit>>
  >;
  execCtx: Awaited<ReturnType<typeof loadExecutiveDashboardContext>>;
  hoje: NonNullable<Awaited<ReturnType<typeof loadDashboardHojeSnapshot>>>;
  decision: NonNullable<
    Awaited<ReturnType<typeof composeExecutiveDecision>>
  > | null;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  charts?: DashboardCharts | null;
}) {
  // Sprint 30.4.1 — CI fora do first paint (só alimenta IA/Command Center)
  const commercial: CommercialIntelligenceData | null =
    await softLoadCommercial(tenantId);

  let result: ExecutiveAiResult | null = null;
  let predictive: PredictiveIntelligenceResult | null = null;
  let feeds: Awaited<ReturnType<typeof buildExecutiveAiBundle>>["input"] | null =
    null;
  try {
    const bundle = await buildExecutiveAiBundle({
      tenantId,
      tenantSlug,
      cockpit,
      execCtx,
      hoje,
      commercial,
    });
    result = bundle.result;
    feeds = bundle.input;
    predictive = runPredictiveEngine({
      tenantSlug,
      ai: bundle.result,
      feeds: bundle.input,
      hoje: {
        faturamentoHoje: hoje.hoje.faturamento,
        metaHoje: hoje.hoje.meta,
        percentualHoje: hoje.hoje.percentual,
        projecaoFechamentoMes: hoje.mes.projecao_fechamento,
      },
    });
  } catch {
    result = null;
    predictive = null;
    feeds = null;
  }
  if (!result || !predictive) {
    return (
      <SectionError
        tenantSlug={tenantSlug}
        description="Não foi possível montar o snapshot de IA Executiva neste ciclo."
      />
    );
  }
  return (
    <ExecutiveAiCard
      data={result}
      decision={decision}
      tenantSlug={tenantSlug}
      greeting={greeting}
      tenantName={tenantName}
      dateLabel={dateLabel}
      updatedAtLabel={updatedAtLabel}
      predictive={predictive}
      feeds={feeds}
      charts={charts}
      hoje={{
        faturamentoHoje: hoje.hoje.faturamento,
        metaHoje: hoje.hoje.meta,
        percentualHoje: hoje.hoje.percentual,
        ticketMedioHoje: hoje.hoje.ticket_medio,
        ticketMedioMes: hoje.mes.ticket_medio,
        faturamentoMes: hoje.mes.faturamento,
        metaMes: hoje.mes.meta,
        percentualMes: hoje.mes.percentual,
        projecaoFechamento: hoje.mes.projecao_fechamento,
      }}
    />
  );
}

function ChartsMainRowSkeleton() {
  return (
    <div
      className={cn(
        "h-56 animate-pulse rounded-2xl border border-[var(--brand-gold)]/15 bg-muted/30",
        gofMotion.skeleton,
      )}
      aria-busy="true"
      aria-label="Carregando gráficos do ciclo"
      data-premium-block="charts-loading"
      data-sprint="30.4.1"
    />
  );
}

/**
 * Sprint 30.4.1 — gráficos/DRE series fora do first paint.
 * Mesmos loaders/cache; só adia o await de charts pesados.
 */
async function ChartsMainRowBlock({
  ctx,
  cockpit,
  intelligence,
  decision,
  estoqueAbaixoMinimo,
  periodoLabel,
  primary,
}: {
  ctx: DashboardStreamCtx;
  cockpit: NonNullable<
    Awaited<ReturnType<typeof composeExecutiveFinancialCockpit>>
  >;
  intelligence: NonNullable<
    Awaited<ReturnType<typeof composeOpsExecutiveIntelligence>>
  >;
  decision: NonNullable<Awaited<ReturnType<typeof composeExecutiveDecision>>>;
  estoqueAbaixoMinimo: number | null;
  periodoLabel: string;
  primary: Awaited<ReturnType<typeof softLoadPrimary>>;
}) {
  const charts = await softLoadCharts(
    ctx.tenantId,
    ctx.segment,
    ctx.filters,
  );
  const insights = buildPremiumInsights({
    cockpit,
    intelligence,
    decision,
    estoqueAbaixoMinimo,
    primary,
    charts,
    tenantSlug: ctx.tenantSlug,
  });

  return (
    <PremiumMainRow
      faturamentoDiario={charts?.faturamentoDiario ?? []}
      receitasVsDespesas={
        charts?.receitasVsDespesas ??
        primary?.fluxoCharts.receitasVsDespesas ??
        []
      }
      insights={insights}
      cockpit={cockpit}
      tenantSlug={ctx.tenantSlug}
      periodoLabel={periodoLabel}
    />
  );
}

async function HojeExecutiveBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let hojeData = null;
  let decision = null;
  let intelligence = null;
  let cockpit = null;
  let primary = null;
  let execCtxLoaded: Awaited<
    ReturnType<typeof loadExecutiveDashboardContext>
  > | null = null;
  let loadError: unknown = null;
  const centroCustoId =
    ctx.resumoFilters.centroCustoId ?? ctx.filters.centroCusto ?? null;
  try {
    // Sprint 30.4.1 — critical path sem CI e sem charts (8× DRE)
    const [hoje, resumo, execCtx, primaryData] = await Promise.all([
      loadDashboardHojeSnapshot(ctx.tenantId, centroCustoId),
      loadDashboardResumoMes(ctx.tenantId, {
        year: ctx.resumoFilters.year,
        month: ctx.resumoFilters.month,
        centroCustoId,
        vendedorId: ctx.resumoFilters.vendedorId ?? null,
        origem: ctx.resumoFilters.origem ?? null,
      }),
      loadExecutiveDashboardContext(ctx.tenantId, ctx.tenantSlug),
      softLoadPrimary(ctx.tenantId, ctx.segment, ctx.filters),
    ]);
    hojeData = hoje;
    primary = primaryData;
    execCtxLoaded = execCtx;
    decision = composeExecutiveDecision({
      tenantSlug: ctx.tenantSlug,
      hoje,
      resumo,
      feeds: toDecisionFeeds(execCtx),
    });
    intelligence = composeOpsExecutiveIntelligence({
      feeds: toIntelligenceFeeds(execCtx),
    });
    cockpit = composeExecutiveFinancialCockpit(execCtx);
  } catch (error) {
    loadError = error;
  }

  if (
    loadError ||
    !hojeData ||
    !decision ||
    !intelligence ||
    !cockpit ||
    !execCtxLoaded
  ) {
    return (
      <SectionError
        tenantSlug={ctx.tenantSlug}
        description={errorMessage(
          loadError,
          "Não foi possível carregar o dashboard premium.",
        )}
      />
    );
  }

  const dateLabel = formatLongDateLabel(hojeData.data_hoje);
  const periodoLabel =
    primary?.periodo.label ??
    `${ctx.filters.dataDe} → ${ctx.filters.dataAte}`;
  const estoqueAbaixoMinimo = execCtxLoaded.estoque?.abaixoMinimo ?? null;

  return (
    <ExecutivePage width="full" spacing="loose" className="max-w-none px-0 py-0">
      <PremiumDashboardView
        tenantSlug={ctx.tenantSlug}
        tenantName={ctx.tenantName}
        greeting={ctx.greeting}
        segment={ctx.segment}
        hoje={hojeData}
        primary={primary}
        charts={null}
        cockpit={cockpit}
        intelligence={intelligence}
        decision={decision}
        estoqueAbaixoMinimo={estoqueAbaixoMinimo}
        periodoLabel={periodoLabel}
        mainRowSlot={
          <Suspense fallback={<ChartsMainRowSkeleton />}>
            <ChartsMainRowBlock
              ctx={ctx}
              cockpit={cockpit}
              intelligence={intelligence}
              decision={decision}
              estoqueAbaixoMinimo={estoqueAbaixoMinimo}
              periodoLabel={periodoLabel}
              primary={primary}
            />
          </Suspense>
        }
        aiSlot={
          <Suspense fallback={<ExecutiveAiSkeleton />}>
            <ExecutiveAiLazyBlock
              tenantId={ctx.tenantId}
              tenantSlug={ctx.tenantSlug}
              cockpit={cockpit}
              execCtx={execCtxLoaded}
              hoje={hojeData}
              decision={decision}
              greeting={ctx.greeting}
              tenantName={ctx.tenantName}
              dateLabel={dateLabel}
              updatedAtLabel={hojeData.atualizado_em_label}
              charts={null}
            />
          </Suspense>
        }
      />
    </ExecutivePage>
  );
}

export function DashboardStreamingView({
  ctx,
  onboardingLead,
}: DashboardStreamingViewProps) {
  const tz = resolveTenantTimezone();
  const updatedAtLabel = formatDateTimeInTimezone(new Date(), tz);

  return (
    <ExecutiveWorkspace
      tenantSlug={ctx.tenantSlug}
      tenantName={ctx.tenantName}
      filters={ctx.filters}
      filterOptions={ctx.filterOptions}
      updatedAtLabel={updatedAtLabel}
      lead={onboardingLead}
      aboveLayout={
        <Suspense
          fallback={
            <div
              className={cn(
                "space-y-3 border border-[var(--brand-gold)]/20 bg-card/60 p-4 sm:p-5",
                gofRadius.lg,
              )}
              aria-label="Carregando cockpit executivo"
              aria-busy="true"
              data-premium-block="loading"
              data-sprint="30.4.1"
            >
              <div
                className={cn("h-16 rounded-xl bg-muted/40", gofMotion.skeleton)}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <div
                  className={cn("h-24 rounded-xl bg-muted/35", gofMotion.skeleton)}
                />
                <div
                  className={cn("h-24 rounded-xl bg-muted/35", gofMotion.skeleton)}
                />
                <div
                  className={cn("h-24 rounded-xl bg-muted/35", gofMotion.skeleton)}
                />
              </div>
              <div
                className={cn("h-40 rounded-xl bg-muted/30", gofMotion.skeleton)}
              />
            </div>
          }
        >
          <HojeExecutiveBlock ctx={ctx} />
        </Suspense>
      }
      footer={
        <Suspense fallback={<ExecutiveFooterSkeleton />}>
          <FooterBlock ctx={ctx} />
        </Suspense>
      }
    />
  );
}

export function DashboardExecutiveLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-[70vh]"
      label="Carregando conteúdo"
    />
  );
}
