/**
 * Rede de lojas — CMV, DRE e orçamento/expansão (cálculos puros, sem banco e sem React).
 *
 * As fórmulas são as do painel original (HTML Fat Buddha): `dreCalc`, `orcDre`, `cmvReal`,
 * curva de maturação e consolidação da rede. Roda em Node puro (testes) e no servidor.
 */
import { diaDaSemana, listarDias, mesDe, primeiroDiaDoMes, resolverMeta, somarDias, statusMeta } from "./calculo.ts";
import type {
  BaseDelivery,
  Cenario,
  CmvSemana,
  IndicadorMes,
  LancamentoDre,
  LinhaDreKey,
  Loja,
  MetaFaturamento,
  MetaRow,
  PremissasDre,
  PremissasDreRow,
  Status,
  UnidadeExpansao,
  VendaDia,
} from "./tipos.ts";

const EPS = 1e-9;

/* ================================================================== CMV */

/** Regra documentada de sinais (aparece na tela de CMV). */
export const REGRA_CMV =
  "CMV em reais = estoque inicial + compras + transferências de entrada − transferências de saída − devoluções a fornecedor − estoque final. " +
  "Entradas somam; saídas e devoluções subtraem. Qualquer outro movimento (ajuste de inventário, quebra) deve ser classificado em um desses campos ou anotado nas observações.";

export type MovimentosCmv = Pick<
  CmvSemana,
  "estoqueInicial" | "compras" | "transferenciasEntrada" | "transferenciasSaida" | "devolucoes" | "estoqueFinal"
>;

export function cmvReais(c: MovimentosCmv): number {
  return c.estoqueInicial + c.compras + c.transferenciasEntrada - c.transferenciasSaida - c.devolucoes - c.estoqueFinal;
}

/** CMV percentual = CMV em reais / vendas × 100. Sem vendas na base, não há percentual. */
export const cmvPercentual = (reais: number, vendas: number | null): number | null => (vendas != null && vendas > 0 ? (reais / vendas) * 100 : null);

/** Dispersão = CMV real % − CMV teórico % (em pontos percentuais). */
export const dispersaoPP = (real: number, teorico: number): number => real - teorico;

/** Dispersão: até a tolerância = ok; até o dobro = atenção; acima = crítico (mesma régua do painel original). */
export function statusDispersao(d: number | null, tol: number): Status {
  if (d == null || Number.isNaN(d)) return "neu";
  if (d <= tol + EPS) return "ok";
  if (d <= tol * 2 + EPS) return "warn";
  return "bad";
}

/** Segunda-feira da semana de uma data ISO (a semana de contagem começa na segunda). */
export function segundaDaSemana(iso: string): string {
  const ordem: Record<string, number> = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, dom: 6 };
  return somarDias(iso, -ordem[diaDaSemana(iso)]);
}

export const ehSegunda = (iso: string): boolean => diaDaSemana(iso) === "seg";

/** Vendas lançadas no módulo Vendas, somadas por loja e semana (chave `lojaId|segunda`). */
export function vendasPorSemana(vendas: readonly VendaDia[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const v of vendas) {
    const k = `${v.lojaId}|${segundaDaSemana(v.data)}`;
    mapa.set(k, (mapa.get(k) ?? 0) + v.salao + v.delivery);
  }
  return mapa;
}

/** Desvio do consumo de um item: (real − teórico) ÷ teórico × 100. Teórico zerado não tem desvio. */
export const desvioItemPct = (teorico: number, real: number): number | null => (teorico > 0 ? ((real - teorico) / teorico) * 100 : null);

/** Régua do painel original para itens: até +2% ok; até +5% atenção; acima crítico (consumo abaixo do teórico é ok). */
export function statusItem(desvio: number | null): Status {
  if (desvio == null || Number.isNaN(desvio)) return "neu";
  if (desvio <= 2 + EPS) return "ok";
  if (desvio <= 5 + EPS) return "warn";
  return "bad";
}

export type ContagemCalculada = {
  contagem: CmvSemana;
  /** Base de vendas usada: a informada na contagem ou, se vazia, a soma do módulo Vendas. */
  vendas: number | null;
  vendasOrigem: "informada" | "modulo_vendas" | null;
  reais: number;
  pct: number | null;
  teorico: number;
  dispersao: number | null;
};

export function calcularContagem(c: CmvSemana, vendasDoModulo: number | null | undefined): ContagemCalculada {
  let vendas: number | null = null;
  let vendasOrigem: ContagemCalculada["vendasOrigem"] = null;
  if (c.vendas != null && c.vendas > 0) {
    vendas = c.vendas;
    vendasOrigem = "informada";
  } else if (vendasDoModulo != null && vendasDoModulo > 0) {
    vendas = vendasDoModulo;
    vendasOrigem = "modulo_vendas";
  }
  const reais = cmvReais(c);
  const pct = cmvPercentual(reais, vendas);
  return { contagem: c, vendas, vendasOrigem, reais, pct, teorico: c.cmvTeorico, dispersao: pct == null ? null : dispersaoPP(pct, c.cmvTeorico) };
}

export function calcularContagens(cs: readonly CmvSemana[], mapaVendas: ReadonlyMap<string, number>): ContagemCalculada[] {
  return cs.map((c) => calcularContagem(c, mapaVendas.get(`${c.lojaId}|${c.semana}`)));
}

