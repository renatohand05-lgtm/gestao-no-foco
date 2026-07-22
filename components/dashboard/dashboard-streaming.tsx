import { Suspense, type ReactNode } from "react";

import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { ExecutiveDashboardHeader } from "@/components/dashboard/executive/executive-dashboard-header";
import { ResumoVendasHojeCards } from "@/components/dashboard/resumo-vendas-hoje-cards";
import { ResumoLeituraDoDia } from "@/components/dashboard/resumo-leitura-do-dia";
import { ResumoVendasMesTable } from "@/components/dashboard/resumo-vendas-mes-table";
import {
  ExecutiveFooter,
  ExecutiveFooterSkeleton,
} from "@/components/dashboard/executive";
import {
  formatDateTimeInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import {
  buildLeituraDoDia,
  calcProjecaoFechamento,
} from "@/lib/dashboard/resumo-vendas-mes";
import { ExecutiveWorkspace } from "@/components/executive/workspace";
import {
  loadDashboardFull,
  loadDashboardHojeSnapshot,
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
      <ExecutiveDashboardHeader
        greeting={ctx.greeting}
        tenantName={ctx.tenantName}
        dataHoje={hojeData.data_hoje}
        updatedAtLabel={hojeData.atualizado_em_label}
        status={hojeData.hoje.status}
      />
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
