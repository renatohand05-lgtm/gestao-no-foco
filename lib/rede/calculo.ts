/**
 * Rede de lojas — cálculos puros (sem banco, sem React). Regras do painel
 * original (HTML Fat Buddha), todas a partir de lançamentos persistidos.
 *
 * Roda em Node puro (testes) e no servidor.
 */
import { INDICADORES } from "./tipos.ts";
import type {
  ConfigRede,
  Direcao,
  FormatoValor,
  IndicadorKey,
  IndicadorMes,
  Loja,
  MetaFaturamento,
  MetaRow,
  Status,
  VendaDia,
} from "./tipos.ts";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
type DiaSemana = (typeof DIAS_SEMANA)[number];

/* ------------------------------------------------------------------ datas */

export function diaDaSemana(iso: string): DiaSemana {
  return DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}
export const mesDe = (iso: string): string => iso.slice(0, 7);
export const primeiroDiaDoMes = (mes: string): string => `${mes}-01`;
export function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
}
export function somarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Dias de `de` a `ate`, inclusive. Limite de 3 660 dias para nunca travar. */
export function listarDias(de: string, ate: string): string[] {
  const out: string[] = [];
  for (let d = de; d <= ate && out.length < 3660; d = somarDias(d, 1)) out.push(d);
  return out;
}
export function listarMeses(de: string, ate: string): string[] {
  const out: string[] = [];
  let [a, m] = de.slice(0, 7).split("-").map(Number);
  const fim = ate.slice(0, 7);
  for (let i = 0; i < 600; i++) {
    const atual = `${a}-${String(m).padStart(2, "0")}`;
    if (atual > fim) break;
    out.push(atual);
    m += 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
  }
  return out;
}
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ metas por dia */

const cachePesos = new Map<string, number>();
function somaPesosDoMes(mes: string, pesos: ConfigRede["pesosDiaSemana"]): number {
  const chave = `${mes}|${JSON.stringify(pesos)}`;
  const guardado = cachePesos.get(chave);
  if (guardado != null) return guardado;
  const soma = listarDias(primeiroDiaDoMes(mes), ultimoDiaDoMes(mes)).reduce(
    (a, d) => a + pesos[diaDaSemana(d)],
    0,
  );
  if (cachePesos.size > 500) cachePesos.clear();
  cachePesos.set(chave, soma);
  return soma;
}

/** Meta do dia = meta do mês × peso do dia da semana ÷ soma dos pesos do mês (regra do HTML). */
export function metaDoDia(metaMes: number, data: string, pesos: ConfigRede["pesosDiaSemana"]): number {
  const soma = somaPesosDoMes(mesDe(data), pesos);
  return soma > 0 ? (metaMes * pesos[diaDaSemana(data)]) / soma : 0;
}

/** Soma das metas diárias de `de` a `ate`, usando a meta de cada mês. */
export function metaNoPeriodo(
  metasPorMes: ReadonlyMap<string, number>,
  de: string,
  ate: string,
  pesos: ConfigRede["pesosDiaSemana"],
): number {
  let total = 0;
  for (const d of listarDias(de, ate)) {
    const m = metasPorMes.get(mesDe(d));
    if (m != null) total += metaDoDia(m, d, pesos);
  }
  return arredondar(total);
}

/** Tira o ruído de ponto flutuante de somas (1 000 000,0000000001 → 1 000 000). */
const arredondar = (v: number): number => Math.round(v * 1e6) / 1e6;
const EPS = 1e-9;

/* ------------------------------------------------------------------ totais */

export type Totais = {
  salao: number;
  delivery: number;
  fat: number;
  pedidosSalao: number;
  pedidosDelivery: number;
  pedidos: number;
  ticket: number | null;
  ticketSalao: number | null;
  ticketDelivery: number | null;
  pctDelivery: number | null;
  diasComVenda: number;
};