export type ResumoSemanaCmv = {
  semana: string;
  contadas: number;
  vendas: number;
  /** CMV real da rede em R$ (Σ CMV real das lojas contadas). */
  reais: number;
  /** CMV teórico da rede em R$ (Σ vendas × teórico). */
  teoricoReais: number;
  pctReal: number | null;
  pctTeorico: number | null;
  dispersao: number | null;
  /** Perda estimada = CMV real − CMV teórico, em R$. */
  perda: number;
  acimaMeta: number;
  foraTolerancia: number;
};

/** KPIs da semana (lojas com contagem calculável). Meta nula = ninguém conta como "acima". */
export function resumirSemana(calc: readonly ContagemCalculada[], semana: string, metaCmv: number | null, tol: number): ResumoSemanaCmv {
  const lw = calc.filter((c) => c.contagem.semana === semana && c.vendas != null && c.pct != null);
  const vendas = lw.reduce((a, c) => a + (c.vendas ?? 0), 0);
  const reais = lw.reduce((a, c) => a + c.reais, 0);
  const teoricoReais = lw.reduce((a, c) => a + ((c.vendas ?? 0) * c.teorico) / 100, 0);
  return {
    semana,
    contadas: lw.length,
    vendas,
    reais,
    teoricoReais,
    pctReal: vendas > 0 ? (reais / vendas) * 100 : null,
    pctTeorico: vendas > 0 ? (teoricoReais / vendas) * 100 : null,
    dispersao: vendas > 0 ? ((reais - teoricoReais) / vendas) * 100 : null,
    perda: reais - teoricoReais,
    acimaMeta: metaCmv == null ? 0 : lw.filter((c) => (c.pct ?? 0) > metaCmv + EPS).length,
    foraTolerancia: lw.filter((c) => (c.dispersao ?? 0) > tol + EPS).length,
  };
}

export type AlertaCmv = { lojaId: string; tipo: "acima_meta" | "dispersao" | "sem_contagem"; status: "warn" | "bad"; texto: string };

const fmt1 = (v: number): string => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Alertas da semana: CMV acima da meta, dispersão fora da tolerância e lojas sem contagem. */
export function alertasCmv(args: {
  calc: readonly ContagemCalculada[];
  semana: string | null;
  lojas: readonly Pick<Loja, "id" | "nome">[];
  metas: readonly MetaRow[];
  tolPct: number;
  tolDispersao: number;
}): AlertaCmv[] {
  const { calc, semana, lojas, metas, tolPct, tolDispersao } = args;
  if (!semana) return [];
  const out: AlertaCmv[] = [];
  for (const loja of lojas) {
    const c = calc.find((x) => x.contagem.lojaId === loja.id && x.contagem.semana === semana);
    if (!c) {
      out.push({ lojaId: loja.id, tipo: "sem_contagem", status: "warn", texto: `${loja.nome}: sem contagem na semana de ${ddmm(semana)}.` });
      continue;
    }
    if (c.pct == null) {
      out.push({ lojaId: loja.id, tipo: "sem_contagem", status: "warn", texto: `${loja.nome}: contagem sem vendas na semana de ${ddmm(semana)} (informe as vendas ou lance no módulo Vendas).` });
      continue;
    }
    const m = resolverMeta(metas, loja.id, "cmv", semana);
    const sm = statusMeta(m.meta, m.direcao, c.pct, tolPct);
    if (sm === "warn" || sm === "bad") {
      out.push({ lojaId: loja.id, tipo: "acima_meta", status: sm, texto: `${loja.nome}: CMV de ${fmt1(c.pct)}% (meta ${m.meta != null ? fmt1(m.meta) : "—"}%).` });
    }
    const sd = statusDispersao(c.dispersao, tolDispersao);
    if (sd === "warn" || sd === "bad") {
      out.push({ lojaId: loja.id, tipo: "dispersao", status: sd, texto: `${loja.nome}: dispersão de +${fmt1(c.dispersao ?? 0)} p.p. sobre o teórico (tolerância ${fmt1(tolDispersao)} p.p.).` });
    }
  }
  return out;
}

export type CmvDoMes = { lojaId: string; mes: string; pct: number; reais: number; vendas: number; semanas: number };

/**
 * CMV % do mês de cada loja = Σ CMV real (R$) ÷ Σ vendas, das contagens cuja semana COMEÇA no mês.
 * Contagens sem base de vendas não entram.
 */
export function cmvDoMes(calc: readonly ContagemCalculada[]): CmvDoMes[] {
  const acc = new Map<string, CmvDoMes>();
  for (const c of calc) {
    if (c.vendas == null || c.pct == null) continue;
    const mes = mesDe(c.contagem.semana);
    const k = `${c.contagem.lojaId}|${mes}`;
    const x = acc.get(k) ?? { lojaId: c.contagem.lojaId, mes, pct: 0, reais: 0, vendas: 0, semanas: 0 };
    x.reais += c.reais;
    x.vendas += c.vendas;
    x.semanas += 1;
    acc.set(k, x);
  }
  return [...acc.values()].map((x) => ({ ...x, pct: x.vendas > 0 ? (x.reais / x.vendas) * 100 : 0 }));
}

