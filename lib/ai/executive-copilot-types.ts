/**
 * Executive Copilot — tipos (Gate 20.3).
 * Contrato de resposta determinístico · sem LLM.
 */

export type ExecutiveCopilotIntent =
  | "visao_geral"
  | "prioridade_do_dia"
  | "financeiro"
  | "comercial"
  | "operacao"
  | "estoque"
  | "crm"
  | "ordens_servico"
  | "metas"
  | "riscos"
  | "oportunidades"
  | "plano_acao"
  | "explicacao_score"
  | "cobertura_dados"
  | "unknown";

export type ExecutiveCopilotConfidence = "alta" | "media" | "baixa";

export type ExecutiveCopilotDomain =
  | "geral"
  | "financeiro"
  | "comercial"
  | "operacao"
  | "crm"
  | "estoque"
  | "ordens"
  | "metas"
  | "score"
  | "cobertura";

export type ExecutiveCopilotEvidenceItem = {
  domain: ExecutiveCopilotDomain;
  label: string;
  value: string;
  status: string;
  source: string;
  reliability: ExecutiveCopilotConfidence;
  link?: string;
};

export type ExecutiveCopilotAction = {
  priority: number;
  title: string;
  description: string;
  /** Somente quando a fonte já traz texto confiável. */
  impact: string | null;
  domain: ExecutiveCopilotDomain;
  link?: string;
  evidence: string;
  confidence: ExecutiveCopilotConfidence;
};

export type ExecutiveCopilotRelatedLink = {
  label: string;
  href: string;
  domain: ExecutiveCopilotDomain;
};

export type ExecutiveCopilotResponse = {
  answer: string;
  summary: string;
  intent: ExecutiveCopilotIntent;
  confidence: ExecutiveCopilotConfidence;
  evidence: ExecutiveCopilotEvidenceItem[];
  recommendedActions: ExecutiveCopilotAction[];
  relatedLinks: ExecutiveCopilotRelatedLink[];
  warnings: string[];
  unavailableReasons: string[];
  generatedAt: string;
  engineVersion: string;
};

/** Módulos que o usuário pode visualizar (sem nova auth). */
export type ExecutiveCopilotAccess = {
  financeiro: boolean;
  comercial: boolean;
  estoque: boolean;
  operacao: boolean;
  crm: boolean;
  ordens: boolean;
  centroOperacoes: boolean;
  metas: boolean;
};

export const EXECUTIVE_COPILOT_ENGINE_VERSION = "20.3.0";

export const EXECUTIVE_COPILOT_CONFIDENCE_LABEL: Record<
  ExecutiveCopilotConfidence,
  string
> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const EXECUTIVE_COPILOT_INTENT_LABEL: Record<
  ExecutiveCopilotIntent,
  string
> = {
  visao_geral: "Visão geral",
  prioridade_do_dia: "Prioridade do dia",
  financeiro: "Financeiro",
  comercial: "Comercial",
  operacao: "Operação",
  estoque: "Estoque",
  crm: "CRM",
  ordens_servico: "Ordens de serviço",
  metas: "Metas",
  riscos: "Riscos",
  oportunidades: "Oportunidades",
  plano_acao: "Plano de ação",
  explicacao_score: "Explicação do score",
  cobertura_dados: "Cobertura dos dados",
  unknown: "Não suportada",
};

export const EXECUTIVE_COPILOT_SUGGESTIONS: string[] = [
  "Como está minha empresa hoje?",
  "O que exige atenção agora?",
  "Como está meu caixa?",
  "Vou bater a meta?",
  "Quais OS estão críticas?",
  "Tenho risco de estoque?",
  "Quais clientes estão em risco?",
  "Qual ação devo executar primeiro?",
];

export const EXECUTIVE_COPILOT_MAX_ACTIONS = 3;
export const EXECUTIVE_COPILOT_MAX_EVIDENCE = 6;