export function totaisDeVendas(linhas: readonly VendaDia[]): Totais {
  let salao = 0;
  let delivery = 0;
  let ps = 0;
  let pd = 0;
  const dias = new Set<string>();
  for (const v of linhas) {
    salao += v.salao;
    delivery += v.delivery;
    ps += v.pedidosSalao;
    pd += v.pedidosDelivery;
    if (v.salao + v.delivery > 0 || v.pedidosSalao + v.pedidosDelivery > 0) dias.add(v.data);
  }
  const fat = salao + delivery;
  const pedidos = ps + pd;
  return {
    salao,
    delivery,
    fat,
    pedidosSalao: ps,
    pedidosDelivery: pd,
    pedidos,
    ticket: pedidos > 0 ? fat / pedidos : null,
    ticketSalao: ps > 0 ? salao / ps : null,
    ticketDelivery: pd > 0 ? delivery / pd : null,
    pctDelivery: fat > 0 ? (delivery / fat) * 100 : null,
    diasComVenda: dias.size,
  };
}

/* ------------------------------------------------------------------ semáforo e metas */

/**
 * Verde: dentro da meta. Amarelo: desvio de até `tolPct`% da meta. Vermelho: acima disso.
 * Direção "min" = maior é melhor; "max" = menor é melhor. Sem meta ou sem valor: neutro.
 */
export function statusMeta(
  meta: number | null,
  direcao: Direcao | null,
  valor: number | null,
  tolPct = 10,
): Status {
  if (meta == null || direcao == null || valor == null || Number.isNaN(valor)) return "neu";
  const folga = Math.abs(meta) * EPS;
  const ok = direcao === "min" ? valor >= meta - folga : valor <= meta + folga;
  if (ok) return "ok";
  if (meta === 0) return "bad";
  const desvio = direcao === "min" ? (meta - valor) / meta : (valor - meta) / meta;
  // EPS: exatamente no limite (ex.: 23,1 contra 21 = 10%) continua "atenção" apesar do ponto flutuante.
  return desvio <= tolPct / 100 + EPS ? "warn" : "bad";
}

export type MetaResolvida = {
  meta: number | null;
  direcao: Direcao | null;
  origem: "loja" | "rede" | null;
};

/** Meta vigente na data: a da loja, se houver; senão a padrão da rede. */
export function resolverMeta(
  metas: readonly MetaRow[],
  lojaId: string | null,
  indicador: IndicadorKey,
  data: string,
): MetaResolvida {
  const vigente = (m: MetaRow) =>
    m.indicador === indicador && m.validoDe <= data && (m.validoAte == null || m.validoAte >= data);
  const daLoja = lojaId ? metas.find((m) => m.lojaId === lojaId && vigente(m)) : undefined;
  if (daLoja) return { meta: daLoja.meta, direcao: daLoja.direcao, origem: "loja" };
  const daRede = metas.find((m) => m.lojaId === null && vigente(m));
  if (daRede) return { meta: daRede.meta, direcao: daRede.direcao, origem: "rede" };
  return { meta: null, direcao: null, origem: null };
}

/* ------------------------------------------------------------------ formatação */

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const brl = (v: number): string => `R$ ${nf0.format(Math.round(v))}`;
export const brl2 = (v: number): string => `R$ ${nf2.format(v)}`;
export const brlCompacto = (v: number): string =>
  Math.abs(v) >= 1e6
    ? `R$ ${nf1.format(v / 1e6).replace(",0", "")} mi`
    : `R$ ${nf0.format(Math.round(v / 1000))} mil`;
export const pct1 = (v: number): string => `${nf1.format(v)}%`;
export const inteiro = (v: number): string => nf0.format(v);

export function formatarValor(formato: FormatoValor, v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  switch (formato) {
    case "brl":
      return brlCompacto(v);
    case "pct0":
      return `${nf0.format(v)}%`;
    case "pct1":
      return `${nf1.format(v)}%`;
    case "pctS":
      return `${v > 0 ? "+" : ""}${nf1.format(v)}%`;
    case "min":
      return `${nf1.format(v)} min`;
    case "nota":
      return nf1.format(v);
    case "int":
      return nf0.format(v);
  }
}

export function textoMeta(formato: FormatoValor, meta: number | null, direcao: Direcao | null): string {
  if (meta == null || direcao == null) return "acompanhamento";
  const valor =
    formato === "brl" ? brlCompacto(meta) : formato === "pctS" ? `+${nf1.format(meta).replace(",0", "")}%` : formatarValor(formato, meta).replace(",0", "");
  return direcao === "min" ? `pelo menos ${valor}` : `até ${valor}`;
}

/* ------------------------------------------------------------------ mês de referência */

