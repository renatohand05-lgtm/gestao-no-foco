/**
 * Meta × realizado mês a mês.
 * Meta = metas_vendas_mensais (a mesma do Dashboard e da tela de Metas).
 * Realizado = OS faturadas (a mesma base do Painel Executivo).
 * Tudo vem da função `metas_realizado_mensal`, então o portal e o painel
 * mostram sempre os mesmos números.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type MetaRealizadoMes = {
  /** Primeiro dia do mês (YYYY-MM-DD). */
  competencia: string;
  /** null = não há meta cadastrada para o mês. */
  meta: number | null;
  realizado: number;
  carros: number;
};

export type MetaStatus =
  | "sem_meta"
  | "a_comecar"
  | "em_andamento"
  | "batida"
  | "atencao"
  | "abaixo";

/** Faixa de atenção da planilha: até 5% abaixo da meta = amarelo; além disso = vermelho. */
export const FAIXA_ATENCAO = 0.05;

/**
 * Situação do mês. `hoje` é a data civil (YYYY-MM-DD) no fuso da empresa.
 * - mês futuro sem lançamento → "a começar"
 * - mês corrente abaixo da meta → "em andamento" (ainda dá tempo)
 * - mês fechado: ≥ 100% batida · ≥ 95% atenção · abaixo disso vermelho
 */
export function statusDaMeta(
  linha: Pick<MetaRealizadoMes, "competencia" | "meta" | "realizado">,
  hoje: string,
): MetaStatus {
  if (linha.meta === null || linha.meta <= 0) return "sem_meta";
  const atingido = linha.realizado / linha.meta;
  if (atingido >= 1) return "batida";

  const mesHoje = hoje.slice(0, 7);
  const mesLinha = linha.competencia.slice(0, 7);
  if (mesLinha > mesHoje) return linha.realizado > 0 ? "em_andamento" : "a_comecar";
  if (mesLinha === mesHoje) return "em_andamento";
  return atingido >= 1 - FAIXA_ATENCAO ? "atencao" : "abaixo";
}

export type ResumoMetas = {
  meta: number;
  realizado: number;
  falta: number;
  atingido: number | null;
  carros: number;
};

/** Soma metas e realizado só dos meses que têm meta (para não misturar mês sem meta). */
export function resumirMetas(linhas: MetaRealizadoMes[]): ResumoMetas {
  const comMeta = linhas.filter((l) => l.meta !== null);
  const meta = comMeta.reduce((s, l) => s + (l.meta ?? 0), 0);
  const realizado = comMeta.reduce((s, l) => s + l.realizado, 0);
  return {
    meta,
    realizado,
    falta: Math.max(meta - realizado, 0),
    atingido: meta > 0 ? realizado / meta : null,
    carros: comMeta.reduce((s, l) => s + l.carros, 0),
  };
}

export async function loadMetasRealizado(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  de: string,
  ate: string,
): Promise<MetaRealizadoMes[]> {
  const { data, error } = await supabase.rpc("metas_realizado_mensal", {
    p_tenant: tenantId,
    p_de: de,
    p_ate: ate,
  });
  if (error || !data) return [];
  return data.map((r) => ({
    competencia: r.mes_ref,
    meta: r.meta_valor === null ? null : Number(r.meta_valor),
    realizado: Number(r.realizado_valor),
    carros: Number(r.carros_qtd),
  }));
}
