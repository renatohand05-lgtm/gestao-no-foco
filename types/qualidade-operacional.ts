import type { DashboardChartPoint, DashboardKpiComparison } from "@/types/dashboard-executive";

export const RETORNO_SERVICOS_META_PCT = 2;

export type RetornoStatusCor = "verde" | "amarelo" | "vermelho";

export type RetornoServicosKpi = {
  taxaRetornoPct: number;
  quantidadeRetornos: number;
  totalServicosConcluidos: number;
  metaPct: number;
  statusCor: RetornoStatusCor;
  comparison: DashboardKpiComparison;
};

export type RetornoFinanceiroResumo = {
  receita_perdida: number;
  pecas_garantia: number;
  horas_mao_obra: number;
  custo_total: number;
};

export type RetornoDrillDownItem = {
  id: string;
  cliente: string;
  veiculo: string;
  osOriginal: string;
  osOriginalId: string;
  dataRetorno: string;
  diasEntreServicoRetorno: number;
  motivo: string;
  mecanico: string;
  valorRetorno: number;
  tipoCobertura: "garantia" | "pago";
};

export type QualidadeOperacionalRankingItem = {
  id: string;
  label: string;
  value: number;
  /** Quantidade de retornos (rankings de mecânico/motivo/serviço). */
  quantidade?: number;
};

export type QualidadeOperacionalRankings = {
  mecanicos: QualidadeOperacionalRankingItem[];
  motivos: QualidadeOperacionalRankingItem[];
  servicos: QualidadeOperacionalRankingItem[];
};

export type QualidadeOperacionalEvolucaoPoint = {
  label: string;
  data: string;
  taxaPct: number;
  quantidade: number;
  valorPerdido: number;
};

export type QualidadeOperacionalData = {
  kpi: RetornoServicosKpi;
  financeiro: RetornoFinanceiroResumo;
  rankings: QualidadeOperacionalRankings;
  evolucaoMensal: QualidadeOperacionalEvolucaoPoint[];
  drillDown: RetornoDrillDownItem[];
  hasData: boolean;
};

export type QualidadeOperacionalAlertInput = {
  tenantSlug: string;
  kpi: RetornoServicosKpi;
  rankings: QualidadeOperacionalRankings;
  financeiro: RetornoFinanceiroResumo;
};

export type QualidadeOperacionalChartSeries = {
  taxaRetorno: DashboardChartPoint[];
  quantidadeRetornos: DashboardChartPoint[];
  valorPerdido: DashboardChartPoint[];
};
