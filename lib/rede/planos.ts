/**
 * Rede de lojas — planos de ação centralizados.
 * Puro (sem banco, sem React): os testes importam daqui.
 *
 * Todo desvio (item "Não" da visita de qualidade, indicador ou rotina de delivery fora da meta, ou um problema
 * lançado à mão) vira um plano com ação, responsável, prazo e prioridade. O plano passa por
 * Pendente → Em andamento → Concluído (ou Cancelado); concluído, ainda precisa ser verificado por quem acompanha a loja.
 * "Atrasado" não é uma situação gravada: é derivada (aberto com prazo vencido).
 */
import { somarDias } from "./calculo.ts";
import type { OrigemPlano, PlanoAcao, PrioridadePlano, Status, StatusPlano } from "./tipos.ts";

export const ORIGENS_PLANO: readonly { v: OrigemPlano; rotulo: string }[] = [
  { v: "qualidade", rotulo: "Checklist de qualidade" },
  { v: "delivery", rotulo: "Checklist de delivery" },
  { v: "indicador", rotulo: "Indicador fora da meta" },
  { v: "manual", rotulo: "Lançado à mão" },
];
/** Origens que a pessoa pode escolher ao criar um plano (as outras nascem dos checklists). */
export const ORIGENS_MANUAIS: readonly OrigemPlano[] = ["manual", "indicador"];

export const STATUS_PLANO: readonly { v: StatusPlano; rotulo: string }[] = [
  { v: "pendente", rotulo: "Pendente" },
  { v: "em_andamento", rotulo: "Em andamento" },
  { v: "concluido", rotulo: "Concluído" },
  { v: "cancelado", rotulo: "Cancelado" },
];
export const PRIORIDADES_PLANO: readonly { v: PrioridadePlano; rotulo: string }[] = [
  { v: "alta", rotulo: "Alta" },
  { v: "media", rotulo: "Média" },
  { v: "baixa", rotulo: "Baixa" },
];

export const rotuloOrigem = (o: OrigemPlano): string => ORIGENS_PLANO.find((x) => x.v === o)?.rotulo ?? o;
export const rotuloStatusPlano = (s: StatusPlano): string => STATUS_PLANO.find((x) => x.v === s)?.rotulo ?? s;
export const rotuloPrioridade = (p: PrioridadePlano): string => PRIORIDADES_PLANO.find((x) => x.v === p)?.rotulo ?? p;

/** Situação para exibir: as quatro gravadas mais "atrasado" (derivada). */
export type SituacaoPlano = StatusPlano | "atrasado";

export const estaAberto = (p: Pick<PlanoAcao, "status">): boolean => p.status === "pendente" || p.status === "em_andamento";
export const estaAtrasado = (p: Pick<PlanoAcao, "status" | "prazo">, hoje: string): boolean => estaAberto(p) && p.prazo != null && p.prazo < hoje;
export const aguardaVerificacao = (p: Pick<PlanoAcao, "status" | "verificadoEm">): boolean => p.status === "concluido" && !p.verificadoEm;

export function situacaoPlano(p: Pick<PlanoAcao, "status" | "prazo">, hoje: string): SituacaoPlano {
  return estaAtrasado(p, hoje) ? "atrasado" : p.status;
}

export const rotuloSituacao = (s: SituacaoPlano): string => (s === "atrasado" ? "Atrasado" : rotuloStatusPlano(s));

/** Cor da situação: atrasado = crítico; em andamento = atenção; concluído = ok; pendente e cancelado = neutro. */
export function tomDaSituacao(s: SituacaoPlano): Status {
  return s === "atrasado" ? "bad" : s === "em_andamento" ? "warn" : s === "concluido" ? "ok" : "neu";
}

