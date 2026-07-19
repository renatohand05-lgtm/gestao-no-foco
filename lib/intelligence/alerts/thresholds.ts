/** Thresholds padrão (sem configuração no banco ainda). */
export const INTELLIGENCE_THRESHOLDS = {
  /** CMV máximo aceitável como % da receita líquida. */
  cmvMetaPct: 40,
  /** Margem média mínima saudável (%). */
  margemMinimaPct: 25,
  /** Concentração máxima de um cliente no faturamento (%). */
  concentracaoClienteMaxPct: 30,
  /** Dias sem movimentação para considerar produto parado. */
  produtoParadoDias: 60,
  /** Meta de taxa de retorno de serviços (%). */
  retornoServicosMetaPct: 2,
  /** Limite de atividades recentes. */
  activitiesLimit: 20,
  health: {
    excelenteMin: 85,
    saudavelMin: 70,
    atencaoMin: 50,
    criticoMin: 30,
  },
} as const;

export const ALERT_PRIORITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 80,
  medium: 50,
  low: 25,
  info: 10,
};
