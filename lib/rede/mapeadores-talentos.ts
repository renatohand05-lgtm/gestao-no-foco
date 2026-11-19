/**
 * Rede de lojas — tradução das linhas do banco (Nine Box, liderança, critérios de carreira) para os tipos do app.
 * Puro (sem "server-only"): os testes importam direto, com dados sujos de propósito.
 * Linha que não faz sentido (nível fora de 1–3, nota fora de 0–5, mês ilegível, cargo desconhecido) é DESCARTADA
 * (retorna null) em vez de virar uma nota inventada.
 */
import type { CargoCarreira, CriterioCargo, LiderancaRh, NineBoxRh, NivelNineBox } from "./tipos.ts";

type Linha = Record<string, unknown>;

const CARGOS: readonly CargoCarreira[] = ["gerente_loja", "chefe_cozinha", "lider_delivery", "auxiliar_cozinha", "atendente", "supervisor_regional"];

const textoOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const dia = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const numeroOuNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const origem = (v: unknown): "manual" | "exemplo" => (v === "exemplo" ? "exemplo" : "manual");
const nivel = (v: unknown): NivelNineBox | null => {
  const n = numeroOuNull(v);
  return n === 1 || n === 2 || n === 3 ? n : null;
};

export function mapNineBox(r: Linha): NineBoxRh | null {
  const desempenho = nivel(r.desempenho);
  const potencial = nivel(r.potencial);
  if (desempenho == null || potencial == null || r.id == null || r.loja_id == null || r.colaborador_id == null) return null;
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    colaboradorId: String(r.colaborador_id),
    desempenho,
    potencial,
    observacoes: textoOuNull(r.observacoes),
    origem: origem(r.origem),
  };
}

export function mapLideranca(r: Linha): LiderancaRh | null {
  const nota = numeroOuNull(r.nota);
  const d = dia(r.mes);
  if (nota == null || nota < 0 || nota > 5 || d == null || r.id == null || r.loja_id == null || r.colaborador_id == null) return null;
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    colaboradorId: String(r.colaborador_id),
    mes: `${d.slice(0, 7)}-01`,
    nota,
    observacoes: textoOuNull(r.observacoes),
    origem: origem(r.origem),
  };
}

export function mapCriterioCargo(r: Linha): CriterioCargo | null {
  const cargo = CARGOS.find((c) => c === r.cargo);
  const criterio = textoOuNull(r.criterio);
  if (!cargo || !criterio) return null;
  const min = numeroOuNull(r.tempo_minimo_meses);
  return { cargo, tempoMinimoMeses: min != null && min >= 0 ? Math.floor(min) : null, criterio, origem: origem(r.origem) };
}

/** Colunas lidas de cada tabela (nunca `select *`). */
export const COLUNAS_NINEBOX = "id,loja_id,colaborador_id,desempenho,potencial,observacoes,origem";
export const COLUNAS_LIDERANCA = "id,loja_id,colaborador_id,mes,nota,observacoes,origem";
export const COLUNAS_CRITERIO = "cargo,tempo_minimo_meses,criterio,origem";