export type CorteDoMes = {
  mes: string;
  /** Último dia com dados considerado (null = mês futuro ou sem nenhum lançamento no mês corrente). */
  dataCorte: string | null;
  /** Mês ainda em andamento (comparações são "até a data de corte"). */
  parcial: boolean;
  /** Fração das metas do mês que já "venceu" até o corte (soma dos pesos), de 0 a 1. */
  fracao: number;
};

/**
 * Mês fechado (já passou): corte = último dia, fração 1.
 * Mês corrente: corte = último dia com venda lançada (até ontem), fração = pesos até o corte.
 * Mês futuro: sem corte.
 */
export function cortarMes(
  mes: string,
  hoje: string,
  datasComVenda: Iterable<string>,
  pesos: ConfigRede["pesosDiaSemana"],
): CorteDoMes {
  const fim = ultimoDiaDoMes(mes);
  const ini = primeiroDiaDoMes(mes);
  if (hoje > fim) return { mes, dataCorte: fim, parcial: false, fracao: 1 };
  if (hoje < ini) return { mes, dataCorte: null, parcial: true, fracao: 0 };
  const ontem = somarDias(hoje, -1);
  let ultima: string | null = null;
  for (const d of datasComVenda) {
    if (mesDe(d) === mes && d <= ontem && (ultima == null || d > ultima)) ultima = d;
  }
  if (ultima == null) return { mes, dataCorte: null, parcial: true, fracao: 0 };
  const soma = somaPesosDoMes(mes, pesos);
  const ate = listarDias(ini, ultima).reduce((a, d) => a + pesos[diaDaSemana(d)], 0);
  return { mes, dataCorte: ultima, parcial: ultima < fim, fracao: soma > 0 ? ate / soma : 0 };
}

/* ------------------------------------------------------------------ avaliação por loja */

export type AvaliacaoIndicador = {
  k: IndicadorKey;
  valor: number | null;
  meta: number | null;
  /** Meta efetivamente usada (a de faturamento é proporcional ao corte do mês). */
  metaEfetiva: number | null;
  direcao: Direcao | null;
  status: Status;
  origemMeta: "loja" | "rede" | null;
  origemValor: "calculado" | "manual" | "exemplo" | null;
};

export type ResumoLojaMes = {
  lojaId: string;
  totais: Totais;
  metaMes: number | null;
  /** Meta de faturamento até o corte (ritmo esperado). */
  metaAteCorte: number | null;
  pctMeta: number | null;
  diasEsperados: number;
  diasSemLancamento: number;
};

export function resumirLojaNoMes(args: {
  lojaId: string;
  vendasDoMes: readonly VendaDia[];
  metaMes: number | null;
  corte: CorteDoMes;
  pesos: ConfigRede["pesosDiaSemana"];
}): ResumoLojaMes {
  const { lojaId, vendasDoMes, metaMes, corte, pesos } = args;
  const totais = totaisDeVendas(vendasDoMes);
  const diasEsperados = corte.dataCorte ? listarDias(primeiroDiaDoMes(corte.mes), corte.dataCorte).length : 0;
  let metaAteCorte: number | null = null;
  if (metaMes != null && corte.dataCorte) {
    metaAteCorte =
      corte.dataCorte === ultimoDiaDoMes(corte.mes)
        ? metaMes
        : metaNoPeriodo(new Map([[corte.mes, metaMes]]), primeiroDiaDoMes(corte.mes), corte.dataCorte, pesos);
  }
  const pctMeta = metaAteCorte != null && metaAteCorte > 0 && totais.diasComVenda > 0 ? (totais.fat / metaAteCorte) * 100 : null;
  return {
    lojaId,
    totais,
    metaMes,
    metaAteCorte,
    pctMeta,
    diasEsperados,
    diasSemLancamento: Math.max(0, diasEsperados - totais.diasComVenda),
  };
}

