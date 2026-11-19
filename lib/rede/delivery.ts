/**
 * Rede de lojas — checklist de delivery (diário ou semanal, por loja).
 * Puro (sem banco, sem React): os testes importam daqui e conferem contra o painel original (HTML).
 *
 * O registro tem três partes: 5 indicadores com meta (preparo, cancelamentos, nota iFood, tempo online e
 * rupturas), 8 de acompanhamento comercial e financeiro (sem meta) e a rotina operacional de 7 itens
 * (Sim / Não / N/A). Os desvios saem dos indicadores fora da meta e dos itens da rotina marcados "Não".
 */
import { formatarValor, mesDe, primeiroDiaDoMes, resolverMeta, statusMeta } from "./calculo.ts";
import { segundaDaSemana } from "./financeiro.ts";
import type { Direcao, FormatoValor, IndicadorKey, IndicadorMes, MetaRow, PeriodoDelivery, PrioridadePlano, RegistroDelivery, RespostaRotina, Status } from "./tipos.ts";

/** Rotina de delivery — textos do painel original. */
export const ROTINA_DELIVERY: readonly string[] = [
  "Cardápio sem itens indisponíveis ativos",
  "Itens em falta pausados nas plataformas",
  "Avaliações e reclamações respondidas",
  "Campanhas e combos ativos revisados",
  "Raio de entrega e taxa revisados",
  "Conferência e embalagem auditadas no pico",
  "Motivos de cancelamento analisados",
];

export type CampoMeta = "preparo" | "cancelamentos" | "notaIfood" | "tempoOnline" | "rupturas";

export type DefMetaDelivery = {
  k: "preparo" | "cancel" | "ifood" | "online" | "rupturas";
  /** Indicador da tela de Metas que tem a meta (e que este checklist alimenta). */
  indicador: IndicadorKey;
  campo: CampoMeta;
  nome: string;
  unidade: string;
  formato: FormatoValor;
  /** Meta do painel original; vale quando a empresa não tem meta cadastrada. */
  metaPadrao: number;
  direcao: Direcao;
  passo: number;
};

export const METAS_DELIVERY: readonly DefMetaDelivery[] = [
  { k: "preparo", indicador: "preparo", campo: "preparo", nome: "Tempo médio de preparo", unidade: "min", formato: "min", metaPadrao: 15, direcao: "max", passo: 0.1 },
  { k: "cancel", indicador: "cancel", campo: "cancelamentos", nome: "Cancelamentos", unidade: "%", formato: "pct1", metaPadrao: 2, direcao: "max", passo: 0.1 },
  { k: "ifood", indicador: "ifood", campo: "notaIfood", nome: "Nota iFood", unidade: "", formato: "nota", metaPadrao: 4.7, direcao: "min", passo: 0.01 },
  { k: "online", indicador: "online", campo: "tempoOnline", nome: "Tempo online", unidade: "%", formato: "pct1", metaPadrao: 97, direcao: "min", passo: 0.1 },
  { k: "rupturas", indicador: "rupturas", campo: "rupturas", nome: "Rupturas na semana", unidade: "", formato: "int", metaPadrao: 5, direcao: "max", passo: 1 },
];

export type CampoAcomp = "pedidos" | "ticketMedio" | "conversao" | "atrasos" | "comissoes" | "freteSubsidiado" | "promocoes" | "custoPedido";

export const ACOMPANHAMENTOS_DELIVERY: readonly { k: string; campo: CampoAcomp; nome: string; unidade: string; inteiro: boolean }[] = [
  { k: "pedidos", campo: "pedidos", nome: "Pedidos", unidade: "", inteiro: true },
  { k: "ticket", campo: "ticketMedio", nome: "Ticket médio", unidade: "R$", inteiro: false },
  { k: "conversao", campo: "conversao", nome: "Conversão", unidade: "%", inteiro: false },
  { k: "atrasos", campo: "atrasos", nome: "Atrasos", unidade: "%", inteiro: false },
  { k: "comissao", campo: "comissoes", nome: "Comissões e taxas", unidade: "%", inteiro: false },
  { k: "frete", campo: "freteSubsidiado", nome: "Frete subsidiado", unidade: "R$", inteiro: false },
  { k: "promo", campo: "promocoes", nome: "Promoções e descontos", unidade: "R$", inteiro: false },
  { k: "custoPed", campo: "custoPedido", nome: "Custo de delivery por pedido", unidade: "R$", inteiro: false },
];