/** CMV do mês como indicador calculado (alimenta a visão geral, o semáforo e o DRE). */
export function indicadoresCmv(calc: readonly ContagemCalculada[]): IndicadorMes[] {
  return cmvDoMes(calc).map((x) => ({ lojaId: x.lojaId, mes: primeiroDiaDoMes(x.mes), indicador: "cmv", valor: x.pct, origem: "calculado" }));
}

/** O valor calculado por um módulo de origem tem prioridade sobre o lançado à mão. */
export function mesclarIndicadores(manuais: readonly IndicadorMes[], calculados: readonly IndicadorMes[]): IndicadorMes[] {
  const chave = (i: IndicadorMes) => `${i.lojaId}|${i.mes}|${i.indicador}`;
  const calc = new Set(calculados.map(chave));
  return [...manuais.filter((m) => !calc.has(chave(m))), ...calculados];
}

/* ================================================================== DRE */

export type EntradaDre = {
  fat: number;
  fatDel: number;
  /** % sobre o faturamento */
  impostos: number;
  cmv: number;
  /** % sobre o faturamento (ignorado quando folhaR vem preenchido) */
  folha?: number;
  /** folha em R$ (tem prioridade sobre o percentual) */
  folhaR?: number | null;
  /** % de custos de delivery */
  delivery: number;
  deliveryBase: BaseDelivery;
  manutencao: number;
  marketing: number;
  cto: number;
  agua: number;
  energia: number;
};

export type LinhasDre = { fat: number; fatDel: number; imp: number; cmv: number; folha: number; cdel: number; man: number; mkt: number; cto: number; agua: number; energia: number };

export type DreCalc = {
  fat: number;
  sal: number;
  del: number;
  imp: number;
  rl: number;
  cmv: number;
  folha: number;
  cdel: number;
  man: number;
  mkt: number;
  cto: number;
  agua: number;
  energia: number;
  res: number;
  /** Margem operacional em % do faturamento. */
  mg: number;
  /** Ponto de equilíbrio (faturamento em que o resultado é zero); null quando os custos variáveis passam de 100%. */
  pe: number | null;
  varPct: number;
};

/** Monta o DRE a partir das linhas já em R$ (mesma aritmética e mesma ordem do painel original). */
export function montarDre(l: LinhasDre): DreCalc {
  const fat = l.fat;
  const del = l.fatDel;
  const sal = fat - del;
  const fixos = l.cto + l.agua + l.energia;
  const res = fat - l.imp - l.cmv - l.folha - l.cdel - l.man - l.mkt - fixos;
  const varPct = fat > 0 ? (l.imp + l.cmv + l.cdel + l.man + l.mkt) / fat : 0;
  const pe = 1 - varPct > 0 ? (l.folha + fixos) / (1 - varPct) : null;
  return {
    fat,
    sal,
    del,
    imp: l.imp,
    rl: fat - l.imp,
    cmv: l.cmv,
    folha: l.folha,
    cdel: l.cdel,
    man: l.man,
    mkt: l.mkt,
    cto: l.cto,
    agua: l.agua,
    energia: l.energia,
    res,
    mg: fat > 0 ? (res / fat) * 100 : 0,
    pe,
    varPct,
  };
}

/** Calcula um DRE mensal (`dreCalc` do painel original). CMV, folha e demais % são sobre o faturamento bruto. */
export function dreCalc(o: EntradaDre): DreCalc {
  const fat = o.fat;
  const del = o.fatDel;
  const imp = (fat * o.impostos) / 100;
  const cmv = (fat * o.cmv) / 100;
  const folha = o.folhaR != null ? o.folhaR : (fat * (o.folha ?? 0)) / 100;
  const baseDel = o.deliveryBase === "total" ? fat : del;
  const cdel = (baseDel * o.delivery) / 100;
  const man = (fat * o.manutencao) / 100;
  const mkt = (fat * o.marketing) / 100;
  return montarDre({ fat, fatDel: del, imp, cmv, folha, cdel, man, mkt, cto: o.cto, agua: o.agua, energia: o.energia });
}

export type LinhaDre = keyof Pick<DreCalc, "fat" | "sal" | "del" | "imp" | "rl" | "cmv" | "folha" | "cdel" | "man" | "mkt" | "cto" | "agua" | "energia" | "res">;

/** Linhas do DRE na ordem do painel original. tipo: tot = total, sub = subitem, neg = custo, res = resultado. */
export const DRE_LINHAS: readonly { k: LinhaDre; nome: string; tipo: "tot" | "sub" | "neg" | "res" }[] = [
  { k: "fat", nome: "Faturamento bruto", tipo: "tot" },
  { k: "sal", nome: "Salão", tipo: "sub" },
  { k: "del", nome: "Delivery", tipo: "sub" },
  { k: "imp", nome: "(-) Impostos", tipo: "neg" },
  { k: "rl", nome: "= Receita líquida", tipo: "tot" },
  { k: "cmv", nome: "(-) CMV", tipo: "neg" },
  { k: "folha", nome: "(-) Folha de pagamento", tipo: "neg" },
  { k: "cdel", nome: "(-) Custos de delivery", tipo: "neg" },
  { k: "man", nome: "(-) Manutenção", tipo: "neg" },
  { k: "mkt", nome: "(-) Marketing, royalties, escritório e fundo de propaganda", tipo: "neg" },
  { k: "cto", nome: "(-) CTO (custo total de ocupação)", tipo: "neg" },
  { k: "agua", nome: "(-) Água", tipo: "neg" },
  { k: "energia", nome: "(-) Energia", tipo: "neg" },
  { k: "res", nome: "= Resultado operacional", tipo: "res" },
];

