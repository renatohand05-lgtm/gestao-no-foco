/**
 * Rede de lojas — checklist de qualidade (visita de campo).
 * Puro (sem banco, sem React): os testes importam daqui e conferem contra o painel original (HTML).
 *
 * 34 itens em 6 seções, cada um respondido Sim / Não / N/A. Nota = "Sim" ÷ (Sim + Não): o N/A não conta.
 * Item "Não" é um desvio e vira plano de ação.
 */
import { somarDias } from "./calculo.ts";
import type { PlanoAcao, RespostaQualidade, RespostasQualidade, Status, VisitaQualidade } from "./tipos.ts";

export type SecaoQualidade = { titulo: string; itens: readonly string[] };

/** Seções e itens do painel original (textos idênticos). */
export const SECOES_QUALIDADE: readonly SecaoQualidade[] = [
  {
    titulo: "Produção, qualidade e segurança alimentar",
    itens: [
      "Fichas técnicas disponíveis e seguidas",
      "Porcionamento conforme o padrão",
      "Temperaturas de cocção e conservação registradas",
      "Uniforme, touca e higiene das mãos da equipe",
      "Separação de alimentos crus e prontos",
      "Montagem e apresentação dos pratos no padrão",
    ],
  },
  {
    titulo: "Estoque, validade e abastecimento",
    itens: [
      "Itens abertos com etiqueta de validade",
      "PVPS/PEPS aplicado no estoque",
      "Câmaras e freezers na temperatura correta",
      "Nenhum produto vencido ou sem identificação",
      "Inventário dos itens críticos em dia",
      "Abastecimento da cozinha central conforme o pedido",
    ],
  },
  {
    titulo: "Delivery, embalagem e expedição",
    itens: [
      "Conferência do pedido antes da saída",
      "Embalagens lacradas e com selo",
      "Pedido completo, com itens e adicionais corretos",
      "Tempo de expedição dentro do padrão",
      "Área de retirada organizada",
      "Itens quentes e frios separados",
    ],
  },
  {
    titulo: "Limpeza, manutenção e estrutura",
    itens: [
      "Cozinha e salão limpos",
      "Cronograma de limpeza preenchido",
      "Equipamentos funcionando",
      "Coifa, ralos e lixeiras em ordem",
      "Controle de pragas em dia",
      "Banheiros limpos e abastecidos",
    ],
  },
  {
    titulo: "Escalas, pessoas e liderança",
    itens: [
      "Escala cumprida nos horários de pico",
      "Faltas cobertas sem desfalcar a operação",
      "Líder de turno presente",
      "Reunião pré-turno realizada",
      "Treinamentos registrados",
    ],
  },
  {
    titulo: "Cumprimento dos padrões operacionais",
    itens: [
      "Cardápio atualizado nas plataformas",
      "Atendimento do salão no padrão (Brooklyn)",
      "Uniformes e identidade visual no padrão",
      "Planos de ação da visita anterior concluídos",
      "Checklists de abertura e fechamento preenchidos",
    ],
  },
];

export const TOTAL_ITENS_QUALIDADE = SECOES_QUALIDADE.reduce((a, s) => a + s.itens.length, 0);
/** Nota a partir da qual a visita está "na meta" (painel original). */
export const META_NOTA_QUALIDADE = 90;
/** Entre este valor e a meta a visita fica em "atenção"; abaixo, crítica. */
export const ATENCAO_NOTA_QUALIDADE = 75;
/** Sem visita há mais que isso (dias), a loja aparece como "sem visita recente". */
export const DIAS_SEM_VISITA = 30;

export const RESPOSTAS_QUALIDADE: readonly { v: RespostaQualidade; rotulo: string }[] = [
  { v: "sim", rotulo: "Sim" },
  { v: "nao", rotulo: "Não" },
  { v: "na", rotulo: "N/A" },
];

export const chaveItem = (secao: number, item: number): string => `${secao}-${item}`;

/** Lê "2-3" → [2, 3]; null se a chave não existe na lista. */
export function lerChaveItem(chave: string): { secao: number; item: number } | null {
  const m = /^([0-5])-([0-5])$/.exec(chave);
  if (!m) return null;
  const secao = Number(m[1]);
  const item = Number(m[2]);
  return item < (SECOES_QUALIDADE[secao]?.itens.length ?? 0) ? { secao, item } : null;
}

export const textoDoItem = (chave: string): string | null => {
  const c = lerChaveItem(chave);
  return c ? (SECOES_QUALIDADE[c.secao]?.itens[c.item] ?? null) : null;
};

/** Nome curto da seção nas barras: o texto até a primeira vírgula (como no painel original). */
export const rotuloCurtoSecao = (secao: number): string => (SECOES_QUALIDADE[secao]?.titulo ?? "").split(",")[0] ?? "";

/* ------------------------------------------------------------------ nota */

