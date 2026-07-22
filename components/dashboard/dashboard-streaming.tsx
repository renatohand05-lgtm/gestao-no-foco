import { Suspense, type ReactNode } from "react";

import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import { ResumoVendasHojeCards } from "@/components/dashboard/resumo-vendas-hoje-cards";
import { ResumoLeituraDoDia } from "@/components/dashboard/resumo-leitura-do-dia";
import { ResumoVendasMesTable } from "@/components/dashboard/resumo-vendas-mes-table";
import {
  ExecutiveFooter,
  ExecutiveFooterSkeleton,
} from "@/components/dashboard/executive";
import { ExecutiveWorkspaceFooter } from "@/components/executive/workspace/executive-workspace-footer";
import {
  formatDateTimeInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import {
  buildLeituraDoDia,
  calcProjecaoFechamento,
} from "@/lib/dashboard/resumo-vendas-mes";
import {
  buildFooterExecutiveItems,
  footerStatusLabelFromHoje,
} from "@/lib/dashboard/footer-executive-items";
import { formatCurrency } from "@/lib/dashboard/format";
import { ExecutiveWorkspace } from "@/components/executive/workspace";
import {
  loadDashboardFull,
  loadDashboardHojeSnapshot,
  loadDashboardPrimary,
  loadDashboardResumoMes,
} from "@/lib/dashboard/dashboard-loaders";
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
  let primary;
  let hojeData;
  let resumoData;
  const centroCustoId =
    ctx.resumoFilters.centroCustoId ?? ctx.filters.centroCusto ?? null;

  try {
    [primary, hojeData, resumoData] = await Promise.all([
      loadDashboardPrimary(ctx.tenantId, ctx.segment, ctx.filters),
      loadDashboardHojeSnapshot(ctx.tenantId, centroCustoId),
      loadDashboardResumoMes(ctx.tenantId, {
        year: ctx.resumoFilters.year,
        month: ctx.resumoFilters.month,
        centroCustoId,
        vendedorId: ctx.resumoFilters.vendedorId ?? null,
        origem: ctx.resumoFilters.origem ?? null,
      }),
    ]);
  } catch (error) {
    return (
      <SectionError
        tenantSlug={ctx.tenantSlug}
        description={errorMessage(error, "Erro ao carregar o rodapé.")}
      />
    );
  }

  const updatedAtLabel = hojeData.atualizado_em_label;
  const smartItems = buildFooterExecutiveItems({
    hoje: hojeData,
    resumo: resumoData,
  });

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
        statusLabel={footerStatusLabelFromHoje(hojeData)}
        metaDiaria={
          hojeData.hoje.meta == null
            ? undefined
            : formatCurrency(hojeData.hoje.meta)
        }
        realizadoDia={formatCurrency(hojeData.hoje.faturamento)}
        items={smartItems}
        panelDetails={{
          periodoLabel: primary.periodo.label,
          filterChips,
          observacao: undefined,
          fontes:
            "Vendas faturadas (líquido) · meta diária (override/rateio) · resumo do mês · timezone America/Sao_Paulo",
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
  onboardingLead?: ReactNode;
};

async function HojeExecutiveBlock({ ctx }: { ctx: DashboardStreamCtx }) {
  let hojeData = null;
  let resumoData = null;
  let loadError: unknown = null;
  const centroCustoId =
    ctx.resumoFilters.centroCustoId ?? ctx.filters.centroCusto ?? null;
  try {
    [hojeData, resumoData] = await Promise.all([
      loadDashboardHojeSnapshot(ctx.tenantId, centroCustoId),
      loadDashboardResumoMes(ctx.tenantId, {
        year: ctx.resumoFilters.year,
        month: ctx.resumoFilters.month,
        centroCustoId,
        vendedorId: ctx.resumoFilters.vendedorId ?? null,
        origem: ctx.resumoFilters.origem ?? null,
      }),
    ]);
  } catch (error) {
    loadError = error;
  }

  if (loadError || !hojeData || !resumoData) {
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

  return (
    <div className="space-y-6" data-dashboard-block="hoje-v2">
      <DashboardRefreshButton updatedAtLabel={hojeData.atualizado_em_label} />
      <ResumoVendasHojeCards data={hojeData} />
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