/** Linha do DRE (chave interna) correspondente a cada linha lançável. */
export const CHAVE_DRE: Record<LinhaDreKey, LinhaDre> = {
  impostos: "imp",
  cmv: "cmv",
  folha: "folha",
  delivery: "cdel",
  manutencao: "man",
  marketing: "mkt",
  cto: "cto",
  agua: "agua",
  energia: "energia",
};

/** Consolida várias lojas: soma linha a linha; PE = custos fixos da rede ÷ (1 − variáveis da rede). */
export function consolidarDre(cols: readonly DreCalc[]): DreCalc {
  const soma = (k: LinhaDre) => cols.reduce((a, c) => a + c[k], 0);
  const fat = soma("fat");
  const imp = soma("imp");
  const cmv = soma("cmv");
  const cdel = soma("cdel");
  const man = soma("man");
  const mkt = soma("mkt");
  const fixRede = cols.reduce((a, c) => a + c.folha + c.cto + c.agua + c.energia, 0);
  const varPct = fat > 0 ? (imp + cmv + cdel + man + mkt) / fat : 0;
  const res = soma("res");
  return {
    fat,
    sal: soma("sal"),
    del: soma("del"),
    imp,
    rl: soma("rl"),
    cmv,
    folha: soma("folha"),
    cdel,
    man,
    mkt,
    cto: soma("cto"),
    agua: soma("agua"),
    energia: soma("energia"),
    res,
    mg: fat > 0 ? (res / fat) * 100 : 0,
    pe: 1 - varPct > 0 ? fixRede / (1 - varPct) : null,
    varPct,
  };
}

/* ---------------------------------------------------------------- premissas */

/** Premissas do modelo original (CMV 21%, pessoal 19%, impostos 10%, delivery 28%, manutenção 1,5%, marketing 7%, CTO 12.000, água 1.500, energia 4.500). */
export const PREMISSAS_DRE_PADRAO: PremissasDre = {
  cmv: 21,
  pessoal: 19,
  impostos: 10,
  custoDelivery: 28,
  baseDelivery: "delivery",
  manutencao: 1.5,
  marketing: 7,
  cto: 12000,
  agua: 1500,
  energia: 4500,
  mixDelivery: 100,
};

export const CAMPOS_PREMISSA: readonly (keyof PremissasDre)[] = ["cmv", "pessoal", "impostos", "custoDelivery", "baseDelivery", "manutencao", "marketing", "cto", "agua", "energia", "mixDelivery"];

/** Padrão da rede (linha sem loja; se faltar algum campo, vale o do modelo original). */
export function premissasPadrao(rows: readonly PremissasDreRow[]): PremissasDre {
  const base = rows.find((r) => r.lojaId == null);
  const out: PremissasDre = { ...PREMISSAS_DRE_PADRAO };
  if (base) aplicarCampos(out, base);
  return out;
}

function aplicarCampos(alvo: PremissasDre, de: Partial<PremissasDre>): void {
  for (const k of CAMPOS_PREMISSA) {
    const v = de[k];
    if (v != null) (alvo as Record<string, unknown>)[k] = v;
  }
}

/** Premissas da loja: padrão da rede + exceções cadastradas para a loja. */
export function premissasDaLoja(rows: readonly PremissasDreRow[], lojaId: string): PremissasDre {
  const out = premissasPadrao(rows);
  const excecao = rows.find((r) => r.lojaId === lojaId);
  if (excecao) aplicarCampos(out, excecao);
  return out;
}

/** Campos em que a loja difere do padrão da rede (para mostrar "Exceções por loja"). */
export function excecoesDaLoja(rows: readonly PremissasDreRow[], lojaId: string): (keyof PremissasDre)[] {
  const excecao = rows.find((r) => r.lojaId === lojaId);
  if (!excecao) return [];
  const padrao = premissasPadrao(rows);
  return CAMPOS_PREMISSA.filter((k) => excecao[k] != null && excecao[k] !== padrao[k]);
}

/* ---------------------------------------------------------------- realizado e orçado */

/**
 * De onde veio cada linha do realizado:
 * - lancado: valor real lançado em R$ no mês;
 * - contagens: CMV % medido nas contagens semanais do mês;
 * - indicador: % do mês lançado em Metas e indicadores;
 * - premissa: ESTIMATIVA pela premissa (não é despesa efetivamente paga).
 */
export type FonteLinha = "lancado" | "contagens" | "indicador" | "premissa";

export type DreLoja = {
  d: DreCalc;
  fontes: Record<LinhaDreKey, FonteLinha>;
  /** Linhas que ainda são estimativa pela premissa. */
  estimadas: LinhaDreKey[];
  semVendas: boolean;
};

export type EntradaRealizado = {
  premissas: PremissasDre;
  fat: number;
  fatDel: number;
  cmvContagens: number | null;
  cmvIndicador: number | null;
  pessoalIndicador: number | null;
  /** Lançamentos reais do mês, em R$, por linha. */
  lancamentos: Partial<Record<LinhaDreKey, number>>;
};

const LINHAS_CHAVES: readonly LinhaDreKey[] = ["impostos", "cmv", "folha", "delivery", "manutencao", "marketing", "cto", "agua", "energia"];

