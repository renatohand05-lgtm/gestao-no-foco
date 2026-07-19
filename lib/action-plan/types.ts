/**
 * Executive Action Plan — tipos (Sprint 11.7)
 */

export type ActionPlanPriority = "Critica" | "Alta" | "Media" | "Baixa";

export type ActionPlanCategory =
  | "Venda"
  | "Ticket"
  | "CMV"
  | "Folha"
  | "Financeiro"
  | "Operacao"
  | "Cliente"
  | "Performance";

export type ActionPlanDifficulty = "baixa" | "media" | "alta";

export type ActionPlanStatus = "pendente" | "concluida";

export type ActionTask = {
  id: string;
  priority: ActionPlanPriority;
  category: ActionPlanCategory;
  /** O que fazer */
  title: string;
  /** Por quê */
  motivo: string;
  /** Qual impacto */
  impactoEsperado: string;
  /** Quando */
  prazo: string;
  responsavelSugerido: string;
  dificuldade: ActionPlanDifficulty;
  status: ActionPlanStatus;
  fontes: string[];
  rank: number;
};

export type ActionPlanResult = {
  tasks: ActionTask[];
  summary: string;
};

export const ACTION_PLAN_MAX_TASKS = 5;