/** Dias corridos entre o prazo e hoje (0 se não está atrasado). */
export function diasDeAtraso(p: Pick<PlanoAcao, "status" | "prazo">, hoje: string): number {
  if (!estaAtrasado(p, hoje) || !p.prazo) return 0;
  const a = Date.UTC(Number(p.prazo.slice(0, 4)), Number(p.prazo.slice(5, 7)) - 1, Number(p.prazo.slice(8, 10)));
  const b = Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, Number(hoje.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

/** O prazo não pode estar no passado (hoje vale). */
export const prazoValido = (prazo: string | null | undefined, hoje: string): boolean => prazo == null || prazo === "" || prazo >= hoje;

/* ------------------------------------------------------------------ duplicados */

/** Ignora acento, caixa e espaços repetidos só na comparação (o banco guarda o texto como foi digitado). */
export const normalizarTexto = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Plano aberto da mesma loja com a mesma descrição = duplicado. Planos concluídos ou cancelados não contam
 * (o mesmo problema pode voltar). Só vale para planos lançados à mão: os dos checklists já são únicos por item.
 */
export function planoDuplicado(planos: readonly Pick<PlanoAcao, "id" | "lojaId" | "descricao" | "status">[], novo: { lojaId: string; descricao: string }, ignorarId?: string | null): PlanoAcao["id"] | null {
  const alvo = normalizarTexto(novo.descricao);
  const achado = planos.find((p) => p.id !== ignorarId && p.lojaId === novo.lojaId && estaAberto(p) && normalizarTexto(p.descricao) === alvo);
  return achado?.id ?? null;
}

/* ------------------------------------------------------------------ filtro e ordem */

export type SituacaoFiltro = "todas" | "abertos" | "atrasado" | "pendente" | "em_andamento" | "concluido" | "cancelado" | "verificar";

export type FiltroPlanos = {
  /** Id da loja; null = rede toda. */
  loja: string | null;
  situacao: SituacaoFiltro;
  origem: OrigemPlano | "todas";
  prioridade: PrioridadePlano | "todas";
  texto: string;
  /** Só os planos nascidos deste registro (visita ou checklist); null = todos. */
  origemId: string | null;
};

export const FILTRO_VAZIO: FiltroPlanos = { loja: null, situacao: "abertos", origem: "todas", prioridade: "todas", texto: "", origemId: null };

export const SITUACOES_FILTRO: readonly { v: SituacaoFiltro; rotulo: string }[] = [
  { v: "abertos", rotulo: "Em aberto" },
  { v: "atrasado", rotulo: "Atrasados" },
  { v: "pendente", rotulo: "Pendentes" },
  { v: "em_andamento", rotulo: "Em andamento" },
  { v: "verificar", rotulo: "Aguardando verificação" },
  { v: "concluido", rotulo: "Concluídos" },
  { v: "cancelado", rotulo: "Cancelados" },
  { v: "todas", rotulo: "Todos" },
];

export function filtrarPlanos(planos: readonly PlanoAcao[], f: FiltroPlanos, hoje: string, nomeLoja: (id: string) => string = () => ""): PlanoAcao[] {
  const busca = normalizarTexto(f.texto);
  return planos.filter((p) => {
    if (f.loja && p.lojaId !== f.loja) return false;
    if (f.origemId && p.origemId !== f.origemId) return false;
    if (f.origem !== "todas" && p.origemTipo !== f.origem) return false;
    if (f.prioridade !== "todas" && p.prioridade !== f.prioridade) return false;
    switch (f.situacao) {
      case "abertos":
        if (!estaAberto(p)) return false;
        break;
      case "atrasado":
        if (!estaAtrasado(p, hoje)) return false;
        break;
      case "verificar":
        if (!aguardaVerificacao(p)) return false;
        break;
      case "todas":
        break;
      default:
        if (p.status !== f.situacao) return false;
    }
    if (busca) {
      const palheiro = normalizarTexto([p.descricao, p.acao, p.responsavel, p.origemRotulo, p.evidencia, p.observacoes, nomeLoja(p.lojaId)].filter(Boolean).join(" "));
      if (!palheiro.includes(busca)) return false;
    }
    return true;
  });
}

const PESO_PRIORIDADE: Record<PrioridadePlano, number> = { alta: 0, media: 1, baixa: 2 };

function grupoDeOrdem(p: PlanoAcao, hoje: string): number {
  if (estaAtrasado(p, hoje)) return 0;
  if (estaAberto(p)) return 1;
  if (p.status === "concluido") return aguardaVerificacao(p) ? 2 : 3;
  return 4;
}

/** Atrasados primeiro (os mais antigos antes), depois os abertos por prazo, os concluídos a verificar, os verificados e os cancelados. */
export function ordenarPlanos(planos: readonly PlanoAcao[], hoje: string): PlanoAcao[] {
  return [...planos].sort((a, b) => {
    const ga = grupoDeOrdem(a, hoje);
    const gb = grupoDeOrdem(b, hoje);
    if (ga !== gb) return ga - gb;
    if (ga <= 1) {
      const pa = a.prazo ?? "9999-12-31";
      const pb = b.prazo ?? "9999-12-31";
      if (pa !== pb) return pa.localeCompare(pb);
      if (a.prioridade !== b.prioridade) return PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];
    } else if (ga <= 3) {
      const ca = a.dataConclusao ?? "";
      const cb = b.dataConclusao ?? "";
      if (ca !== cb) return cb.localeCompare(ca);
    }
    return b.criadoEm.localeCompare(a.criadoEm) || a.id.localeCompare(b.id);
  });
}

/* ------------------------------------------------------------------ resumo */

export type ResumoPlanos = {
  total: number;
  abertos: number;
  pendentes: number;
  emAndamento: number;
  atrasados: number;
  concluidos: number;
  cancelados: number;
  aguardandoVerificacao: number;
  verificados: number;
  /** Concluídos ÷ (concluídos + abertos) × 100; cancelados não entram. null se não há plano para contar. */
  taxaConclusao: number | null;
};

export function resumirPlanos(planos: readonly PlanoAcao[], hoje: string): ResumoPlanos {
  let pendentes = 0;
  let emAndamento = 0;
  let atrasados = 0;
  let concluidos = 0;
  let cancelados = 0;
  let aguardando = 0;
  for (const p of planos) {
    if (p.status === "pendente") pendentes++;
    else if (p.status === "em_andamento") emAndamento++;
    else if (p.status === "concluido") {
      concluidos++;
      if (aguardaVerificacao(p)) aguardando++;
    } else cancelados++;
    if (estaAtrasado(p, hoje)) atrasados++;
  }
  const abertos = pendentes + emAndamento;
  const base = abertos + concluidos;
  return { total: planos.length, abertos, pendentes, emAndamento, atrasados, concluidos, cancelados, aguardandoVerificacao: aguardando, verificados: concluidos - aguardando, taxaConclusao: base > 0 ? (concluidos / base) * 100 : null };
}

export type PendenciaLoja = { lojaId: string; abertos: number; atrasados: number; aguardandoVerificacao: number };

/** Abertos, atrasados e a verificar por loja (lojas sem pendência não entram), das mais críticas para as menos. */
export function pendenciasPorLoja(planos: readonly PlanoAcao[], hoje: string): PendenciaLoja[] {
  const m = new Map<string, PendenciaLoja>();
  for (const p of planos) {
    const aberto = estaAberto(p);
    const verificar = aguardaVerificacao(p);
    if (!aberto && !verificar) continue;
    const x = m.get(p.lojaId) ?? { lojaId: p.lojaId, abertos: 0, atrasados: 0, aguardandoVerificacao: 0 };
    if (aberto) x.abertos++;
    if (estaAtrasado(p, hoje)) x.atrasados++;
    if (verificar) x.aguardandoVerificacao++;
    m.set(p.lojaId, x);
  }
  return [...m.values()].sort((a, b) => b.atrasados - a.atrasados || b.abertos - a.abertos || b.aguardandoVerificacao - a.aguardandoVerificacao || a.lojaId.localeCompare(b.lojaId));
}

/** Contagem de planos por registro de origem (visita ou checklist): total e abertos. */
export function contarPorOrigem(planos: readonly Pick<PlanoAcao, "origemId" | "status">[]): Map<string, { total: number; abertos: number }> {
  const m = new Map<string, { total: number; abertos: number }>();
  for (const p of planos) {
    if (!p.origemId) continue;
    const x = m.get(p.origemId) ?? { total: 0, abertos: 0 };
    x.total++;
    if (estaAberto(p)) x.abertos++;
    m.set(p.origemId, x);
  }
  return m;
}

/** Datas-limite sugeridas ao criar um plano (atalhos de prazo). */
export const prazoEmDias = (hoje: string, dias: number): string => somarDias(hoje, dias);

/* ------------------------------------------------------------------ exportação (CSV) */

type Celula = string | number | null;

export function linhasCsvPlanos(planos: readonly PlanoAcao[], nomeLoja: (id: string) => string, hoje: string): Celula[][] {
  return [
    ["Loja", "Origem", "Referência da origem", "Descrição", "Ação", "Responsável", "Prazo", "Prioridade", "Situação", "Dias de atraso", "Concluído em", "Evidência", "Verificado em", "Observações"],
    ...planos.map((p) => [
      nomeLoja(p.lojaId),
      rotuloOrigem(p.origemTipo),
      p.origemRotulo,
      p.descricao,
      p.acao ?? "",
      p.responsavel ?? "",
      p.prazo ?? "",
      rotuloPrioridade(p.prioridade),
      rotuloSituacao(situacaoPlano(p, hoje)),
      diasDeAtraso(p, hoje) || "",
      p.dataConclusao ?? "",
      p.evidencia ?? "",
      p.verificadoEm ? p.verificadoEm.slice(0, 10) : "",
      p.observacoes ?? "",
    ]),
  ];
}

/* ------------------------------------------------------------------ histórico de alterações */

type Json = Record<string, unknown> | null | undefined;

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const curto = (v: unknown): string => {
  const t = typeof v === "string" ? v.trim() : "";
  if (!t) return "—";
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
};

const CAMPOS_HISTORICO: readonly { campo: string; rotulo: string; fmt: (v: unknown) => string }[] = [
  { campo: "status", rotulo: "Situação", fmt: (v) => (typeof v === "string" ? rotuloStatusPlano(v as StatusPlano) : "—") },
  { campo: "descricao", rotulo: "Descrição", fmt: curto },
  { campo: "acao", rotulo: "Ação", fmt: curto },
  { campo: "responsavel", rotulo: "Responsável", fmt: curto },
  { campo: "prazo", rotulo: "Prazo", fmt: (v) => (typeof v === "string" && v ? dmy(v) : "—") },
  { campo: "prioridade", rotulo: "Prioridade", fmt: (v) => (typeof v === "string" ? rotuloPrioridade(v as PrioridadePlano) : "—") },
  { campo: "evidencia", rotulo: "Evidência", fmt: curto },
  { campo: "observacoes", rotulo: "Observações", fmt: curto },
  { campo: "verificado_em", rotulo: "Verificação", fmt: (v) => (v ? "verificado" : "sem verificação") },
  { campo: "origem_id", rotulo: "Vínculo com o registro de origem", fmt: (v) => (v ? "mantido" : "desfeito") },
];

/** Frases curtas do que mudou numa linha do histórico (criação, exclusão ou alteração campo a campo). */
export function descreverAlteracao(acao: string, antes: Json, depois: Json): string[] {
  if (acao === "insert") return ["Plano criado"];
  if (acao === "delete") return ["Plano excluído"];
  const out: string[] = [];
  for (const c of CAMPOS_HISTORICO) {
    const a = antes?.[c.campo] ?? null;
    const d = depois?.[c.campo] ?? null;
    if (JSON.stringify(a) === JSON.stringify(d)) continue;
    out.push(`${c.rotulo}: ${c.fmt(a)} → ${c.fmt(d)}`);
  }
  return out;
}

export type ItemHistoricoPlano = { id: string; quando: string; acao: "insert" | "update" | "delete"; usuario: string; mudancas: string[] };

/* ------------------------------------------------------------------ geração de planos a partir do delivery */

export type ResultadoGerarPlanos = { criados: number; existentes: number; retirados: number; cancelados: number };

/** Frase do que a geração de planos fez (criou, já existia, retirou, cancelou). */
export function textoGeracaoPlanos(r: ResultadoGerarPlanos): string {
  const partes: string[] = [];
  if (r.criados > 0) partes.push(`${r.criados} ${r.criados === 1 ? "plano criado" : "planos criados"}`);
  if (r.existentes > 0) partes.push(`${r.existentes} ${r.existentes === 1 ? "desvio já tinha plano" : "desvios já tinham plano"}`);
  if (r.retirados > 0) partes.push(`${r.retirados} ${r.retirados === 1 ? "plano retirado" : "planos retirados"} (o desvio deixou de existir)`);
  if (r.cancelados > 0) partes.push(`${r.cancelados} ${r.cancelados === 1 ? "plano cancelado" : "planos cancelados"} (o desvio deixou de existir, mas já tinha ação)`);
  return partes.length > 0 ? `${partes.join("; ")}.` : "Este checklist não tem desvios: nenhum plano a gerar.";
}