export type ResumoSecaoQualidade = {
  indice: number;
  titulo: string;
  rotulo: string;
  total: number;
  sim: number;
  nao: number;
  na: number;
  /** Itens com resposta (Sim + Não + N/A). */
  avaliados: number;
  /** Itens que contam na nota (Sim + Não). */
  aplicaveis: number;
  /** Sim ÷ (Sim + Não) × 100; null se nenhum item da seção conta. */
  nota: number | null;
};

export type ResumoVisitaQualidade = {
  secoes: ResumoSecaoQualidade[];
  sim: number;
  nao: number;
  na: number;
  avaliados: number;
  aplicaveis: number;
  nota: number | null;
  status: Status;
};

/** Cor/estado da nota: 90% ou mais = na meta; de 75% a menos de 90% = atenção; abaixo = crítica. */
export function statusNota(nota: number | null | undefined): Status {
  if (nota == null || !Number.isFinite(nota)) return "neu";
  return nota >= META_NOTA_QUALIDADE ? "ok" : nota >= ATENCAO_NOTA_QUALIDADE ? "warn" : "bad";
}

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * "92%" — sem casas decimais, como no painel original. Só quando o arredondamento faria a nota parecer
 * melhor do que é (89,7% aparecendo como "90%" mas ainda em atenção) mostra uma casa, truncada: "89,7%".
 */
export function formatarNota(nota: number | null | undefined): string {
  if (nota == null || !Number.isFinite(nota)) return "—";
  const r = Math.round(nota);
  const enganaria = (r >= META_NOTA_QUALIDADE && nota < META_NOTA_QUALIDADE) || (r >= ATENCAO_NOTA_QUALIDADE && nota < ATENCAO_NOTA_QUALIDADE);
  return enganaria ? `${nf1.format(Math.floor(nota * 10) / 10)}%` : `${nf0.format(nota)}%`;
}

export function resumirVisita(respostas: Readonly<RespostasQualidade>): ResumoVisitaQualidade {
  const secoes = SECOES_QUALIDADE.map((sec, indice): ResumoSecaoQualidade => {
    let sim = 0;
    let nao = 0;
    let na = 0;
    sec.itens.forEach((_, i) => {
      const v = respostas[chaveItem(indice, i)]?.v;
      if (v === "sim") sim++;
      else if (v === "nao") nao++;
      else if (v === "na") na++;
    });
    const aplicaveis = sim + nao;
    return { indice, titulo: sec.titulo, rotulo: rotuloCurtoSecao(indice), total: sec.itens.length, sim, nao, na, avaliados: aplicaveis + na, aplicaveis, nota: aplicaveis > 0 ? (sim / aplicaveis) * 100 : null };
  });
  const sim = secoes.reduce((a, s) => a + s.sim, 0);
  const nao = secoes.reduce((a, s) => a + s.nao, 0);
  const na = secoes.reduce((a, s) => a + s.na, 0);
  const aplicaveis = sim + nao;
  const nota = aplicaveis > 0 ? (sim / aplicaveis) * 100 : null;
  return { secoes, sim, nao, na, avaliados: aplicaveis + na, aplicaveis, nota, status: statusNota(nota) };
}

/* ------------------------------------------------------------------ desvios */

export type DesvioQualidade = { chave: string; secao: number; item: number; titulo: string; secaoTitulo: string; observacao: string | null };

/** Itens marcados "Não", na ordem da lista. */
export function desviosDaVisita(respostas: Readonly<RespostasQualidade>): DesvioQualidade[] {
  const out: DesvioQualidade[] = [];
  SECOES_QUALIDADE.forEach((sec, s) =>
    sec.itens.forEach((titulo, i) => {
      const r = respostas[chaveItem(s, i)];
      if (r?.v === "nao") out.push({ chave: chaveItem(s, i), secao: s, item: i, titulo, secaoTitulo: sec.titulo, observacao: r.o?.trim() ? r.o.trim() : null });
    }),
  );
  return out;
}

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Texto que identifica a origem do plano na lista de planos de ação. */
export const rotuloOrigemQualidade = (data: string, secao: number): string => `Visita de qualidade de ${dmy(data)} · seção ${secao + 1}`;

/* ------------------------------------------------------------------ respostas (entrada e saída) */

/**
 * Deixa só o que o banco aceita: itens da lista, respostas Sim/Não/N/A e observação de até 300 caracteres.
 * Item sem resposta e sem observação é descartado (o banco guarda só o que foi preenchido).
 */
export function limparRespostas(bruto: Readonly<Record<string, { v?: string | null; o?: string | null } | null | undefined>>): RespostasQualidade {
  const out: RespostasQualidade = {};
  for (const [k, r] of Object.entries(bruto)) {
    if (!lerChaveItem(k) || !r) continue;
    const v = r.v === "sim" || r.v === "nao" || r.v === "na" ? r.v : null;
    const o = typeof r.o === "string" && r.o.trim() !== "" ? r.o.trim().slice(0, 300) : null;
    if (v || o) out[k] = { v, o };
  }
  return out;
}

