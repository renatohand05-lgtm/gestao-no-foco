/**
 * Sprint 30.5 — Score comercial determinístico (sem IA).
 * Pesos somam 100; cada critério devolve 0–peso.
 */

export type CommercialScoreCriterionId =
  | "tempo_sem_contato"
  | "valor"
  | "etapa"
  | "historico"
  | "atividade"
  | "origem";

export type CommercialScoreConfig = {
  maxScore: number;
  weights: Record<CommercialScoreCriterionId, number>;
  /** Dias sem contato → pontuação do critério (primeiro match). */
  daysWithoutContactBands: Array<{ maxDays: number; ratio: number }>;
  /** Valor estimado (BRL) → ratio. */
  valueBands: Array<{ minValue: number; ratio: number }>;
  /** Estágio funil → ratio. */
  stageRatios: Record<string, number>;
  /** Origens conhecidas → ratio; default 0.4. */
  originRatios: Record<string, number>;
  defaultOriginRatio: number;
};

export const COMMERCIAL_SCORE_CONFIG: CommercialScoreConfig = {
  maxScore: 100,
  weights: {
    tempo_sem_contato: 25,
    valor: 20,
    etapa: 20,
    historico: 15,
    atividade: 10,
    origem: 10,
  },
  daysWithoutContactBands: [
    { maxDays: 3, ratio: 1 },
    { maxDays: 7, ratio: 0.8 },
    { maxDays: 14, ratio: 0.55 },
    { maxDays: 30, ratio: 0.3 },
    { maxDays: Number.POSITIVE_INFINITY, ratio: 0.1 },
  ],
  valueBands: [
    { minValue: 50_000, ratio: 1 },
    { minValue: 15_000, ratio: 0.8 },
    { minValue: 5_000, ratio: 0.55 },
    { minValue: 1_000, ratio: 0.35 },
    { minValue: 0, ratio: 0.15 },
  ],
  stageRatios: {
    negociacao: 1,
    proposta: 0.85,
    contato: 0.65,
    lead: 0.4,
    fechado: 1,
    perdido: 0.05,
  },
  originRatios: {
    indicacao: 1,
    site: 0.75,
    whatsapp: 0.7,
    telefone: 0.65,
    visita: 0.8,
    google: 0.55,
    organico: 0.5,
  },
  defaultOriginRatio: 0.4,
};

export const LOSS_REASON_CATEGORIES = [
  "Preço",
  "Prazo",
  "Concorrência",
  "Sem retorno",
  "Cancelamento",
  "Outro",
] as const;

export type LossReasonCategory = (typeof LOSS_REASON_CATEGORIES)[number];

/** Tokens → categoria (match por inclusão, case-insensitive). */
export const LOSS_REASON_TOKEN_MAP: Array<{
  category: LossReasonCategory;
  tokens: string[];
}> = [
  { category: "Preço", tokens: ["preco", "preço", "caro", "valor", "orcamento", "orçamento", "desconto"] },
  { category: "Prazo", tokens: ["prazo", "demora", "atraso", "tempo", "urgencia", "urgência"] },
  {
    category: "Concorrência",
    tokens: ["concorr", "concorrente", "outro fornecedor", "competidor"],
  },
  {
    category: "Sem retorno",
    tokens: ["sem retorno", "sem contato", "ghost", "nao respondeu", "não respondeu", "sumiu"],
  },
  {
    category: "Cancelamento",
    tokens: ["cancel", "desistir", "desistiu", "abort"],
  },
];
