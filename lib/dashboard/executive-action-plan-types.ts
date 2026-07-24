/**
 * Plano de Ação do Dia — tipos (Gate 17.1).
 * Apresentação / priorização — não altera regras de negócio.
 */

export type ActionPlanPriority = "alta" | "media";

export type ActionPlanRecommendation = {
  id: string;
  priority: ActionPlanPriority;
  title: string;
  description: string;
  impactValue?: number | null;
  actionLabel: string;
  href: string;
  source: string;
  /** Ordenação determinística interna. */
  score: number;
};

export type ExecutiveActionPlanData = {
  recommendations: ActionPlanRecommendation[];
};