/**
 * DRE realizado de uma loja no mês. Vendas vêm do módulo Vendas; CMV vem das contagens (ou do indicador, ou
 * da premissa); folha vem do indicador (ou da premissa); o resto vem da premissa até ser lançado em R$.
 * Cada linha lançada substitui a estimativa — nunca soma (sem dupla contagem).
 */
export function dreRealizadoLoja(e: EntradaRealizado): DreLoja {
  const p = e.premissas;
  const cmvPct = e.cmvContagens ?? e.cmvIndicador ?? p.cmv;
  const folhaPct = e.pessoalIndicador ?? p.pessoal;
  const base = dreCalc({
    fat: e.fat,
    fatDel: e.fatDel,
    impostos: p.impostos,
    cmv: cmvPct,
    folha: folhaPct,
    delivery: p.custoDelivery,
    deliveryBase: p.baseDelivery,
    manutencao: p.manutencao,
    marketing: p.marketing,
    cto: p.cto,
    agua: p.agua,
    energia: p.energia,
  });
  const fontes = {} as Record<LinhaDreKey, FonteLinha>;
  for (const k of LINHAS_CHAVES) fontes[k] = "premissa";
  if (e.cmvContagens != null) fontes.cmv = "contagens";
  else if (e.cmvIndicador != null) fontes.cmv = "indicador";
  if (e.pessoalIndicador != null) fontes.folha = "indicador";

  const lanc = LINHAS_CHAVES.filter((k) => e.lancamentos[k] != null);
  let d = base;
  if (lanc.length > 0) {
    const l: LinhasDre = {
      fat: base.fat,
      fatDel: base.del,
      imp: base.imp,
      cmv: base.cmv,
      folha: base.folha,
      cdel: base.cdel,
      man: base.man,
      mkt: base.mkt,
      cto: base.cto,
      agua: base.agua,
      energia: base.energia,
    };
    for (const k of lanc) {
      l[CHAVE_DRE[k] as keyof LinhasDre] = e.lancamentos[k] as number;
      fontes[k] = "lancado";
    }
    d = montarDre(l);
  }
  return { d, fontes, estimadas: LINHAS_CHAVES.filter((k) => fontes[k] === "premissa"), semVendas: !(e.fat > 0) };
}

/** DRE orçado de uma loja: meta de faturamento do mês + premissas (CMV e pessoal pelas premissas). Sem meta, não há orçado. */
export function dreOrcadoLoja(p: PremissasDre, metaMes: number | null): DreCalc | null {
  if (metaMes == null || !(metaMes > 0)) return null;
  return dreCalc({
    fat: metaMes,
    fatDel: (metaMes * p.mixDelivery) / 100,
    impostos: p.impostos,
    cmv: p.cmv,
    folha: p.pessoal,
    delivery: p.custoDelivery,
    deliveryBase: p.baseDelivery,
    manutencao: p.manutencao,
    marketing: p.marketing,
    cto: p.cto,
    agua: p.agua,
    energia: p.energia,
  });
}

export type LinhaComparativo = {
  k: LinhaDre;
  nome: string;
  tipo: "tot" | "sub" | "neg" | "res";
  orcado: number | null;
  realizado: number;
  variacao: number | null;
  variacaoPct: number | null;
  /** true = melhor que o orçado (receita/resultado acima; custo abaixo). null = sem comparação. */
  favoravel: boolean | null;
};

/** Orçado × realizado linha a linha. */
export function compararDre(orcado: DreCalc | null, realizado: DreCalc): LinhaComparativo[] {
  return DRE_LINHAS.map((l) => {
    const o = orcado ? orcado[l.k] : null;
    const r = realizado[l.k];
    const variacao = o == null ? null : r - o;
    const variacaoPct = o != null && Math.abs(o) > EPS ? ((r - o) / Math.abs(o)) * 100 : null;
    let favoravel: boolean | null = null;
    if (variacao != null && Math.abs(variacao) > EPS) favoravel = l.tipo === "neg" ? variacao < 0 : variacao > 0;
    else if (variacao != null) favoravel = true;
    return { k: l.k, nome: l.nome, tipo: l.tipo, orcado: o, realizado: r, variacao, variacaoPct, favoravel };
  });
}

/* ---------------------------------------------------------------- DRE da rede no mês */

export type EntradaDreRede = {
  lojas: readonly Loja[];
  /** Mês no formato YYYY-MM. */
  mes: string;
  vendas: readonly VendaDia[];
  premissas: readonly PremissasDreRow[];
  lancamentos: readonly LancamentoDre[];
  metasFat: readonly MetaFaturamento[];
  /** Indicadores lançados à mão (cmv e pessoal são usados aqui). */
  indicadores: readonly IndicadorMes[];
  /** CMV do mês vindo das contagens semanais. */
  cmvMes: readonly CmvDoMes[];
};

export type DreLojaNoMes = {
  loja: Loja;
  premissas: PremissasDre;
  excecoes: (keyof PremissasDre)[];
  metaMes: number | null;
  realizado: DreLoja;
  orcado: DreCalc | null;
};

export type DreRedeMes = {
  mes: string;
  porLoja: DreLojaNoMes[];
  /** Consolidado das lojas com vendas no mês (null se nenhuma). */
  realizadoRede: DreCalc | null;
  /** Consolidado do orçado das lojas que têm meta de faturamento no mês (null se nenhuma). */
  orcadoRede: DreCalc | null;
  lojasComVendas: number;
  /** Quantidade de linhas (loja × linha) ainda estimadas pela premissa. */
  linhasEstimadas: number;
  linhasTotal: number;
};