/** Formato gravado no banco: {"0-1": {"v": "nao", "o": "..."}} (sem campos vazios). */
export function respostasParaBanco(respostas: Readonly<RespostasQualidade>): Record<string, { v?: RespostaQualidade; o?: string }> {
  const out: Record<string, { v?: RespostaQualidade; o?: string }> = {};
  for (const [k, r] of Object.entries(respostas)) {
    if (!lerChaveItem(k)) continue;
    const item: { v?: RespostaQualidade; o?: string } = {};
    if (r.v) item.v = r.v;
    if (r.o && r.o.trim()) item.o = r.o.trim();
    if (item.v || item.o) out[k] = item;
  }
  return out;
}

/* ------------------------------------------------------------------ visão da rede */

/** Mais recente primeiro: pela data da visita e, no mesmo dia, pela ordem de cadastro. */
export const ordenarVisitas = <T extends Pick<VisitaQualidade, "data" | "criadaEm">>(visitas: readonly T[]): T[] =>
  [...visitas].sort((a, b) => b.data.localeCompare(a.data) || b.criadaEm.localeCompare(a.criadaEm));

/** Última visita de cada loja (a de data mais recente). */
export function ultimaVisitaPorLoja(visitas: readonly VisitaQualidade[]): Map<string, VisitaQualidade> {
  const m = new Map<string, VisitaQualidade>();
  for (const v of ordenarVisitas(visitas)) if (!m.has(v.lojaId)) m.set(v.lojaId, v);
  return m;
}

export type ResumoRedeQualidade = {
  /** Última visita de cada loja que tem visita, com a nota. */
  ultimas: { lojaId: string; visita: VisitaQualidade; nota: number | null; status: Status }[];
  /** Média das notas das últimas visitas (lojas com nota). */
  notaMedia: number | null;
  /** Visitas feitas nos últimos 30 dias. */
  visitasRecentes: number;
  /** Lojas sem nenhuma visita nos últimos 30 dias (inclui as que nunca tiveram). */
  lojasSemVisita: string[];
};

export function resumirRedeQualidade(visitas: readonly VisitaQualidade[], lojaIds: readonly string[], hoje: string): ResumoRedeQualidade {
  const noFiltro = new Set(lojaIds);
  const dela = visitas.filter((v) => noFiltro.has(v.lojaId));
  const ultimas = [...ultimaVisitaPorLoja(dela).values()].map((visita) => {
    const nota = resumirVisita(visita.respostas).nota;
    return { lojaId: visita.lojaId, visita, nota, status: statusNota(nota) };
  });
  const comNota = ultimas.filter((u) => u.nota != null);
  const limite = somarDias(hoje, -(DIAS_SEM_VISITA - 1));
  const recentes = dela.filter((v) => v.data >= limite && v.data <= hoje);
  const comVisitaRecente = new Set(recentes.map((v) => v.lojaId));
  return {
    ultimas: ultimas.sort((a, b) => (a.nota ?? 101) - (b.nota ?? 101) || a.lojaId.localeCompare(b.lojaId)),
    notaMedia: comNota.length > 0 ? comNota.reduce((a, u) => a + (u.nota ?? 0), 0) / comNota.length : null,
    visitasRecentes: recentes.length,
    lojasSemVisita: lojaIds.filter((id) => !comVisitaRecente.has(id)),
  };
}

/* ------------------------------------------------------------------ exportação (CSV) */

type Celula = string | number | null;
const ROTULO_STATUS_PLANO: Record<PlanoAcao["status"], string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado" };

/**
 * Mesmas colunas do painel original (Data, Loja, Avaliador, Gerente, Nota %, Desvio, Seção, Observação, Ação,
 * Responsável, Prazo, Status), uma linha por desvio (visita sem desvio = uma linha com a parte do desvio em branco).
 */
export function linhasCsvVisitas(visitas: readonly VisitaQualidade[], planosDaVisita: (visitaId: string) => readonly PlanoAcao[], nomeLoja: (id: string) => string): Celula[][] {
  const linhas: Celula[][] = [["Data", "Loja", "Avaliador", "Gerente", "Nota %", "Desvio", "Seção", "Observação", "Ação", "Responsável", "Prazo", "Status"]];
  for (const v of visitas) {
    const resumo = resumirVisita(v.respostas);
    const nota = resumo.nota == null ? "" : Math.round(resumo.nota);
    const base: Celula[] = [v.data, nomeLoja(v.lojaId), v.avaliador, v.gerente ?? "", nota];
    const desvios = desviosDaVisita(v.respostas);
    if (desvios.length === 0) {
      linhas.push([...base, "", "", "", "", "", "", ""]);
      continue;
    }
    const planos = planosDaVisita(v.id);
    for (const d of desvios) {
      const p = planos.find((x) => x.origemRef === d.chave);
      linhas.push([...base, d.titulo, d.secaoTitulo, d.observacao ?? "", p?.acao ?? "", p?.responsavel ?? "", p?.prazo ?? "", p ? ROTULO_STATUS_PLANO[p.status] : ""]);
    }
  }
  return linhas;
}
