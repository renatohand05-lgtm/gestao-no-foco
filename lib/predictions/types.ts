/**
 * Prediction & Scenario Engine — tipos (Sprint 11.3)
 */

export type PredictionConfidence = "baixa" | "media" | "alta";

export type PredictionProbability =
  | "muito_baixa"
  | "baixa"
  | "moderada"
  | "alta"
  | "muito_alta";

export type PredictionStatus =
  | "no_ritmo"
  | "recuperacao"
  | "atencao"
  | "critico"
  | "meta_atingida"
  | "meta_superada"
  | "sem_meta"
  | "periodo_futuro"
  | "periodo_encerrado"
  | "dados_insuficientes";

export type ScenarioViability =
  | "viavel"
  | "agressivo"
  | "improvavel"
  | "impossivel"
  | "dados_insuficientes";

export type ScenarioKind =
  | "base"
  | "daily_average"
  | "ticket"
  | "recovery"
  | "required_for_meta";

/** Entrada tipada — espelho dos dados já carregados. */
export type PredictionInput = {
  metaMensal: number | null;
  realizado: number;
  projecaoAtual: number;
  projecaoDiasUteis: number;
  mediaDiariaAtual: number;
  necessarioDiaUtil: number | null;
  diasUteisRestantes: number;
  diasUteisDecorridos: number;
  ticketAtual: number;
  ticketAnterior: number;
  quantidadeVendas: number;
  ritmoAtual: number | null;
  ritmoEsperado: number;
  tendencia: "crescente" | "estavel" | "decrescente" | "insuficiente";
  confianca: PredictionConfidence;
  confiancaMotivo: string;
  probabilidadeMeta: PredictionProbability;
  probabilidadeScore: number;
  crescimentoPeriodo: number | null;
  periodoEncerrado: boolean;
  periodoFuturo: boolean;
  possuiMeta: boolean;
  /** Volatilidade opcional (0–2) para reuso do modelo de probabilidade. */
  volatilidade: number;
};

export type ProbabilityEstimate = {
  label: PredictionProbability;
  score: number;
  motivo: string;
};

export type BaseScenarioResult = {
  projectedRevenue: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  confidence: PredictionConfidence;
  status: PredictionStatus;
  explanation: string;
  viability: ScenarioViability;
};

export type DailyAverageScenarioResult = {
  newDailyAverage: number;
  projectedRevenue: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  estimatedIncrement: number;
  requiredConsecutiveDays: number | null;
  confidence: PredictionConfidence;
  viability: ScenarioViability;
  assumption: string;
};

export type TicketScenarioResult = {
  newTicket: number;
  estimatedRevenue: number;
  estimatedIncrement: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  assumption: string;
  confidence: PredictionConfidence;
  viability: ScenarioViability;
  estimatedRemainingSales: number | null;
};

export type RecoveryScenarioResult = {
  recoveredDays: number;
  targetLiftPercent: number;
  estimatedIncrement: number;
  projectedRevenue: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  confidence: PredictionConfidence;
  viability: ScenarioViability;
  assumption: string;
};

export type RequiredForMetaResult = {
  requiredDailyAverage: number | null;
  requiredDailyGrowthPercent: number | null;
  additionalSalesNeeded: number | null;
  requiredTicket: number | null;
  requiredVolume: number | null;
  assumptions: string[];
  viability: ScenarioViability;
  alert: string | null;
};

export type ScenarioCardModel = {
  id: string;
  kind: ScenarioKind;
  name: string;
  description: string;
  effortScore: number;
  impactScore: number;
  riskScore: number;
  confidence: PredictionConfidence;
  projectedRevenue: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  estimatedIncrement: number;
  viability: ScenarioViability;
  viabilityLabel: string;
};

export type ScenarioRecommendation = {
  scenarioId: string;
  title: string;
  rationale: string;
  expectedImpact: string;
  effort: string;
  risk: string;
  confidence: PredictionConfidence;
  actionPlan: string[];
  confidenceWarning: string | null;
};

export type PredictionSummary = {
  headline: string;
  explanation: string;
  status: PredictionStatus;
  confidence: PredictionConfidence;
  baseProjectedRevenue: number;
  baseProjectedGap: number | null;
};

export type SimulatorParams = {
  dailyAbsoluteDelta: number;
  dailyPercentDelta: number;
  ticketAbsoluteDelta: number;
  ticketPercentDelta: number;
  recoveryDays: number;
  recoveryLiftPercent: number;
};

export type PredictionEngineResult = {
  summary: PredictionSummary;
  base: BaseScenarioResult;
  requiredForMeta: RequiredForMetaResult;
  scenarios: ScenarioCardModel[];
  recommendation: ScenarioRecommendation | null;
  customDaily: DailyAverageScenarioResult | null;
  customTicket: TicketScenarioResult | null;
  customRecovery: RecoveryScenarioResult | null;
  defaultSimulatorParams: SimulatorParams;
};
