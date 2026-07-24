import { Suspense, type ReactNode } from "react";

import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { ExecutiveAiCard } from "@/components/dashboard/executive/executive-ai-card";
import { ExecutiveDashboardHeader } from "@/components/dashboard/executive/executive-dashboard-header";
import { ExecutiveDecisionCenter } from "@/components/dashboard/executive/executive-decision-center";
import { ExecutiveActionPlanSection } from "@/components/dashboard/executive/executive-action-plan-section";
import { ExecutiveIntelligenceSection } from "@/components/dashboard/executive/executive-intelligence-section";
import { ExecutiveFinancialCockpit } from "@/components/dashboard/executive/executive-financial-cockpit";
import { ExecutiveSummarySection } from "@/components/dashboard/executive/executive-summary-section";
import { ResumoVendasHojeCards } from "@/components/dashboard/resumo-vendas-hoje-cards";
import { ResumoLeituraDoDia } from "@/components/dashboard/resumo-leitura-do-dia";
import { ResumoVendasMesTable } from "@/components/dashboard/resumo-vendas-mes-table";
import { CommercialIntelligenceSummaryCard } from "@/components/vendas/commercial-intelligence-summary-card";
import {
  ExecutiveFooter,
  ExecutiveFooterSkeleton,
} from "@/components/dashboard/executive/executive-footer";
import { buildExecutiveAiResult } from "@/lib/ai/executive-ai-snapshot";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import {
  formatDateTimeInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import {
  buildLeituraDoDia,
  calcProjecaoFechamento,
} from "@/lib/dashboard/resumo-vendas-mes";
import { composeExecutiveDecision } from "@/lib/dashboard/executive-decision-service";
import { buildExecutiveIntelligence } from "@/lib/dashboard/executive-intelligence-loader";
import { composeExecutiveActionPlan } from "@/lib/dashboard/executive-action-plan-compose";
import {
  loadExecutiveDashboardContext,
  toDecisionFeeds,
  toIntelligenceFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";
import { composeExecutiveFinancialCockpit } from "@/lib/dashboard/executive-financial-cockpit-service";
import { composeExecutiveSummary } from "@/lib/dashboard/executive-summary-compose";
import { ExecutiveWorkspace } from "@/components/executive/workspace";
import {
  loadDashboardFull,
  loadDashboardHojeSnapshot,
  loadDashboardResumoMes,
} from "@/lib/dashboard/dashboard-loaders";
import { createCommercialIntelligenceService } from "@/lib/vendas/commercial-intelligence-service";
import type { CommercialIntelligenceData } from "@/lib/vendas/commercial-intelligence-compose";
import { exAnimations, exRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
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

function commercialTeaserFromCi(ci: CommercialIntelligenceData | null): {
  faturamento: number | null;
  negociacao: number | null;
  conversaoLabel: string;
  available: boolean;
} {
  if (!ci) {
    return {
      faturamento: null,
      negociacao: null,
      conversaoLabel: "Indisponível",
      available: false,
    };
  }
  const conv = ci.kpis.taxaConversaoComercial;
  return {
    faturamento: ci.kpis.faturamentoPeriodo.value,
    negociacao: ci.kpis.valorEmNegociacao.value,
    conversaoLabel:
      conv.available && conv.value != null
        ? `${conv.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : "Indisponível",
    available: true,
  };
}

async function softLoadCommercial(tenantId: string) {
  try {
    const service = await createCommercialIntelligenceService(tenantId);
    return await service.load({ preset: "mes" });
  } catch {
    return null;
  }
}

function ExecutiveAiSkeleton() {
  return (
    <div
      className={cn("h-48 border bg-card", exRadius[20], exAnimations.shimmer)}
      aria-busy="true"
      aria-label="Carregando IA Executiva"
      data-dashboard-block="ia-executiva-loading"
    />
  );
}

/**
 * Soft-fetch CRM + Estoque isolado — não bloqueia Resumo/Plano/Decisão.
 */
async function ExecutiveAiLazyBlock({
  tenantId,
  tenantSlug,
  cockpit,
  execCtx,
  hoje,
  commercial,
}: {
  tenantId: string;
  tenantSlug: string;
  cockpit: NonNullable<
    Awaited<ReturnType<typeof composeExecutiveFinancialCockpit>>
  >;
  execCtx: Awaited<ReturnType<typeof loadExecutiveDashboardContext>>;
  hoje: NonNullable<Awaited<ReturnType<typeof loadDashboardHojeSnapshot>>>;
  commercial: CommercialIntelligenceData | null;
}) {
  let result: ExecutiveAiResult | null = null;
  try {
    result = await buildExecutiveAiResult({
      tenantId,
      tenantSlug,
      cockpit,
      execCtx,
      hoje,
      commercial,
    });
  } catch {
    result = null;
  }
  if (!result) return null;
  return <ExecutiveAiCard data={result} />;
}

async function HojeExecutiveBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let hojeData = null;
  let resumoData = null;
  let decision = null;
  let intelligence = null;
  let actionPlan = null;
  let cockpit = null;
  let commercial: CommercialIntelligenceData | null = null;
  let execCtxLoaded: Awaited<
    ReturnType<typeof loadExecutiveDashboardContext>
  > | null = null;
  let loadError: unknown = null;
  const centroCustoId =
    ctx.resumoFilters.centroCustoId ?? ctx.filters.centroCusto ?? null;
  try {
    const [hoje, resumo, execCtx, ci] = await Promise.all([
      loadDashboardHojeSnapshot(ctx.tenantId, centroCustoId),
      loadDashboardResumoMes(ctx.tenantId, {
        year: ctx.resumoFilters.year,
        month: ctx.resumoFilters.month,
        centroCustoId,
        vendedorId: ctx.resumoFilters.vendedorId ?? null,
        origem: ctx.resumoFilters.origem ?? null,
      }),
      loadExecutiveDashboardContext(ctx.tenantId, ctx.tenantSlug),
      softLoadCommercial(ctx.tenantId),
    ]);
    hojeData = hoje;
    resumoData = resumo;
    commercial = ci;
    execCtxLoaded = execCtx;
    decision = composeExecutiveDecision({
      tenantSlug: ctx.tenantSlug,
      hoje,
      resumo,
      feeds: toDecisionFeeds(execCtx),
    });
    intelligence = buildExecutiveIntelligence({
      feeds: toIntelligenceFeeds(execCtx),
    });
    cockpit = composeExecutiveFinancialCockpit(execCtx);
    actionPlan = composeExecutiveActionPlan({
      tenantSlug: ctx.tenantSlug,
      decisionItems: decision.items,
      intelligence,
      cockpit,
    });
  } catch (error) {
    loadError = error;
  }

  if (
    loadError ||
    !hojeData ||
    !resumoData ||
    !decision ||
    !intelligence ||
    !actionPlan ||
    !cockpit ||
    !execCtxLoaded
  ) {
    return (
      <SectionError
        tenantSlug={ctx.tenantSlug}
        description={errorMessage(
          loadError,
          "Não foi possível carregar o faturamento de hoje.",
        )}
      />
    );
  }

  const summary = composeExecutiveSummary({
    decision,
    actionPlan,
    intelligence,
    cockpit,
  });
  const ciTeaser = commercialTeaserFromCi(commercial);

  return (
    <div className="space-y-6" data-dashboard-block="hoje-v2">
      <ExecutiveDashboardHeader
        greeting={ctx.greeting}
        tenantName={ctx.tenantName}
        dataHoje={hojeData.data_hoje}
        updatedAtLabel={hojeData.atualizado_em_label}
        status={hojeData.hoje.status}
      />
      <ResumoVendasHojeCards data={hojeData} />
      <CommercialIntelligenceSummaryCard
        tenantSlug={ctx.tenantSlug}
        faturamento={ciTeaser.faturamento}
        negociacao={ciTeaser.negociacao}
        conversaoLabel={ciTeaser.conversaoLabel}
        available={ciTeaser.available}
      />
      <ExecutiveSummarySection data={summary} />
      <Suspense fallback={<ExecutiveAiSkeleton />}>
        <ExecutiveAiLazyBlock
          tenantId={ctx.tenantId}
          tenantSlug={ctx.tenantSlug}
          cockpit={cockpit}
          execCtx={execCtxLoaded}
          hoje={hojeData}
          commercial={commercial}
        />
      </Suspense>
      <ExecutiveActionPlanSection data={actionPlan} />
      <ExecutiveDecisionCenter
        data={decision}
        tenantSlug={ctx.tenantSlug}
      />
      <ExecutiveIntelligenceSection
        data={intelligence}
        tenantSlug={ctx.tenantSlug}
      />
      <ExecutiveFinancialCockpit
        data={cockpit}
        tenantSlug={ctx.tenantSlug}
      />
      <ResumoLeituraDoDia
        insights={buildLeituraDoDia({
          metaHoje: hojeData.hoje.meta,
          realizadoHoje: hojeData.hoje.faturamento,
          diferencaHoje:
            hojeData.hoje.meta == null
              ? null
              : hojeData.hoje.faturamento - hojeData.hoje.meta,
          ticketHoje: hojeData.hoje.ticket_medio,
          ticketMedioMes: hojeData.mes.ticket_medio,
          projecaoFechamento:
            calcProjecaoFechamento({
              realizadoAcumulado: resumoData.total.realizado_acumulado,
              diasDecorridos: resumoData.rows.filter((r) => r.kind !== "futuro")
                .length,
              diasTotais: resumoData.rows.length,
            }) ?? hojeData.mes.projecao_fechamento,
          metaMensal: resumoData.meta_mensal,
        })}
      />
      <ResumoVendasMesTable
        tenantSlug={ctx.tenantSlug}
        data={resumoData}
        centrosCusto={ctx.filterOptions.centrosCusto}
        initialFilters={{
          year: ctx.resumoFilters.year,
          month: ctx.resumoFilters.month,
          centroCustoId: ctx.resumoFilters.centroCustoId,
          origem: ctx.resumoFilters.origem,
        }}
      />
    </div>
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
      greeting={ctx.greeting}
      filters={ctx.filters}
      filterOptions={ctx.filterOptions}
      updatedAtLabel={updatedAtLabel}
      lead={onboardingLead}
      aboveLayout={
        <Suspense
          fallback={
            <div
              className={cn(
                "h-72 bg-white dark:bg-card",
                exRadius[20],
                exAnimations.shimmer,
              )}
              aria-label="Carregando resumo de vendas"
            />
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
    <div
      className={cn("mx-auto w-full max-w-[96rem] space-y-6 px-4")}
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <div
        className={cn(
          "h-72 bg-white dark:bg-card",
          exRadius[20],
          exAnimations.shimmer,
        )}
      />
      <ExecutiveFooterSkeleton />
    </div>
  );
}
