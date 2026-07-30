/**
 * Fase 24 — Tipos do CRM Enterprise (facade sobre cadastro/CRM existentes).
 */

import type { CrmFunilStage } from "../constants.ts";

export type CrmKpiId =
  | "crm.novos"
  | "crm.ativos"
  | "crm.inativos"
  | "crm.conversao"
  | "crm.ticket_medio"
  | "crm.faturamento_cliente"
  | "crm.recorrencia"
  | "crm.retencao"
  | "crm.perda"
  | "crm.tempo_fechamento"
  | "crm.oportunidades_abertas"
  | "crm.valor_negociacao";

export type CrmKpiAvailability = "available" | "unavailable" | "partial";

export type CrmKpiDefinition = {
  id: CrmKpiId;
  name: string;
  unit: "count" | "currency" | "percent" | "days";
  formula: string;
  source: string;
  polarity: "higher_is_better" | "lower_is_better" | "neutral";
  availability: CrmKpiAvailability;
  unavailableReason?: string;
  drillDownAvailable: boolean;
};

export type CrmKpiResult = {
  definitionId: CrmKpiId;
  name: string;
  value: number | null;
  formatted: string;
  unit: CrmKpiDefinition["unit"];
  availability: CrmKpiAvailability;
  unavailableReason?: string;
  confidence: "high" | "medium" | "low" | "none";
  source: string;
  tenantId: string;
  drillDownAvailable: boolean;
};

export type CrmDrillDownItem = {
  id: string;
  label: string;
  value: number;
  meta?: Record<string, string | number | null>;
  origin: string;
};

export type CrmDrillDown = {
  definitionId: string;
  total: number;
  items: CrmDrillDownItem[];
  traceable: boolean;
  methodology: string;
};

export type CrmPipelineStageConfig = {
  key: CrmFunilStage;
  label: string;
  sortOrder: number;
  active: boolean;
  /** empresa_id null = padrão do tenant */
  empresaId: string | null;
};

export type CrmAlertSeverity = "info" | "attention" | "critical";

export type CrmAlert = {
  id: string;
  dedupeKey: string;
  title: string;
  description: string;
  severity: CrmAlertSeverity;
  relatedKpiIds: CrmKpiId[];
  recommendation: string;
  requiresHumanReview: true;
  autoApplied: false;
  evidence: string[];
};

export type CrmInsight = {
  id: string;
  title: string;
  summary: string;
  dataUsed: string[];
  confidence: "high" | "medium" | "low" | "none";
  origin: string;
  limitations: string[];
  suggestedQuestions: string[];
  requiresHumanReview: true;
  autoExecuted: false;
};

export type CrmProviderKind = "deterministic" | "external" | "mock";

export type CrmCommercialProvider = {
  id: string;
  kind: CrmProviderKind;
  label: string;
  explain: (ctx: {
    kpis: CrmKpiResult[];
    alerts: CrmAlert[];
    tenantId: string;
  }) => CrmInsight[];
};

export type CrmIntegrationStatus = "preparing" | "disabled";

export type CrmIntegrationConnector = {
  id: string;
  category: "whatsapp" | "email" | "telephony" | "erp" | "api";
  name: string;
  status: CrmIntegrationStatus;
  description: string;
  featureFlag: string;
};

export type CrmEnterpriseSnapshot = {
  tenantId: string;
  tenantSlug: string;
  asOf: string;
  empresaId?: string | null;
  filialId?: string | null;
  kpisRaw: {
    novos?: number | null;
    ativos?: number | null;
    inativos?: number | null;
    conversao?: number | null;
    ticketMedio?: number | null;
    faturamentoPorCliente?: number | null;
    recorrentes?: number | null;
    retencao?: number | null;
    perdidos?: number | null;
    tempoMedioFechamentoDias?: number | null;
    oportunidadesAbertas?: number | null;
    valorNegociacao?: number | null;
  };
  funil: Array<{ estagio: CrmFunilStage; total: number; valor_total: number }>;
  ranking?: Array<{ id: string; nome: string; valor: number }>;
  followUpsPendentes?: number | null;
  metas?: { metaFaturamento?: number | null; realizado?: number | null };
  sourceHealth?: Record<
    string,
    { status: "ok" | "error" | "empty"; message: string }
  >;
};