/** De onde vem o valor de um indicador que a tela de Metas passa a mostrar como "calculado". */
export const FONTE_CALCULADA: Partial<Record<IndicadorKey, string>> = {
  cmv: "das contagens de CMV",
  rupturas: "das rupturas registradas",
  preparo: "dos checklists de delivery (média do mês)",
  cancel: "dos checklists de delivery (média do mês)",
  ifood: "dos checklists de delivery (média do mês)",
  online: "dos checklists de delivery (média do mês)",
};

/** Versão curta, para legenda embaixo do número na tela de Metas. */
export const FONTE_CALCULADA_CURTA: Partial<Record<IndicadorKey, string>> = {
  cmv: "das contagens",
  rupturas: "das rupturas",
  preparo: "dos checklists",
  cancel: "dos checklists",
  ifood: "dos checklists",
  online: "dos checklists",
};

/* ------------------------------------------------------------------ datas */

/** Semanal: a data do registro é sempre a segunda-feira da semana. */
export const dataDoRegistro = (periodo: PeriodoDelivery, data: string): string => (periodo === "semanal" ? segundaDaSemana(data) : data);

/* ------------------------------------------------------------------ avaliação */

export type AvaliacaoMeta = {
  k: DefMetaDelivery["k"];
  nome: string;
  formato: FormatoValor;
  valor: number | null;
  meta: number | null;
  direcao: Direcao | null;
  status: Status;
};

export type ResumoRotina = {
  sim: number;
  nao: number;
  na: number;
  /** Itens que a loja respondeu (Sim + Não + N/A). */
  respondidos: number;
  /** Itens aplicáveis (Sim + Não). */
  aplicaveis: number;
  /** Sim ÷ aplicáveis × 100. */
  pct: number | null;
};

/** `ref` identifica o desvio no registro ("ind-preparo", "rotina-2"): é o que impede um plano de ação duplicado. */
export type Desvio = { tipo: "indicador" | "rotina"; ref: string; titulo: string; detalhe: string; status: Status };

export type AvaliacaoRegistro = {
  metas: AvaliacaoMeta[];
  preenchidos: number;
  naMeta: number;
  rotina: ResumoRotina;
  desvios: Desvio[];
};

export function resumirRotina(rotina: Readonly<Record<number, RespostaRotina | null | undefined>>): ResumoRotina {
  let sim = 0;
  let nao = 0;
  let na = 0;
  for (let i = 0; i < ROTINA_DELIVERY.length; i++) {
    const r = rotina[i];
    if (r === "sim") sim++;
    else if (r === "nao") nao++;
    else if (r === "na") na++;
  }
  const aplicaveis = sim + nao;
  return { sim, nao, na, respondidos: sim + nao + na, aplicaveis, pct: aplicaveis > 0 ? (sim / aplicaveis) * 100 : null };
}

/** Meta do indicador na data: a cadastrada (da loja ou da rede) ou, se não houver, a do painel original. */
export function metaDoDelivery(def: DefMetaDelivery, metas: readonly MetaRow[], lojaId: string | null, data: string): { meta: number; direcao: Direcao } {
  const r = resolverMeta(metas, lojaId, def.indicador, data);
  return r.meta != null && r.direcao != null ? { meta: r.meta, direcao: r.direcao } : { meta: def.metaPadrao, direcao: def.direcao };
}

