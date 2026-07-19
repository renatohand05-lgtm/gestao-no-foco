/**
 * Executive Intelligence — thresholds e pesos (Sprint 11.1)
 * Documentados; ajustáveis sem tocar em UI.
 */

/** Pesos do Executive Score (soma = 100). */
export const EXECUTIVE_SCORE_WEIGHTS = {
  projecaoVsMeta: 25,
  ritmoVsEsperado: 20,
  atingimento: 15,
  tendencia: 15,
  probabilidade: 15,
  crescimento: 10,
} as const;

/** Faixas de score / saúde. */
export const EXECUTIVE_SCORE_BANDS = {
  criticoMax: 39,
  atencaoMax: 59,
  bomMax: 79,
} as const;

/** Ritmo: |diff| em p.p. */
export const EXECUTIVE_RITMO_PP = {
  criticoAbaixo: -25,
  atencaoAbaixo: -10,
  noRitmo: 10,
  acima: 25,
} as const;

/** Projeção útil / meta. */
export const EXECUTIVE_PROJECAO_RATIO = {
  critico: 0.7,
  atencao: 0.9,
  noAlvo: 1.0,
  acima: 1.1,
} as const;

/** Necessário/dia vs média atual. */
export const EXECUTIVE_NECESSARIO_RATIO = {
  muitoAcima: 1.35,
  acima: 1.15,
} as const;

/** Atingimento %. */
export const EXECUTIVE_ATINGIMENTO = {
  metaAtingida: 100,
  quase: 90,
  baixo: 50,
} as const;

/** Ticket variação %. */
export const EXECUTIVE_TICKET_PP = {
  quedaRelevante: -5,
  altaRelevante: 5,
} as const;

/** Crescimento período %. */
export const EXECUTIVE_CRESCIMENTO_PP = {
  negativo: -5,
  positivo: 5,
} as const;

/** Máximo de insights exibidos. */
export const EXECUTIVE_INSIGHTS_MAX = 6;

/** Prioridade numérica (menor = mais urgente). */
export const EXECUTIVE_INSIGHT_PRIORITY = {
  critical: 1,
  important: 2,
  positive: 3,
  informative: 4,
} as const;