export function avaliarLoja(args: {
  lojaId: string;
  resumo: ResumoLojaMes;
  indicadoresDoMes: readonly IndicadorMes[];
  metas: readonly MetaRow[];
  dataRef: string;
  fracao: number;
  tolPct: number;
}): AvaliacaoIndicador[] {
  const { lojaId, resumo, indicadoresDoMes, metas, dataRef, fracao, tolPct } = args;
  const manual = new Map(indicadoresDoMes.filter((i) => i.lojaId === lojaId).map((i) => [i.indicador, i] as const));
  return INDICADORES.map((def) => {
    const m = resolverMeta(metas, lojaId, def.k, dataRef);
    let valor: number | null = null;
    let origemValor: AvaliacaoIndicador["origemValor"] = null;
    if (def.k === "fat") {
      if (resumo.totais.diasComVenda > 0) {
        valor = resumo.totais.fat;
        origemValor = "calculado";
      }
    } else if (def.k === "pctMeta") {
      valor = resumo.pctMeta;
      if (valor != null) origemValor = "calculado";
    } else {
      // Valor calculado por módulo próprio terá prioridade (rodadas seguintes); por ora, o lançado.
      const lanc = manual.get(def.k);
      if (lanc) {
        valor = lanc.valor;
        origemValor = lanc.origem;
      }
    }
    const metaEfetiva = def.k === "fat" && m.meta != null ? m.meta * fracao : m.meta;
    return {
      k: def.k,
      valor,
      meta: m.meta,
      metaEfetiva,
      direcao: m.direcao,
      status: statusMeta(metaEfetiva, m.direcao, valor, tolPct),
      origemMeta: m.origem,
      origemValor,
    };
  });
}

/* ------------------------------------------------------------------ ranking e alertas */

export type LinhaRanking = {
  lojaId: string;
  nome: string;
  pos: number;
  ok: number;
  /** Indicadores com meta definida E valor lançado. */
  avaliados: number;
  /** Indicadores com meta definida. */
  comMeta: number;
  pctMeta: number | null;
  tag: "TOP" | "FLOP";
};

/**
 * Ordem do HTML: mais indicadores dentro da meta primeiro; desempate pelo % da meta de vendas.
 * TOP = metade de cima (arredondada para cima); FLOP = o resto.
 */
