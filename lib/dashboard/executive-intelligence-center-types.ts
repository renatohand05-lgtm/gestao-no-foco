/**
 * Centro de Inteligência Operacional — tipos (Gate 20.1).
 * Projeção apresentacional sobre Decision Engine (18.5) + Decision Center (16.2).
 * Sem I/O · sem inventar valores.
 */

import type {
  ExecutiveAiHealth,
  ExecutiveAiModule,
  ExecutiveAiModuleScore,
} from "../ai/executive-ai-types.ts";

export type EicCriticidade = "critica" | "alta" | "media";

export type EicPriorityItem = {
  id: string;
  title: string;
  reason: string;
  /** Maior = mais impacto (ordenação determinística). */
  impactRank: number;
  module: ExecutiveAiModule | DecisionCategoryLabel | null;
  href?: string;
  source: "decision-engine" | "decision-center";
};

export type EicOpportunityItem = {
  id: string;
  title: string;
  description: string;
  /** Texto de ganho potencial já existente (expectedImpact / impactValue). Nunca inventado. */
  potentialGainLabel: string | null;
  module: ExecutiveAiModule | DecisionCategoryLabel | null;
  href?: string;
  source: "decision-engine" | "decision-center";
};

export type EicRiskItem = {
  id: string;
  title: string;
  description: string;
  criticidade: EicCriticidade;
  /** Impacto estimado a partir de evidência existente (scoreImpact / impactValue). */
  impactLabel: string | null;
  module: ExecutiveAiModule | DecisionCategoryLabel | null;
  href?: string;
  source: "decision-engine" | "decision-center";
};

export type EicRecommendationItem = {
  id: string;
  title: string;
  action: string;
  reason: string;
  expectedImpact?: string;
  href?: string;
  priority: number;
  module: ExecutiveAiModule;
  source: "decision-engine";
};

export type DecisionCategoryLabel =
  | "vendas"
  | "metas"
  | "oficina"
  | "financeiro"
  | "estoque"
  | "clientes"
  | "pessoas"
  | "operacao";

export type ExecutiveIntelligenceCenterScore = {
  value: number | null;
  health: ExecutiveAiHealth;
  confidence: number;
  partial: boolean;
  modules: ExecutiveAiModuleScore[];
  unavailableSources: ExecutiveAiModule[];
};

export type ExecutiveIntelligenceCenterData = {
  score: ExecutiveIntelligenceCenterScore;
  prioridades: EicPriorityItem[];
  oportunidades: EicOpportunityItem[];
  riscos: EicRiskItem[];
  recomendacoes: EicRecommendationItem[];
  generatedAt: string;
  engineVersion: string;
  priorityHeadline: {
    title: string;
    reason: string;
    href?: string;
  };
};

export const EIC_MAX_PRIORIDADES = 5;
export const EIC_MAX_OPORTUNIDADES = 5;
export const EIC_MAX_RISCOS = 5;
export const EIC_MAX_RECOMENDACOES = 5;

export const EIC_TITLE = "Centro de Inteligência Operacional";
export const EIC_BADGE = "Decision Engine";
export const EIC_NOTE =
  "Diagnósticos e recomendações derivados exclusivamente dos dados do sistema (regras determinísticas · sem IA generativa).";
