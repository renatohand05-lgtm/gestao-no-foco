/**
 * Inteligência Executiva — tipos (Gate 16.3 / 17.2).
 * Panorama consolidado — sem lista de alertas (isso é Decisão / Plano).
 */

export type IntelligenceMetricAvailability =
  | "available"
  | "unavailable"
  | "partial";

export type ReceitaPotencialCard = {
  status: IntelligenceMetricAvailability;
  aguardandoAprovacaoValor: number | null;
  aguardandoAprovacaoQtd: number | null;
  orcamentosPendentesValor: number | null;
  orcamentosPendentesQtd: number | null;
  totalValor: number | null;
};

export type PrioridadesDoDiaCard = {
  status: IntelligenceMetricAvailability;
  items: [];
};

/** @deprecated Radar migrado para Cockpit Financeiro (17.2). */
export type RadarFinanceiroCard = {
  status: IntelligenceMetricAvailability;
  entradasPrevistas: number | null;
  saidasPrevistas: number | null;
  saldoProjetado: number | null;
};

export type SaudeOperacaoCard = {
  status: IntelligenceMetricAvailability;
  osAbertas: number | null;
  osAtrasadas: number | null;
  /** Contagem de OS com status aguardando_cliente (não é CRM/SLA). */
  osAguardandoCliente: number | null;
  /** Alias legado — preferir osAguardandoCliente. */
  clientesAguardandoRetorno?: number | null;
};

export type ExecutiveIntelligenceData = {
  receitaPotencial: ReceitaPotencialCard;
  prioridadesDoDia: PrioridadesDoDiaCard;
  radarFinanceiro: RadarFinanceiroCard;
  saudeOperacao: SaudeOperacaoCard;
};