const nfMeta = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** "meta: até 15 min", "meta: pelo menos 4,7"… — a escrita do painel original (sem casas decimais sobrando). */
export const textoMetaDelivery = (def: DefMetaDelivery, meta: number, direcao: Direcao): string =>
  `meta: ${direcao === "max" ? "até" : "pelo menos"} ${nfMeta.format(meta)}${def.unidade === "min" ? " min" : def.unidade === "%" ? "%" : ""}${def.k === "rupturas" ? " por semana" : ""}`;

export type EntradaAvaliacao = Pick<RegistroDelivery, "lojaId" | "data" | "periodo" | "preparo" | "cancelamentos" | "notaIfood" | "tempoOnline" | "rupturas" | "rotina">;

/**
 * Compara cada indicador com a meta e resume a rotina. A meta de rupturas é semanal: num registro diário o
 * valor aparece, mas não é comparado (ficaria enganoso comparar um dia com uma semana).
 */
export function avaliarRegistro(reg: EntradaAvaliacao, metas: readonly MetaRow[], tolPct = 10): AvaliacaoRegistro {
  const avaliadas: AvaliacaoMeta[] = METAS_DELIVERY.map((def) => {
    const valor = reg[def.campo];
    const { meta, direcao } = metaDoDelivery(def, metas, reg.lojaId, reg.data);
    const comparavel = !(def.k === "rupturas" && reg.periodo === "diario");
    return { k: def.k, nome: def.nome, formato: def.formato, valor, meta, direcao, status: comparavel ? statusMeta(meta, direcao, valor, tolPct) : "neu" };
  });
  const comValor = avaliadas.filter((m) => m.valor != null);
  const rotina = resumirRotina(reg.rotina);

  const desvios: Desvio[] = [];
  for (const m of avaliadas) {
    if (m.status !== "warn" && m.status !== "bad") continue;
    const def = METAS_DELIVERY.find((d) => d.k === m.k);
    if (!def || m.valor == null || m.meta == null || m.direcao == null) continue;
    desvios.push({
      tipo: "indicador",
      ref: `ind-${m.k}`,
      titulo: m.nome,
      detalhe: `${formatarValor(m.formato, m.valor)} (${textoMetaDelivery(def, m.meta, m.direcao)})`,
      status: m.status,
    });
  }
  ROTINA_DELIVERY.forEach((texto, i) => {
    if (reg.rotina[i] === "nao") desvios.push({ tipo: "rotina", ref: `rotina-${i}`, titulo: texto, detalhe: "Item da rotina marcado como não cumprido", status: "bad" });
  });

  return { metas: avaliadas, preenchidos: comValor.length, naMeta: comValor.filter((m) => m.status === "ok").length, rotina, desvios };
}

/* ------------------------------------------------------------------ planos de ação a partir dos desvios */

export type PlanoSugerido = { ref: string; descricao: string; prioridade: PrioridadePlano };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Indicador fora da meta crítico = prioridade alta; em atenção ou item da rotina = média. */
export function planosSugeridos(desvios: readonly Desvio[]): PlanoSugerido[] {
  return desvios.map((d) => ({
    ref: d.ref,
    descricao: (d.tipo === "indicador" ? `${d.titulo} fora da meta: ${d.detalhe}` : `Rotina de delivery não cumprida: ${d.titulo}`).slice(0, 500),
    prioridade: d.tipo === "indicador" && d.status === "bad" ? "alta" : "media",
  }));
}

/** Texto que identifica o checklist de origem na lista de planos de ação. */
export const rotuloOrigemDelivery = (r: Pick<RegistroDelivery, "data" | "periodo">): string =>
  r.periodo === "semanal" ? `Checklist de delivery da semana de ${dmy(r.data)}` : `Checklist de delivery de ${dmy(r.data)}`;

/* ------------------------------------------------------------------ indicadores mensais */

const INDICADOR_DO_CAMPO: readonly { campo: "preparo" | "cancelamentos" | "notaIfood" | "tempoOnline"; indicador: IndicadorKey }[] = [
  { campo: "preparo", indicador: "preparo" },
  { campo: "cancelamentos", indicador: "cancel" },
  { campo: "notaIfood", indicador: "ifood" },
  { campo: "tempoOnline", indicador: "online" },
];