export function calcularDreRede(e: EntradaDreRede): DreRedeMes {
  const mesIni = primeiroDiaDoMes(e.mes);
  const operando = e.lojas.filter((l) => l.status === "operando");
  const porLoja: DreLojaNoMes[] = operando.map((loja) => {
    const doMes = e.vendas.filter((v) => v.lojaId === loja.id && mesDe(v.data) === e.mes);
    const fatSalao = doMes.reduce((a, v) => a + v.salao, 0);
    const fatDel = doMes.reduce((a, v) => a + v.delivery, 0);
    const premissas = premissasDaLoja(e.premissas, loja.id);
    const lanc: Partial<Record<LinhaDreKey, number>> = {};
    for (const l of e.lancamentos) if (l.lojaId === loja.id && l.mes === mesIni) lanc[l.linha] = l.valor;
    const ind = (k: "cmv" | "pessoal") => e.indicadores.find((i) => i.lojaId === loja.id && i.mes === mesIni && i.indicador === k)?.valor ?? null;
    const cmvContagens = e.cmvMes.find((c) => c.lojaId === loja.id && c.mes === e.mes)?.pct ?? null;
    const metaMes = e.metasFat.find((m) => m.lojaId === loja.id && m.mes === mesIni)?.valor ?? null;
    const realizado = dreRealizadoLoja({
      premissas,
      fat: fatSalao + fatDel,
      fatDel,
      cmvContagens,
      cmvIndicador: ind("cmv"),
      pessoalIndicador: ind("pessoal"),
      lancamentos: lanc,
    });
    return { loja, premissas, excecoes: excecoesDaLoja(e.premissas, loja.id), metaMes, realizado, orcado: dreOrcadoLoja(premissas, metaMes) };
  });
  const comVendas = porLoja.filter((p) => !p.realizado.semVendas);
  const comOrcado = porLoja.filter((p) => p.orcado != null);
  return {
    mes: e.mes,
    porLoja,
    realizadoRede: comVendas.length ? consolidarDre(comVendas.map((p) => p.realizado.d)) : null,
    orcadoRede: comOrcado.length ? consolidarDre(comOrcado.map((p) => p.orcado as DreCalc)) : null,
    lojasComVendas: comVendas.length,
    linhasEstimadas: comVendas.reduce((a, p) => a + p.realizado.estimadas.length, 0),
    linhasTotal: comVendas.length * LINHAS_CHAVES.length,
  };
}

/** Para cada R$ 100 vendidos: quanto vai para cada grupo de custo e quanto sobra de resultado (como no painel original). */
export function distribuicaoDeCem(d: DreCalc): { nome: string; valor: number }[] {
  if (!(d.fat > 0)) return [];
  const p = (v: number) => (v / d.fat) * 100;
  return [
    { nome: "CMV", valor: p(d.cmv) },
    { nome: "Folha", valor: p(d.folha) },
    { nome: "Custos de delivery", valor: p(d.cdel) },
    { nome: "Impostos", valor: p(d.imp) },
    { nome: "Marketing e outros", valor: p(d.mkt) },
    { nome: "CTO, água e energia", valor: p(d.cto + d.agua + d.energia) },
    { nome: "Manutenção", valor: p(d.man) },
    { nome: "Resultado", valor: p(Math.max(0, d.res)) },
  ];
}

/* ================================================================== orçamento e expansão */

export const CURVA_PADRAO: readonly number[] = [70, 80, 90, 95, 100, 100];

export type PremissasOrc = Pick<
  Cenario,
  "faturamento" | "mixDelivery" | "cmv" | "folha" | "impostos" | "custoDelivery" | "baseDelivery" | "manutencao" | "marketing" | "cto" | "agua" | "energia"
>;

/** Premissas do modelo original para nova loja. */
export const ORCAMENTO_PADRAO: PremissasOrc = {
  faturamento: 500000,
  mixDelivery: 100,
  cmv: 21,
  folha: 19,
  impostos: 10,
  custoDelivery: 28,
  baseDelivery: "delivery",
  manutencao: 1.5,
  marketing: 7,
  cto: 12000,
  agua: 1500,
  energia: 4500,
};

/**
 * DRE orçado de uma loja nova (`orcDre` do painel original). `fat` opcional serve à curva de maturação:
 * a folha fica fixa em R$ (folha% × faturamento-alvo), então nos primeiros meses pesa mais.
 */
export function orcDre(P: PremissasOrc, fat?: number): DreCalc {
  const f = fat ?? P.faturamento;
  return dreCalc({
    fat: f,
    fatDel: (f * P.mixDelivery) / 100,
    impostos: P.impostos,
    cmv: P.cmv,
    folhaR: (P.faturamento * P.folha) / 100,
    delivery: P.custoDelivery,
    deliveryBase: P.baseDelivery,
    manutencao: P.manutencao,
    marketing: P.marketing,
    cto: P.cto,
    agua: P.agua,
    energia: P.energia,
  });
}

export type MesDaCurva = { mes: number; pct: number; d: DreCalc };

