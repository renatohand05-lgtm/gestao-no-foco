/**
 * IA Executiva — tipos (Gate 18.5).
 * Engine determinístico; sem LLM / ML / APIs externas.
 */

export type ExecutiveAiModule =
  | "financeiro"
  | "comercial"
  | "crm"
  | "operacao"
  | "estoque";

export type ExecutiveAiHealth =
  | "excelente"
  | "saudavel"
  | "atencao"
  | "critico"
  | "indisponivel";

export type ExecutiveAiSeverity =
  | "critica"
  | "alta"
  | "media"
  | "baixa"
  | "oportunidade";

export type ExecutiveAiSourceStatus =
  | "available"
  | "partial"
  | "unavailable";

export type ExecutiveAiAudit = {
  ruleId: string;
  ruleVersion: string;
  reason: string;
  evidence: string[];
};

export type ExecutiveAiDiagnostic = {
  id: string;
  module: ExecutiveAiModule;
  severity: ExecutiveAiSeverity;
  title: string;
  description: string;
  evidence: string[];
  scoreImpact: number;
  source: string;
  href?: string;
  audit: ExecutiveAiAudit;
};

export type ExecutiveAiRecommendation = {
  id: string;
  priority: number;
  title: string;
  action: string;
  reason: string;
  expectedImpact?: string;
  href?: string;
  source: string;
  module: ExecutiveAiModule;
  diagnosticId: string;
  audit: ExecutiveAiAudit;
};

export type ExecutiveAiModuleScore = {
  module: ExecutiveAiModule;
  score: number | null;
  status: ExecutiveAiSourceStatus;
  weight: number;
  effectiveWeight: number;
  penalties: Array<{ ruleId: string; delta: number; reason: string }>;
  bonuses: Array<{ ruleId: string; delta: number; reason: string }>;
  notes: string[];
};

export type ExecutiveAiPriority = {
  title: string;
  reason: string;
  module: ExecutiveAiModule | null;
  diagnosticId: string | null;
  href?: string;
};

export type ExecutiveAiResult = {
  executiveScore: number | null;
  health: ExecutiveAiHealth;
  confidence: number;
  partial: boolean;
  priority: ExecutiveAiPriority;
  diagnostics: ExecutiveAiDiagnostic[];
  recommendations: ExecutiveAiRecommendation[];
  moduleScores: ExecutiveAiModuleScore[];
  generatedAt: string;
  sourcesUsed: ExecutiveAiModule[];
  unavailableSources: ExecutiveAiModule[];
};

/** Feeds normalizados — engine não depende de tipos de outros módulos. */

export type ExecutiveAiFinanceiroFeed = {
  status: ExecutiveAiSourceStatus;
  saldoAtual: number | null;
  saldoProjetado7d: number | null;
  saldoProjetado30d: number | null;
  pagarVencidoQtd: number | null;
  pagarVencidoValor: number | null;
  receberVencidoQtd: number | null;
  receberVencidoValor: number | null;
  notice?: string | null;
};

export type ExecutiveAiComercialFeed = {
  status: ExecutiveAiSourceStatus;
  faturamentoPeriodo: number | null;
  valorEmNegociacao: number | null;
  valorPerdido: number | null;
  taxaConversaoPct: number | null;
  conversaoDisponivel: boolean;
  metaDisponivel: boolean;
  metaPercentual: number | null;
  metaAtingida: boolean;
  metaAbaixoRitmo: boolean;
  coberturaOrigemPct: number | null;
  coberturaOrigemBaixa: boolean;
  coberturaResponsavelPct: number | null;
  orcamentosAguardando: number | null;
  /** Ticket médio do CI (quando disponível). */
  ticketMedio: number | null;
};

export type ExecutiveAiCrmFeed = {
  status: ExecutiveAiSourceStatus;
  clientesAtivos: number | null;
  clientesInativos180: number | null;
  clientesRecorrentes: number | null;
  clientesEmRisco: number | null;
  vipSemRetorno: number | null;
  revisoesVencidas: number | null;
  orcamentosPendentes: number | null;
  oportunidades: number | null;
  ultimaVisitaCarteira: string | null;
};

export type ExecutiveAiOperacaoFeed = {
  status: ExecutiveAiSourceStatus;
  aguardandoAprovacao: number | null;
  atrasadas: number | null;
  paradas: number | null;
  semResponsavel: number | null;
  taxaOcupacaoPct: number | null;
  capacidadeLimite: boolean;
  valorAguardandoAprovacao: number | null;
};

export type ExecutiveAiEstoqueFeed = {
  status: ExecutiveAiSourceStatus;
  zerados: number | null;
  abaixoMinimo: number | null;
  valorParado: number | null;
  valorParadoDisponivel: boolean;
  cadastroInconsistente: number | null;
  coberturaDisponivel: boolean;
  giroDisponivel: boolean;
  fornecedorUnico: boolean;
  skusAtivos: number | null;
};

export type ExecutiveAiInput = {
  tenantSlug: string;
  generatedAt?: string;
  financeiro: ExecutiveAiFinanceiroFeed | null;
  comercial: ExecutiveAiComercialFeed | null;
  crm: ExecutiveAiCrmFeed | null;
  operacao: ExecutiveAiOperacaoFeed | null;
  estoque: ExecutiveAiEstoqueFeed | null;
};

export const EXECUTIVE_AI_RULE_VERSION = "18.5.1";

/** Pesos base do Executive Score (soma = 100). */
export const EXECUTIVE_AI_MODULE_WEIGHTS: Record<ExecutiveAiModule, number> = {
  financeiro: 25,
  operacao: 25,
  comercial: 20,
  crm: 15,
  estoque: 15,
};

/** Cobertura mínima: < 3 módulos disponíveis OU confidence < 50 → health indisponível. */
export const EXECUTIVE_AI_MIN_MODULES = 3;
export const EXECUTIVE_AI_MIN_CONFIDENCE = 50;

export const EXECUTIVE_AI_MAX_DIAGNOSTICS = 5;
export const EXECUTIVE_AI_MAX_RECOMMENDATIONS = 5;

export const EXECUTIVE_AI_MODULES: ExecutiveAiModule[] = [
  "financeiro",
  "comercial",
  "crm",
  "operacao",
  "estoque",
];
