/**
 * Cockpit Financeiro Executivo — tipos (Gate 17.2 / 17.2.1).
 */

export type CashHealthStatus =
  | "saudavel"
  | "atencao"
  | "critico"
  | "indisponivel";

export type CockpitMetricAvailability = "available" | "unavailable" | "partial";

export type FinancialHorizon = {
  entradasPrevistas: number | null;
  saidasPrevistas: number | null;
  saldoProjetado: number | null;
};

export type FinancialOverdue = {
  pagarQtd: number;
  pagarValor: number;
  receberQtd: number;
  receberValor: number;
};

export type MaiorCompromissoView = {
  descricao: string;
  fornecedorNome: string | null;
  valor: number;
  dataVencimento: string;
  valorSource: "saldo_pendente" | "valor_original";
} | null;

export type ExecutiveFinancialCockpitData = {
  status: CockpitMetricAvailability;
  /** Mensagem quando parcial / sem conta. */
  notice: string | null;
  saldoAtual: number | null;
  hoje: FinancialHorizon;
  dias7: FinancialHorizon;
  dias30: FinancialHorizon;
  vencidas: FinancialOverdue | null;
  maiorCompromisso7d: MaiorCompromissoView;
  /**
   * CR não tem janela nativa de 30d no getResumo.
   * Entradas 30d vêm do fluxo (visão parcial quanto a detalhe CR).
   */
  receber30dVisaoParcial: boolean;
  saude: CashHealthStatus;
  saudeLabel: string;
  saudeReason: string;
};
