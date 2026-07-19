import type { PaginatedResult } from "@/types/pagination";

/**
 * Thresholds de ritmo (Sprint 9.8.6).
 * Compara ritmo atual (% atingimento) vs ritmo esperado (% tempo decorrido).
 *
 * - acima do ritmo: diff > +5 p.p.
 * - no ritmo: -5 ≤ diff ≤ +5
 * - abaixo do ritmo: -15 ≤ diff < -5
 * - muito abaixo: diff < -15
 */
export const META_RITMO_ACIMA_PP = 5;
export const META_RITMO_NO_RITMO_PP = 5;
export const META_RITMO_ABAIXO_PP = 15;

/** @deprecated Preferir META_RITMO_NO_RITMO_PP — mantido por compatibilidade. */
export const META_RITMO_TOLERANCIA_PP = META_RITMO_NO_RITMO_PP;

export type MetaVendasStatus =
  | "atingida"
  | "acima_do_ritmo"
  | "no_ritmo"
  | "abaixo_do_ritmo"
  | "muito_abaixo_do_ritmo"
  | "mes_encerrado"
  | "sem_meta";

export type MetaVendasSinal =
  | "positivo"
  | "atencao"
  | "critico"
  | "neutro"
  | "sem_meta";

export type MetaVendasMensal = {
  id: string;
  tenant_id: string;
  competencia: string;
  valor_meta: number;
  centro_custo_id: string | null;
  centro_custo_nome: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MetaVendasListItem = {
  id: string;
  competencia: string;
  valor_meta: number;
  centro_custo_id: string | null;
  centro_custo_nome: string | null;
  observacao: string | null;
  updated_at: string;
};

export type CreateMetaVendasInput = {
  competencia: string;
  valor_meta: number;
  centro_custo_id?: string | null;
  observacao?: string | null;
  created_by?: string | null;
};

export type UpdateMetaVendasInput = {
  valor_meta: number;
  centro_custo_id?: string | null;
  observacao?: string | null;
};

export type ListMetasVendasParams = {
  page?: number;
  perPage?: number;
  centroCustoId?: string | null;
  apenasGeral?: boolean;
};

export type MetaProjecaoComparacao = {
  realizado_mes_anterior: number;
  projecao_vs_anterior_pct: number | null;
  crescimento_realizado_pct: number | null;
};

export type MetaProjecaoMensal = {
  competencia: string;
  dataDe: string;
  dataAte: string;
  centro_custo_id: string | null;
  meta: MetaVendasMensal | null;
  valor_meta: number | null;
  faturamento_realizado: number;
  percentual_atingido: number | null;

  /** Dias corridos */
  dias_totais: number;
  dias_decorridos: number;
  dias_restantes: number;

  /** Dias úteis (seg–sex; feriados fora do escopo) */
  dias_uteis_totais: number;
  dias_uteis_decorridos: number;
  dias_uteis_restantes: number;

  media_diaria: number;
  media_diaria_util: number;

  projecao_dias_corridos: number;
  projecao_dias_uteis: number;
  /** Alias: projeção por dias corridos (compat 9.8.5). */
  projecao_fechamento: number;

  gap_projetado: number | null;
  gap_projetado_uteis: number | null;
  restante_meta: number | null;

  necessario_por_dia_corrido: number | null;
  necessario_por_dia_util: number | null;
  /** Alias do necessário por dia corrido. */
  necessario_por_dia: number | null;

  /** Ritmo esperado (tempo decorrido %). */
  percentual_tempo_decorrido: number;
  percentual_tempo_util_decorrido: number;
  /** Alias. */
  percentual_tempo: number;

  /** Ritmo atual = percentual_atingido (ou 0). */
  ritmo_atual: number | null;
  ritmo_esperado: number;
  ritmo_diferenca_pp: number | null;

  status: MetaVendasStatus;
  sinal: MetaVendasSinal;
  mes_encerrado: boolean;
  mes_futuro: boolean;
  mes_atual: boolean;
  comparacao: MetaProjecaoComparacao | null;
  formula_explicacao: string;
  observacao_feriados: string;
};

export type MetaHistoricoRow = {
  meta: MetaVendasListItem;
  faturamento_realizado: number;
  percentual_atingido: number | null;
  projecao_dias_corridos: number;
  projecao_dias_uteis: number;
  /** Alias. */
  projecao_ou_fechamento: number;
  gap_projetado: number | null;
  necessario_por_dia_util: number | null;
  ritmo_esperado: number;
  ritmo_atual: number | null;
  status: MetaVendasStatus;
};

export type ListMetasResult = PaginatedResult<MetaVendasListItem>;
