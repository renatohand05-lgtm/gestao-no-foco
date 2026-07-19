/**
 * Executive Intelligence — tipos (Sprint 11.1)
 * Sem UI, sem I/O. Apenas contratos tipados.
 */

export type ExecutiveTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type ExecutiveScoreStatus =
  | "critico"
  | "atencao"
  | "bom"
  | "excelente"
  | "sem_meta"
  | "periodo_futuro"
  | "dados_insuficientes";

export type ExecutiveHealthStatus =
  | "critica"
  | "atencao"
  | "saudavel"
  | "excelente"
  | "sem_meta"
  | "informativo";

export type ExecutiveInsightCategory =
  | "critical"
  | "important"
  | "positive"
  | "informative";

export type ExecutiveActionSeverity =
  | "critical"
  | "important"
  | "positive"
  | "neutral";

export type ExecutiveMilestoneStatus =
  | "done"
  | "current"
  | "upcoming"
  | "projected";

/** Entrada consolidada — só campos derivados dos dados já carregados. */
export type ExecutiveIntelligenceInput = {
  metaMensal: number | null;
  realizado: number;
  projecaoDiasCorridos: number;
  projecaoDiasUteis: number;
  atingimentoPercentual: number | null;
  gapMeta: number | null;
  necessarioDiaUtil: number | null;
  ritmoEsperado: number;
  ritmoAtual: number | null;
  diferencaRitmoPp: number | null;
  tendencia: "crescente" | "estavel" | "decrescente" | "insuficiente";
  tendenciaPct: number | null;
  tendenciaInsuficiente: boolean;
  confianca: "baixa" | "media" | "alta";
  confiancaMotivo: string;
  probabilidadeMeta:
    | "muito_baixa"
    | "baixa"
    | "moderada"
    | "alta"
    | "muito_alta";
  probabilidadeScore: number;
  crescimentoPeriodo: number | null;
  ticketAtual: number;
  ticketAnterior: number;
  ticketVariacaoPct: number | null;
  vendasQuantidade: number;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  diasUteisTotais: number;
  diasCorridosDecorridos: number;
  diasCorridosTotais: number;
  periodoEncerrado: boolean;
  periodoFuturo: boolean;
  possuiMeta: boolean;
  mediaDiariaUtil: number;
  /** Para montar hrefs — slug do tenant. */
  tenantSlug: string;
  competenciaYm: string;
  dataDe: string;
  dataAte: string;
  metaId: string | null;
};

export type ExecutiveScoreFactor = {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
};

export type ExecutiveScoreResult = {
  score: number | null;
  status: ExecutiveScoreStatus;
  tone: ExecutiveTone;
  explanation: string;
  factors: ExecutiveScoreFactor[];
};

export type ExecutiveHealthResult = {
  percentage: number | null;
  status: ExecutiveHealthStatus;
  tone: ExecutiveTone;
  reason: string;
  supportingMetrics: Array<{ label: string; value: string }>;
};

export type ExecutiveInsight = {
  id: string;
  category: ExecutiveInsightCategory;
  priority: number;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  actionLabel: string;
  href: string | null;
};

export type ExecutiveActionResult = {
  title: string;
  description: string;
  severity: ExecutiveActionSeverity;
  rationale: string;
  actionLabel: string;
  href: string;
};

export type ExecutiveDiagnosisFinding = {
  label: string;
  value: string;
  tone: ExecutiveTone;
};

export type ExecutiveDiagnosisResult = {
  summary: string;
  findings: ExecutiveDiagnosisFinding[];
  primaryCause: string;
  conclusion: string;
};

export type ExecutiveTimelineMilestone = {
  id: string;
  label: string;
  value: string;
  status: ExecutiveMilestoneStatus;
  positionPercent: number;
};

export type ExecutiveTimelineResult = {
  currentDay: number;
  elapsedBusinessDays: number;
  remainingBusinessDays: number;
  totalBusinessDays: number;
  milestones: ExecutiveTimelineMilestone[];
};

export type ExecutiveIntelligenceResult = {
  score: ExecutiveScoreResult;
  health: ExecutiveHealthResult;
  insights: ExecutiveInsight[];
  action: ExecutiveActionResult;
  diagnosis: ExecutiveDiagnosisResult;
  timeline: ExecutiveTimelineResult;
};