/**
 * Média do mês dos checklists de cada loja para preparo, cancelamentos, nota iFood e tempo online. Alimenta a
 * tela de Metas e o painel (o valor calculado tem prioridade sobre o lançado à mão). As rupturas não entram
 * aqui: o indicador de rupturas vem só das rupturas registradas, para não contar duas vezes.
 */
export function indicadoresDelivery(registros: readonly Pick<RegistroDelivery, "lojaId" | "data" | "preparo" | "cancelamentos" | "notaIfood" | "tempoOnline">[]): IndicadorMes[] {
  const acum = new Map<string, { lojaId: string; mes: string; indicador: IndicadorKey; soma: number; n: number }>();
  for (const r of registros) {
    for (const { campo, indicador } of INDICADOR_DO_CAMPO) {
      const v = r[campo];
      if (v == null || !Number.isFinite(v)) continue;
      const mes = mesDe(r.data);
      const k = `${r.lojaId}|${mes}|${indicador}`;
      const x = acum.get(k) ?? { lojaId: r.lojaId, mes, indicador, soma: 0, n: 0 };
      x.soma += v;
      x.n += 1;
      acum.set(k, x);
    }
  }
  return [...acum.values()]
    .map((x) => ({ lojaId: x.lojaId, mes: primeiroDiaDoMes(x.mes), indicador: x.indicador, valor: x.soma / x.n, origem: "calculado" as const }))
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.lojaId.localeCompare(b.lojaId) || a.indicador.localeCompare(b.indicador));
}

/* ------------------------------------------------------------------ exportação (CSV) */

type Celula = string | number | null;

export function linhasCsvRupturas(rupturas: readonly { data: string; lojaId: string; item: string; motivo: string; horas: number; acao: string | null }[], nomeLoja: (id: string) => string): Celula[][] {
  return [["Data", "Loja", "Item", "Motivo", "Horas", "Ação"], ...rupturas.map((r) => [r.data, nomeLoja(r.lojaId), r.item, r.motivo, r.horas, r.acao ?? ""])];
}

export function linhasCsvEstoque(linhas: readonly { produto: { item: string; unidade: string; atual: number; minimo: number; consumoDia: number; custo: number }; status: { rotulo: string }; cobertura: number | null; reposicao: number; valor: number }[]): Celula[][] {
  return [
    ["Item", "Unidade", "Estoque atual", "Mínimo", "Consumo diário", "Cobertura (dias)", "Status", "Reposição sugerida", "Custo unitário", "Valor em estoque"],
    ...linhas.map((l) => [l.produto.item, l.produto.unidade, l.produto.atual, l.produto.minimo, l.produto.consumoDia, l.cobertura == null ? "" : Math.round(l.cobertura * 10) / 10, l.status.rotulo, l.reposicao, l.produto.custo, Math.round(l.valor * 100) / 100]),
  ];
}

const ROTULO_RESPOSTA: Record<RespostaRotina, string> = { sim: "Sim", nao: "Não", na: "N/A" };

export function linhasCsvDelivery(registros: readonly RegistroDelivery[], nomeLoja: (id: string) => string): Celula[][] {
  const cab: Celula[] = ["Data", "Loja", "Período", "Responsável", ...METAS_DELIVERY.map((m) => m.nome), ...ACOMPANHAMENTOS_DELIVERY.map((a) => a.nome), ...ROTINA_DELIVERY, "Observações"];
  return [
    cab,
    ...registros.map((r) => [
      r.data,
      nomeLoja(r.lojaId),
      r.periodo === "semanal" ? "Semanal" : "Diário",
      r.responsavel ?? "",
      ...METAS_DELIVERY.map((m) => r[m.campo] ?? ""),
      ...ACOMPANHAMENTOS_DELIVERY.map((a) => r[a.campo] ?? ""),
      ...ROTINA_DELIVERY.map((_, i) => (r.rotina[i] ? ROTULO_RESPOSTA[r.rotina[i]] : "")),
      r.observacoes ?? "",
    ]),
  ];
}