/** Resultado de cada mês da curva e o acumulado. */
export function projetarCurva(P: PremissasOrc, curva: readonly number[]): { linhas: MesDaCurva[]; acumulado: number[] } {
  const linhas = curva.map((pct, i) => ({ mes: i + 1, pct, d: orcDre(P, (P.faturamento * pct) / 100) }));
  let acc = 0;
  const acumulado = linhas.map((x) => (acc += x.d.res));
  return { linhas, acumulado };
}

/** 1º ano = meses da curva + o restante do ano com a loja madura. */
export function resultadoPrimeiroAno(P: PremissasOrc, curva: readonly number[]): number {
  const { acumulado } = projetarCurva(P, curva);
  const maduro = orcDre(P).res;
  return (acumulado[acumulado.length - 1] ?? 0) + maduro * Math.max(0, 12 - curva.length);
}

export const premissasDoCenario = (c: Cenario): PremissasOrc => ({
  faturamento: c.faturamento,
  mixDelivery: c.mixDelivery,
  cmv: c.cmv,
  folha: c.folha,
  impostos: c.impostos,
  custoDelivery: c.custoDelivery,
  baseDelivery: c.baseDelivery,
  manutencao: c.manutencao,
  marketing: c.marketing,
  cto: c.cto,
  agua: c.agua,
  energia: c.energia,
});

export type ResumoCenario = {
  id: string;
  nome: string;
  faturamento: number;
  resultadoMensal: number;
  margem: number;
  resultadoAnual: number;
  pe: number | null;
  pePct: number | null;
  /** Resultado acumulado ao fim da curva. */
  acumuladoCurva: number;
  primeiroAno: number;
  /** Primeiro mês (1, 2, …) em que o resultado mensal é ≥ 0; null se nunca dentro da curva. */
  mesPositivo: number | null;
};

export function resumirCenario(c: Cenario): ResumoCenario {
  const P = premissasDoCenario(c);
  const d = orcDre(P);
  const { linhas, acumulado } = projetarCurva(P, c.curva);
  return {
    id: c.id,
    nome: c.nome,
    faturamento: c.faturamento,
    resultadoMensal: d.res,
    margem: d.mg,
    resultadoAnual: d.res * 12,
    pe: d.pe,
    pePct: d.pe != null && d.fat > 0 ? (d.pe / d.fat) * 100 : null,
    acumuladoCurva: acumulado[acumulado.length - 1] ?? 0,
    primeiroAno: resultadoPrimeiroAno(P, c.curva),
    mesPositivo: linhas.find((x) => x.d.res >= 0)?.mes ?? null,
  };
}

/* ---------------------------------------------------------------- rede com N lojas */

export type RedeSimulada = {
  /** Lojas novas (orçamento) agregadas: orçado × quantidade. */
  novas: DreCalc;
  consolidado: DreCalc;
  qtdNovas: number;
};

/**
 * Rede simulada: as lojas-base com o DRE atual + `qtdNovas` lojas pelo orçamento (como no painel original).
 * O ponto de equilíbrio da rede é a soma dos PEs (base + novas × PE orçado).
 */
export function simularRede(args: { base: readonly DreCalc[]; qtdNovas: number; orcado: DreCalc }): RedeSimulada {
  const { base, orcado } = args;
  const n = Math.max(0, args.qtdNovas);
  const soma = (k: LinhaDre) => base.reduce((a, x) => a + x[k], 0) + orcado[k] * n;
  const fat = soma("fat");
  const res = soma("res");
  const peBase = base.reduce<number | null>((a, x) => (a == null || x.pe == null ? null : a + x.pe), 0);
  const pe = peBase == null || orcado.pe == null ? null : peBase + orcado.pe * n;
  const consolidado: DreCalc = {
    fat,
    sal: soma("sal"),
    del: soma("del"),
    imp: soma("imp"),
    rl: soma("rl"),
    cmv: soma("cmv"),
    folha: soma("folha"),
    cdel: soma("cdel"),
    man: soma("man"),
    mkt: soma("mkt"),
    cto: soma("cto"),
    agua: soma("agua"),
    energia: soma("energia"),
    res,
    mg: fat > 0 ? (res / fat) * 100 : 0,
    pe,
    varPct: fat > 0 ? (soma("imp") + soma("cmv") + soma("cdel") + soma("man") + soma("mkt")) / fat : 0,
  };
  const novas: DreCalc = {
    fat: orcado.fat * n,
    sal: orcado.sal * n,
    del: orcado.del * n,
    imp: orcado.imp * n,
    rl: orcado.rl * n,
    cmv: orcado.cmv * n,
    folha: orcado.folha * n,
    cdel: orcado.cdel * n,
    man: orcado.man * n,
    mkt: orcado.mkt * n,
    cto: orcado.cto * n,
    agua: orcado.agua * n,
    energia: orcado.energia * n,
    res: orcado.res * n,
    mg: orcado.mg,
    pe: orcado.pe == null ? null : orcado.pe * n,
    varPct: orcado.varPct,
  };
  return { novas, consolidado, qtdNovas: n };
}

/** "Vila Mariana, Tatuapé, Butantã e 5 novas": quem ocupa as vagas do orçamento na rede simulada. */
export function descreverNovas(nomes: readonly string[], qtdNovas: number): string {
  if (qtdNovas <= 0) return "nenhuma loja nova";
  const lista = nomes.slice(0, qtdNovas);
  const resto = qtdNovas - lista.length;
  if (lista.length === 0) return `${qtdNovas} ${qtdNovas === 1 ? "nova" : "novas"}`;
  const nomesTxt = lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
  if (resto <= 0) return nomesTxt;
  return `${lista.join(", ")} e ${resto} ${resto === 1 ? "nova" : "novas"}`;
}

