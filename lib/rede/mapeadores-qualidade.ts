/**
 * Rede de lojas — tradução das linhas do banco (visitas de qualidade e planos de ação) para os tipos do app.
 * Puro (sem "server-only"): os testes importam direto, com dados sujos de propósito.
 */
import { lerChaveItem } from "./qualidade.ts";
import type { OrigemPlano, PlanoAcao, PrioridadePlano, RespostasQualidade, StatusPlano, VisitaQualidade } from "./tipos.ts";

type Linha = Record<string, unknown>;

const textoOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const dia = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** Lê as respostas gravadas ({"0-1": {"v": "nao", "o": "…"}}); ignora itens fora da lista e respostas desconhecidas. */
export function mapRespostas(v: unknown): RespostasQualidade {
  const out: RespostasQualidade = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
      if (!lerChaveItem(k) || !r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      const resp = o.v === "sim" || o.v === "nao" || o.v === "na" ? o.v : null;
      const obs = textoOuNull(o.o);
      if (resp || obs) out[k] = { v: resp, o: obs };
    }
  }
  return out;
}

export function mapVisita(r: Linha): VisitaQualidade {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    data: String(r.data).slice(0, 10),
    avaliador: String(r.avaliador ?? ""),
    gerente: textoOuNull(r.gerente),
    respostas: mapRespostas(r.respostas),
    origem: r.origem === "exemplo" ? "exemplo" : "manual",
    criadaEm: typeof r.created_at === "string" ? r.created_at : "",
  };
}

const ORIGENS: readonly OrigemPlano[] = ["qualidade", "delivery", "indicador", "manual"];
const STATUS: readonly StatusPlano[] = ["pendente", "em_andamento", "concluido", "cancelado"];
const PRIORIDADES: readonly PrioridadePlano[] = ["baixa", "media", "alta"];

export function mapPlano(r: Linha): PlanoAcao {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    origemTipo: ORIGENS.find((o) => o === r.origem_tipo) ?? "manual",
    origemId: typeof r.origem_id === "string" ? r.origem_id : null,
    origemRef: textoOuNull(r.origem_ref),
    origemRotulo: String(r.origem_rotulo ?? ""),
    descricao: String(r.descricao ?? ""),
    acao: textoOuNull(r.acao),
    responsavel: textoOuNull(r.responsavel),
    prazo: dia(r.prazo),
    prioridade: PRIORIDADES.find((p) => p === r.prioridade) ?? "media",
    status: STATUS.find((s) => s === r.status) ?? "pendente",
    dataConclusao: dia(r.data_conclusao),
    evidencia: textoOuNull(r.evidencia),
    observacoes: textoOuNull(r.observacoes),
    verificadoEm: typeof r.verificado_em === "string" ? r.verificado_em : null,
    criadoEm: typeof r.created_at === "string" ? r.created_at : "",
  };
}

export const COLUNAS_PLANO = "id,loja_id,origem_tipo,origem_id,origem_ref,origem_rotulo,descricao,acao,responsavel,prazo,prioridade,status,data_conclusao,evidencia,observacoes,verificado_em,created_at";
export const COLUNAS_VISITA = "id,loja_id,data,avaliador,gerente,respostas,origem,created_at";