export function rankear(
  itens: readonly { loja: Pick<Loja, "id" | "nome">; avaliacoes: readonly AvaliacaoIndicador[]; pctMeta: number | null }[],
): LinhaRanking[] {
  const linhas = itens.map((it) => {
    const comMeta = it.avaliacoes.filter((a) => a.meta != null && a.direcao != null);
    return {
      lojaId: it.loja.id,
      nome: it.loja.nome,
      ok: comMeta.filter((a) => a.status === "ok").length,
      avaliados: comMeta.filter((a) => a.valor != null).length,
      comMeta: comMeta.length,
      pctMeta: it.pctMeta,
    };
  });
  linhas.sort(
    (a, b) =>
      b.ok - a.ok ||
      (b.pctMeta ?? Number.NEGATIVE_INFINITY) - (a.pctMeta ?? Number.NEGATIVE_INFINITY) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
  const topo = Math.ceil(linhas.length / 2);
  return linhas.map((l, i) => ({ ...l, pos: i + 1, tag: i < topo ? "TOP" : "FLOP" }));
}

export type Alerta = {
  lojaId: string;
  lojaNome: string;
  indicador: IndicadorKey;
  nome: string;
  status: "warn" | "bad";
  valor: number | null;
  metaEfetiva: number | null;
  direcao: Direcao | null;
};

export function gerarAlertas(
  itens: readonly { loja: Pick<Loja, "id" | "nome">; avaliacoes: readonly AvaliacaoIndicador[] }[],
): Alerta[] {
  const out: Alerta[] = [];
  for (const it of itens) {
    for (const a of it.avaliacoes) {
      if (a.status !== "warn" && a.status !== "bad") continue;
      out.push({
        lojaId: it.loja.id,
        lojaNome: it.loja.nome,
        indicador: a.k,
        nome: INDICADORES.find((d) => d.k === a.k)?.nome ?? a.k,
        status: a.status,
        valor: a.valor,
        metaEfetiva: a.metaEfetiva,
        direcao: a.direcao,
      });
    }
  }
  return out.sort((a, b) => (a.status === "bad" ? 0 : 1) - (b.status === "bad" ? 0 : 1));
}

/* ------------------------------------------------------------------ série diária */

export type PontoDia = {
  data: string;
  salao: number;
  delivery: number;
  metaDia: number;
  /** Acumulado realizado (null depois de `hoje`). */
  acumReal: number | null;
  acumMeta: number;
};

export function serieDiaria(args: {
  de: string;
  ate: string;
  hoje: string;
  vendas: readonly VendaDia[];
  metasPorMes: ReadonlyMap<string, number>;
  pesos: ConfigRede["pesosDiaSemana"];
}): PontoDia[] {
  const { de, ate, hoje, vendas, metasPorMes, pesos } = args;
  const porDia = new Map<string, { s: number; d: number }>();
  for (const v of vendas) {
    const x = porDia.get(v.data) ?? { s: 0, d: 0 };
    x.s += v.salao;
    x.d += v.delivery;
    porDia.set(v.data, x);
  }
  let acumReal = 0;
  let acumMeta = 0;
  return listarDias(de, ate).map((data) => {
    const x = porDia.get(data) ?? { s: 0, d: 0 };
    const m = metasPorMes.get(mesDe(data));
    const metaDia = m != null ? metaDoDia(m, data, pesos) : 0;
    acumReal += x.s + x.d;
    acumMeta += metaDia;
    return { data, salao: x.s, delivery: x.d, metaDia, acumReal: data <= hoje ? acumReal : null, acumMeta };
  });
}

/* ------------------------------------------------------------------ painel da rede */

export type LojaNoPainel = {
  loja: Loja;
  periodo: Totais;
  mes: ResumoLojaMes;
  avaliacoes: AvaliacaoIndicador[];
  ok: number;
  avaliados: number;
  comMeta: number;
};

export type PainelRede = {
  de: string;
  ate: string;
  mesRef: string;
  corte: CorteDoMes;
  kpis: {
    fat: number;
    meta: number | null;
    pctMeta: number | null;
    pedidos: number;
    ticket: number | null;
    pctDelivery: number | null;
    salao: number;
    delivery: number;
    lojasOperando: number;
    lojasAcimaPiso: number;
    lojasAbaixoMeta: number;
    indicadoresForaMeta: number;
    indicadoresCriticos: number;
  };
  porLoja: LojaNoPainel[];
  ranking: LinhaRanking[];
  alertas: Alerta[];
  serie: PontoDia[];
  lojasSemLancamento: { lojaId: string; nome: string; dias: number }[];
};

export type EntradaPainel = {
  lojas: readonly Loja[];
  config: ConfigRede;
  metas: readonly MetaRow[];
  metasFat: readonly MetaFaturamento[];
  indicadores: readonly IndicadorMes[];
  /** Vendas cobrindo o período E o mês de referência. */
  vendas: readonly VendaDia[];
  de: string;
  ate: string;
  mesRef: string;
  hoje: string;
  /** Restringe KPIs, série e canais a uma loja (o ranking continua da rede toda). */
  lojaFiltroId?: string | null;
};

export function calcularPainelRede(e: EntradaPainel): PainelRede {
  const { config, metas, metasFat, indicadores, de, ate, mesRef, hoje } = e;
  const operando = e.lojas.filter((l) => l.status === "operando");
  const pesos = config.pesosDiaSemana;

  const corte = cortarMes(mesRef, hoje, e.vendas.map((v) => v.data), pesos);
  const dataRef = corte.dataCorte ?? primeiroDiaDoMes(mesRef);
  const metaMesDe = (lojaId: string): number | null =>
    metasFat.find((m) => m.lojaId === lojaId && m.mes === primeiroDiaDoMes(mesRef))?.valor ?? null;

  const porLoja: LojaNoPainel[] = operando.map((loja) => {
    const doMes = e.vendas.filter((v) => v.lojaId === loja.id && mesDe(v.data) === mesRef);
    const noPeriodo = e.vendas.filter((v) => v.lojaId === loja.id && v.data >= de && v.data <= ate);
    const resumo = resumirLojaNoMes({ lojaId: loja.id, vendasDoMes: doMes, metaMes: metaMesDe(loja.id), corte, pesos });
    const avaliacoes = avaliarLoja({
      lojaId: loja.id,
      resumo,
      indicadoresDoMes: indicadores.filter((i) => i.mes === primeiroDiaDoMes(mesRef)),
      metas,
      dataRef,
      fracao: corte.fracao,
      tolPct: config.toleranciaSemaforoPct,
    });
    const comMeta = avaliacoes.filter((a) => a.meta != null && a.direcao != null);
    return {
      loja,
      periodo: totaisDeVendas(noPeriodo),
      mes: resumo,
      avaliacoes,
      ok: comMeta.filter((a) => a.status === "ok").length,
      avaliados: comMeta.filter((a) => a.valor != null).length,
      comMeta: comMeta.length,
    };
  });

  const foco = e.lojaFiltroId ? porLoja.filter((p) => p.loja.id === e.lojaFiltroId) : porLoja;
  const idsFoco = new Set(foco.map((p) => p.loja.id));
  const vendasFoco = e.vendas.filter((v) => idsFoco.has(v.lojaId) && v.data >= de && v.data <= ate);
  const tot = totaisDeVendas(vendasFoco);

  // Meta do período = soma das metas diárias de cada loja no foco.
  let meta: number | null = null;
  for (const p of foco) {
    const mapa = new Map<string, number>();
    for (const mes of listarMeses(de, ate)) {
      const m = metasFat.find((x) => x.lojaId === p.loja.id && x.mes === primeiroDiaDoMes(mes));
      if (m) mapa.set(mes, m.valor);
    }
    if (mapa.size > 0) meta = (meta ?? 0) + metaNoPeriodo(mapa, de, ate, pesos);
  }
  // Ritmo: no mês corrente, compara só até o último dia lançado.
  const atingimentoBase = meta;
  const pctMeta = atingimentoBase != null && atingimentoBase > 0 ? (tot.fat / atingimentoBase) * 100 : null;

  const ranking = rankear(porLoja.map((p) => ({ loja: p.loja, avaliacoes: p.avaliacoes, pctMeta: p.mes.pctMeta })));
  const alertas = gerarAlertas(porLoja.map((p) => ({ loja: p.loja, avaliacoes: p.avaliacoes })));
  const operacionais = alertas.filter((a) => a.indicador !== "fat" && a.indicador !== "pctMeta");

  const metasPorMesFoco = new Map<string, number>();
  for (const mes of listarMeses(de, ate)) {
    const soma = foco.reduce((a, p) => {
      const m = metasFat.find((x) => x.lojaId === p.loja.id && x.mes === primeiroDiaDoMes(mes));
      return a + (m ? m.valor : 0);
    }, 0);
    if (soma > 0) metasPorMesFoco.set(mes, soma);
  }

  return {
    de,
    ate,
    mesRef,
    corte,
    kpis: {
      fat: tot.fat,
      meta,
      pctMeta,
      pedidos: tot.pedidos,
      ticket: tot.ticket,
      pctDelivery: tot.pctDelivery,
      salao: tot.salao,
      delivery: tot.delivery,
      lojasOperando: porLoja.length,
      lojasAcimaPiso: porLoja.filter((p) => p.mes.totais.fat >= config.pisoLoja * (corte.parcial ? corte.fracao : 1) && p.mes.totais.diasComVenda > 0).length,
      lojasAbaixoMeta: porLoja.filter((p) => p.mes.pctMeta != null && p.mes.pctMeta < 100).length,
      indicadoresForaMeta: operacionais.length,
      indicadoresCriticos: operacionais.filter((a) => a.status === "bad").length,
    },
    porLoja,
    ranking,
    alertas,
    serie: serieDiaria({ de, ate, hoje, vendas: vendasFoco, metasPorMes: metasPorMesFoco, pesos }),
    lojasSemLancamento: porLoja
      .filter((p) => p.mes.diasSemLancamento > 0)
      .map((p) => ({ lojaId: p.loja.id, nome: p.loja.nome, dias: p.mes.diasSemLancamento })),
  };
}

/* ------------------------------------------------------------------ vendas por hora */

export type PontoHora = { hora: number; salao: number; delivery: number; total: number };

/** Soma as vendas por hora e divide pelo nº de dias com venda (média por dia), como no HTML. */
export function mediaPorHora(
  linhas: readonly { hora: number; salao: number; delivery: number }[],
  diasComVenda: number,
): { pontos: PontoHora[]; pico: PontoHora | null } {
  const porHora = new Map<number, { s: number; d: number }>();
  for (const l of linhas) {
    const x = porHora.get(l.hora) ?? { s: 0, d: 0 };
    x.s += l.salao;
    x.d += l.delivery;
    porHora.set(l.hora, x);
  }
  const div = diasComVenda > 0 ? diasComVenda : 1;
  const pontos = [...porHora.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hora, x]) => ({ hora, salao: x.s / div, delivery: x.d / div, total: (x.s + x.d) / div }));
  const pico = pontos.length ? pontos.reduce((m, p) => (p.total > m.total ? p : m)) : null;
  return { pontos, pico };
}
