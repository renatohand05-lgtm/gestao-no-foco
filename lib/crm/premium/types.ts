/**
 * Sprint 30.5 — DTOs CRM Premium (apresentação; dados reais).
 */

import type { CrmFunilStage } from "@/lib/crm/constants";
import type { LossReasonCategory } from "@/config/crm/commercial-score";
import type { CommercialScoreCriterionId } from "@/config/crm/commercial-score";

export type MomDelta = {
  current: number;
  previous: number;
  /** null quando não há base no período anterior. */
  deltaPct: number | null;
};

export type CrmPremiumKpis = {
  totalOportunidades: number;
  valorPipeline: number;
  receitaPrevista: number;
  receitaProvavel: number;
  receitaFechada: number;
  taxaConversao: number;
  ticketMedio: number;
  tempoMedioFechamentoDias: number | null;
  followUpsPendentes: number;
  oportunidadesParadas: number;
  clientesSemContato: number;
  mom: {
    valorPipeline: MomDelta;
    receitaFechada: MomDelta;
    totalOportunidades: MomDelta;
  };
};

export type ScoreBreakdownItem = {
  id: CommercialScoreCriterionId;
  label: string;
  weight: number;
  points: number;
};

export type CommercialScoreResult = {
  score: number;
  breakdown: ScoreBreakdownItem[];
};

export type RevenueForecastPanel = {
  receitaPrevista: number;
  receitaProvavel: number;
  receitaFechada: number;
  funil: Array<{ stage: string; count: number; valor: number; ponderado: number }>;
  conversao: number;
  porResponsavel: Array<{
    responsavelId: string | null;
    nome: string;
    prevista: number;
    provavel: number;
    fechada: number;
  }>;
};

export type LossReasonBucket = {
  category: LossReasonCategory;
  total: number;
  share: number;
};

export type ClientRiskKind =
  | "sem_contato"
  | "negocio_parado"
  | "followup_vencido"
  | "oportunidade_fria"
  | "sem_atividade";

export type ClientAtRisk = {
  clienteId: string;
  nome: string;
  kinds: ClientRiskKind[];
  priority: "alta" | "media" | "baixa";
  score: number;
  lastContactAt: string | null;
  stalledDays: number | null;
};

export type OwnerRankingRow = {
  responsavelId: string | null;
  nome: string;
  pipeline: number;
  conversao: number;
  receita: number;
  atividades: number;
  followUps: number;
  ticket: number;
  tempoMedioDias: number | null;
  rank: number;
};

export type CrmPremiumDashboard = {
  kpis: CrmPremiumKpis;
  forecast: RevenueForecastPanel;
  lossReasons: LossReasonBucket[];
  atRisk: ClientAtRisk[];
  owners: OwnerRankingRow[];
  empty: boolean;
  generatedAt: string;
};

export type PremiumFunilCardFields = {
  valorEstimado: number | null;
  probabilidade: number | null;
  consultorId: string | null;
  consultorNome: string | null;
  prioridade: string | null;
  proximaAcao: string | null;
  dataProximaAcao: string | null;
  origem: string | null;
  ultimoContatoAt: string | null;
  idadeDias: number;
  tempoParadoDias: number;
  commercialScore: number;
  createdAt: string;
  estagio_funil: CrmFunilStage;
};

export type PremiumFollowUpBucket =
  | "atrasados"
  | "hoje"
  | "amanha"
  | "esta_semana"
  | "sem_responsavel"
  | "sem_data";
