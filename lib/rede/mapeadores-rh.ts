/**
 * Rede de lojas — tradução das linhas do banco (RH) para os tipos do app.
 * Puro (sem "server-only"): os testes importam direto, com dados sujos de propósito.
 */
import type { CargoRh, ColaboradorRh, MesRh, OcorrenciaRh, PrevistoRh, StatusOcorrencia, TipoOcorrencia } from "./tipos.ts";

type Linha = Record<string, unknown>;

const CARGOS: readonly CargoRh[] = ["gerente_loja", "chefe_cozinha", "lider_delivery", "auxiliar_cozinha", "atendente"];
const TIPOS: readonly TipoOcorrencia[] = [
  "advertencia_verbal",
  "advertencia_escrita",
  "suspensao",
  "falta_injustificada",
  "atraso",
  "atestado_medico",
  "feedback",
  "elogio",
  "treinamento",
  "desligamento",
];
const STATUS: readonly StatusOcorrencia[] = ["registrada", "aguardando_assinatura", "assinada", "recusou_assinar", "concluida"];

const textoOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const dia = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const origem = (v: unknown): "manual" | "exemplo" => (v === "exemplo" ? "exemplo" : "manual");

export function mapColaborador(r: Linha): ColaboradorRh {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    nome: String(r.nome ?? ""),
    cargo: CARGOS.find((c) => c === r.cargo) ?? "atendente",
    dataAdmissao: dia(r.data_admissao) ?? "",
    status: r.status === "desligado" ? "desligado" : "ativo",
    dataDesligamento: dia(r.data_desligamento),
    motivoDesligamento: textoOuNull(r.motivo_desligamento),
    observacoes: textoOuNull(r.observacoes),
    origem: origem(r.origem),
  };
}

export function mapPrevisto(r: Linha): PrevistoRh {
  return { lojaId: String(r.loja_id), cargo: CARGOS.find((c) => c === r.cargo) ?? "atendente", previsto: num(r.previsto), origem: origem(r.origem) };
}

export function mapMes(r: Linha): MesRh {
  const d = dia(r.mes) ?? "";
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    mes: d ? `${d.slice(0, 7)}-01` : "",
    headcount: num(r.headcount_medio),
    admissoes: num(r.admissoes),
    desligamentos: num(r.desligamentos),
    faltas: num(r.dias_falta),
    diasPrevistos: num(r.dias_previstos),
    origem: origem(r.origem),
  };
}

export function mapOcorrencia(r: Linha): OcorrenciaRh {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    colaboradorId: String(r.colaborador_id),
    tipo: TIPOS.find((t) => t === r.tipo) ?? "feedback",
    data: dia(r.data) ?? "",
    status: STATUS.find((s) => s === r.status) ?? "registrada",
    motivo: String(r.motivo ?? ""),
    responsavel: textoOuNull(r.responsavel),
    observacoes: textoOuNull(r.observacoes),
    origem: origem(r.origem),
  };
}

/** Colunas lidas de cada tabela de RH (nunca `select *`: o app só traz o que usa). */
export const COLUNAS_COLAB = "id,loja_id,nome,cargo,data_admissao,status,data_desligamento,motivo_desligamento,observacoes,origem";
export const COLUNAS_PREVISTO = "loja_id,cargo,previsto,origem";
export const COLUNAS_MES = "id,loja_id,mes,headcount_medio,admissoes,desligamentos,dias_falta,dias_previstos,origem";
export const COLUNAS_OCORRENCIA = "id,loja_id,colaborador_id,tipo,data,status,motivo,responsavel,observacoes,origem";
