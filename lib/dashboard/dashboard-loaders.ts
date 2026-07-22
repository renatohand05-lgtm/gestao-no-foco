import { cache } from "react";

import {
  createDashboardService,
  type DashboardServiceContext,
} from "@/lib/dashboard/dashboard-service";
import type {
  DashboardCharts,
  DashboardExecutiveData,
  DashboardFilters,
  DashboardPrimaryData,
  DashboardRankings,
} from "@/types/dashboard-executive";
import type { CommercialPanelData } from "@/types/commercial-panel";
import type { QualidadeOperacionalData } from "@/types/qualidade-operacional";
import type { TenantSegment } from "@/types";
import type { DashboardIntelligenceResult } from "@/types/intelligence";
import { createCommercialPanelService } from "@/lib/metas/commercial-panel-service";
import {
  createVendasDiaService,
  type DashboardHojeSnapshot,
} from "@/lib/dashboard/vendas-dia-service";
import {
  createResumoVendasMesService,
  type ResumoMesFilters,
  type ResumoVendasMesData,
} from "@/lib/dashboard/resumo-vendas-mes-service";

/**
 * Loaders memoizados por request (React.cache).
 * Sem cache cross-request / cross-tenant de dados financeiros.
 */

export const loadDashboardPrimary = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
  ): Promise<DashboardPrimaryData> => {
    const service = await createDashboardService(tenantId, segment);
    return service.getPrimaryData(filters);
  },
);

export const loadDashboardCharts = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
  ): Promise<DashboardCharts> => {
    const [primary, service] = await Promise.all([
      loadDashboardPrimary(tenantId, segment, filters),
      createDashboardService(tenantId, segment),
    ]);
    const heavy = await service.getHeavyChartSeries(filters);

    return {
      faturamentoDiario: heavy.faturamentoDiario,
      receitasVsDespesas: primary.fluxoCharts.receitasVsDespesas,
      fluxoAcumulado: primary.fluxoCharts.fluxoAcumulado,
      ebitdaEvolucao: heavy.ebitdaEvolucao,
    };
  },
);

export const loadDashboardRankings = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
  ): Promise<DashboardRankings> => {
    const service = await createDashboardService(tenantId, segment);
    return service.getRankingsData(filters);
  },
);

export const loadDashboardQuality = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
  ): Promise<QualidadeOperacionalData> => {
    const service = await createDashboardService(tenantId, segment);
    return service.getQualityData(filters);
  },
);

export const loadDashboardCommercialPanel = cache(
  async (
    tenantId: string,
    filters: DashboardFilters,
  ): Promise<CommercialPanelData> => {
    const service = await createCommercialPanelService(tenantId);
    return service.getPanel(filters);
  },
);

/** Snapshot de hoje — fonte única dos KPIs superiores e do rodapé. */
export const loadDashboardHojeSnapshot = cache(
  async (
    tenantId: string,
    centroCustoId: string | null,
  ): Promise<DashboardHojeSnapshot> => {
    const service = await createVendasDiaService(tenantId);
    return service.getSnapshot(centroCustoId);
  },
);

/** Resumo mensal — mesma fonte da tabela e da leitura do dia. */
export const loadDashboardResumoMes = cache(
  async (
    tenantId: string,
    filters: ResumoMesFilters,
  ): Promise<ResumoVendasMesData> => {
    const service = await createResumoVendasMesService(tenantId);
    return service.getResumo(filters);
  },
);

export const loadDashboardIntelligence = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
    context: DashboardServiceContext,
  ): Promise<{
    intelligence: DashboardIntelligenceResult;
    rankings: DashboardRankings;
    qualidadeOperacional: QualidadeOperacionalData;
    primary: DashboardPrimaryData;
  }> => {
    const [primary, rankings, qualidadeOperacional] = await Promise.all([
      loadDashboardPrimary(tenantId, segment, filters),
      loadDashboardRankings(tenantId, segment, filters),
      loadDashboardQuality(tenantId, segment, filters),
    ]);

    const service = await createDashboardService(tenantId, segment);
    const intelligence = await service.buildIntelligenceFromParts(
      filters,
      context,
      primary,
      rankings,
      qualidadeOperacional,
    );

    return { intelligence, rankings, qualidadeOperacional, primary };
  },
);

/** Payload completo para exportação — reutiliza loaders cacheados. */
export const loadDashboardFull = cache(
  async (
    tenantId: string,
    segment: TenantSegment | null,
    filters: DashboardFilters,
    context: DashboardServiceContext,
  ): Promise<DashboardExecutiveData> => {
    const [primary, charts, intelligenceBundle] = await Promise.all([
      loadDashboardPrimary(tenantId, segment, filters),
      loadDashboardCharts(tenantId, segment, filters),
      loadDashboardIntelligence(tenantId, segment, filters, context),
    ]);

    return {
      kpis: primary.kpis,
      comparisons: primary.comparisons,
      charts,
      rankings: intelligenceBundle.rankings,
      intelligence: intelligenceBundle.intelligence,
      qualidadeOperacional: intelligenceBundle.qualidadeOperacional,
      periodo: primary.periodo,
      periodoAnterior: primary.periodoAnterior,
      filters,
      segment,
      hasData: primary.hasData,
    };
  },
);