/** Projeção da visão geral: lojas-base hoje + novas lojas no faturamento mínimo (cartão "Projeção com 10 lojas"). */
export function projecaoRede(args: { fatBase: number; qtdNovas: number; faturamentoMinimo: number; fatRede: number }): { projecao: number; vezes: number | null } {
  const projecao = args.fatBase + Math.max(0, args.qtdNovas) * args.faturamentoMinimo;
  return { projecao, vezes: args.fatRede > 0 ? projecao / args.fatRede : null };
}

/* ---------------------------------------------------------------- calendário de inaugurações */

/** Quantidade de meses de `a` até `b` (YYYY-MM). */
export function mesesEntre(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
}

export function somarMeses(mes: string, n: number): string {
  const total = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) + n;
  const ano = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${ano}-${String(m).padStart(2, "0")}`;
}

export type UnidadeCalculada = {
  unidade: UnidadeExpansao;
  cenario: Cenario;
  premissas: PremissasOrc;
  maduro: DreCalc;
  primeiroAno: number;
  /** Mês de abertura YYYY-MM (null = sem data). */
  abertura: string | null;
};

/** Resultado por unidade: cenário próprio (ou o de simulação) e faturamento-alvo próprio (ou o do cenário). */
export function calcularUnidades(unidades: readonly UnidadeExpansao[], cenarios: readonly Cenario[], cenarioPadrao: Cenario | null): UnidadeCalculada[] {
  const out: UnidadeCalculada[] = [];
  for (const u of unidades) {
    if (u.status === "cancelada") continue;
    const cenario = cenarios.find((c) => c.id === u.cenarioId) ?? cenarioPadrao;
    if (!cenario) continue;
    const premissas: PremissasOrc = { ...premissasDoCenario(cenario), ...(u.faturamentoAlvo != null ? { faturamento: u.faturamentoAlvo } : {}) };
    out.push({
      unidade: u,
      cenario,
      premissas,
      maduro: orcDre(premissas),
      primeiroAno: resultadoPrimeiroAno(premissas, cenario.curva),
      abertura: u.aberturaPrevista ? mesDe(u.aberturaPrevista) : null,
    });
  }
  return out;
}

export type PontoImpacto = { mes: string; lojasAbertas: number; resultado: number; faturamento: number };

/**
 * Impacto mensal das inaugurações na rede: a partir do mês de abertura, cada unidade segue a curva de
 * maturação do seu cenário (e depois fica madura). Antes de abrir, não conta.
 */
export function impactoMensal(unidades: readonly UnidadeCalculada[], de: string, meses: number): PontoImpacto[] {
  const out: PontoImpacto[] = [];
  for (let i = 0; i < meses; i++) {
    const mes = somarMeses(de, i);
    let resultado = 0;
    let faturamento = 0;
    let abertas = 0;
    for (const u of unidades) {
      if (!u.abertura || u.abertura > mes) continue;
      abertas += 1;
      const idx = mesesEntre(u.abertura, mes);
      const curva = u.cenario.curva;
      const pct = idx < curva.length ? curva[idx] : 100;
      const d = orcDre(u.premissas, (u.premissas.faturamento * pct) / 100);
      resultado += d.res;
      faturamento += d.fat;
    }
    out.push({ mes, lojasAbertas: abertas, resultado, faturamento });
  }
  return out;
}

/* ================================================================== exportação (CSV) */

type Celula = string | number | null;

export function linhasCsvDre(titulo: string, cols: readonly { nome: string; d: DreCalc }[]): Celula[][] {
  const cab: Celula[] = ["Linha", ...cols.flatMap((c) => [`${c.nome} (R$)`, `${c.nome} (%)`])];
  const linhas = DRE_LINHAS.map((l) => [
    l.nome,
    ...cols.flatMap((c) => [Math.round(c.d[l.k] * 100) / 100, c.d.fat > 0 ? Math.round((c.d[l.k] / c.d.fat) * 1000) / 10 : null]),
  ]);
  const pe: Celula[] = ["Ponto de equilíbrio", ...cols.flatMap((c) => [c.d.pe == null ? null : Math.round(c.d.pe * 100) / 100, c.d.pe != null && c.d.fat > 0 ? Math.round((c.d.pe / c.d.fat) * 1000) / 10 : null])];
  return [[titulo], cab, ...linhas, pe];
}

export function linhasCsvComparativo(titulo: string, linhas: readonly LinhaComparativo[]): Celula[][] {
  const r2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);
  return [
    [titulo],
    ["Linha", "Orçado (R$)", "Realizado (R$)", "Variação (R$)", "Variação (%)"],
    ...linhas.map((l) => [l.nome, r2(l.orcado), r2(l.realizado), r2(l.variacao), l.variacaoPct == null ? null : Math.round(l.variacaoPct * 10) / 10]),
  ];
}

export const LINHAS_REALIZADAS: readonly LinhaDreKey[] = LINHAS_CHAVES;

/** Para os testes e para a interface: soma de dias de uma semana (segunda a domingo). */
export const diasDaSemana = (segunda: string): string[] => listarDias(segunda, somarDias(segunda, 6));
