/**
 * Fase 23 — Analytics Core · contratos reutilizáveis.
 * Nenhuma fórmula de domínio aqui — apenas tipos e semântica.
 */

export type AnalyticsArea =
  | "financeiro"
  | "vendas"
  | "clientes"
  | "operacoes"
  | "estoque"
  | "tributario"
  | "metas"
  | "executivo";

export type MetricUnit =
  | "currency"
  | "percent"
  | "ratio"
  | "count"
  | "days"
  | "score";

/** Polaridade para tom de variação (catálogo — não nos componentes). */
export type MetricPolarity =
  | "higher_is_better"
  | "lower_is_better"
  | "neutral";

export type MetricConfidence = "high" | "medium" | "low" | "none";

export type MetricAvailability = "available" | "unavailable" | "partial";

export type MetricDimension =
  | "tenant"
  | "empresa"
  | "filial"
  | "centro_custo"
  | "periodo"
  | "categoria"
  | "unidade"
  | "responsavel"
  | "produto"
  | "servico"
  | "cliente"
  | "fornecedor"
  | "canal"
  | "status"
  | "regime"
  | "vendedor";

export type AnalyticsPeriodPreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "quarter"
  | "semester"
  | "year"
  | "last_7"
  | "last_30"
  | "last_90"
  | "last_365"
  | "custom";

export type AnalyticsDateRange = {
  from: string;
  to: string;
  preset: AnalyticsPeriodPreset;
  label: string;
};

export type MetricFilter = {
  empresaIds?: string[];
  filialIds?: string[];
  centroCustoIds?: string[];
  categoriaIds?: string[];
  unidadeIds?: string[];
  responsavelIds?: string[];
  produtoIds?: string[];
  servicoIds?: string[];
  clienteIds?: string[];
  fornecedorIds?: string[];
  canais?: string[];
  statuses?: string[];
  period: AnalyticsDateRange;
};

export type AnalyticsContext = {
  tenantId: string;
  tenantSlug: string;
  userId: string | null;
  permissions: readonly string[];
  filters: MetricFilter;
  asOf: string;
  correlationId?: string | null;
};

export type MetricDefinition = {
  id: string;
  name: string;
  description: string;
  /** Descrição da fórmula — referência ao serviço fonte, não reimplementação. */
  formula: string;
  /** Módulo/serviço fonte da verdade. */
  source: string;
  area: AnalyticsArea;
  unit: MetricUnit;
  polarity: MetricPolarity;
  dimensions: MetricDimension[];
  requiredPermission: string;
  availability: MetricAvailability;
  unavailableReason?: string;
  supportsDrillDown: boolean;
  supportsTarget: boolean;
};

export type MetricResult = {
  definitionId: string;
  name: string;
  value: number | null;
  formatted: string;
  unit: MetricUnit;
  period: AnalyticsDateRange;
  filtersApplied: MetricFilter;
  source: string;
  origin: string;
  updatedAt: string;
  confidence: MetricConfidence;
  confidenceReason: string;
  availability: MetricAvailability;
  unavailableReason?: string;
  tenantId: string;
  empresaId?: string | null;
  filialId?: string | null;
  dimensions: Partial<Record<MetricDimension, string | null>>;
  drillDownAvailable: boolean;
  methodology: string;
};

export type MetricComparison = {
  definitionId: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  deltaPercent: number | null;
  trend: "up" | "down" | "neutral";
  tone: "positive" | "negative" | "warning" | "neutral";
  polarity: MetricPolarity;
  explanation: string;
};

export type MetricTrendPoint = {
  period: string;
  value: number | null;
};

export type MetricTrend = {
  definitionId: string;
  points: MetricTrendPoint[];
  movingAverage: number | null;
  linearSlope: number | null;
  methodology: string;
  confidence: MetricConfidence;
  dataPoints: number;
  limitations: string[];
  updatedAt: string;
};

export type MetricTarget = {
  definitionId: string;
  target: number | null;
  realized: number | null;
  projected: number | null;
  attainment: number | null;
  gap: number | null;
  probabilityLabel: string | null;
  source: string;
  available: boolean;
  unavailableReason?: string;
};

export type MetricDrillDownItem = {
  id: string;
  label: string;
  value: number;
  date?: string | null;
  origin?: string | null;
  responsible?: string | null;
  status?: string | null;
  empresaId?: string | null;
  filialId?: string | null;
  costCenterId?: string | null;
  categoryId?: string | null;
  documentRef?: string | null;
  auditHint?: string | null;
};

export type MetricDrillDown = {
  definitionId: string;
  level: MetricDimension | "documento" | "lancamento" | "origem" | "auditoria";
  items: MetricDrillDownItem[];
  total: number;
  methodology: string;
  traceable: boolean;
};

export type AnalyticsAlertSeverity = "info" | "attention" | "critical";

export type AnalyticsAlert = {
  id: string;
  dedupeKey: string;
  title: string;
  description: string;
  severity: AnalyticsAlertSeverity;
  period: AnalyticsDateRange;
  impact: number | null;
  probableCause: string;
  relatedMetricIds: string[];
  recommendation: string;
  status: "open" | "acknowledged";
  responsibleHint: string | null;
  requiresHumanReview: true;
  autoApplied: false;
};

export type AnalyticsInsight = {
  id: string;
  title: string;
  summary: string;
  dataUsed: string[];
  period: AnalyticsDateRange;
  confidence: MetricConfidence;
  origin: string;
  limitations: string[];
  suggestedQuestions: string[];
  requiresHumanReview: true;
  autoExecuted: false;
};

export type AnalyticsProviderKind = "deterministic" | "external" | "mock";

export type AnalyticsProvider = {
  id: string;
  kind: AnalyticsProviderKind;
  label: string;
  explain: (input: {
    metrics: MetricResult[];
    comparisons: MetricComparison[];
    alerts: AnalyticsAlert[];
    context: AnalyticsContext;
  }) => AnalyticsInsight[];
};

export type AnalyticsExportFormat = "csv" | "excel" | "pdf" | "print";

export type AnalyticsExportStatus = {
  format: AnalyticsExportFormat;
  status: "ready" | "preparing" | "disabled";
  featureFlag?: string;
  message: string;
};

export type DashboardWidgetDefinition = {
  id: string;
  title: string;
  metricIds: string[];
  area: AnalyticsArea;
  defaultVisible: boolean;
};

export type DashboardLayoutConfig = {
  version: 1;
  widgets: Array<{ id: string; order: number; visible: boolean }>;
  presetKey: "executive_default";
};
