import "server-only";

import type { Db, RedeContexto } from "./acesso";
import { mesDe, primeiroDiaDoMes, resolverMeta, somarDias, statusMeta, ultimoDiaDoMes } from "./calculo";
import { lerFiltros, type FiltrosRede } from "./filtros";
import {
  alertasCmv,
  calcularDreRede,
  cmvDoMes,
  premissasPadrao,
  resumirSemana,
  segundaDaSemana,
  somarMeses,
  vendasPorSemana,
  type AlertaCmv,
  type CmvDoMes,
  type ContagemCalculada,
  type DreCalc,
  type DreRedeMes,
  type ResumoSemanaCmv,
} from "./financeiro";
import {
  carregarBase,
  hojeDoTenant,
  lerConfigExpansao,
  lerContagensCalculadas,
  lerIndicadoresMes,
  lerMetasFaturamento,
  lerTudo,
  lerVendas,
  ultimaVenda,
  type BaseRede,
} from "./loader";
import { mapCenario, mapCmvItem, mapLancamento, mapPremissa, mapUnidade } from "./mapeadores-financeiro";
import type { Cenario, CmvItem, ConfigExpansao, IndicadorMes, LancamentoDre, Loja, MetaFaturamento, PremissasDre, PremissasDreRow, UnidadeExpansao, VendaDia } from "./tipos";

type Params = Record<string, string | string[] | undefined>;
type Linha = Record<string, unknown>;

const um = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/* ================================================================== CMV */

export const SEMANAS_NA_TELA = 8;

export type DadosCmv = {
  base: BaseRede;
  hoje: string;
  lojaFiltro: Loja | null;
  /** Lojas que entram na tela (operando ou em inauguração, dentro do acesso e do filtro). */
  lojas: Loja[];
  /** Segunda-feira da semana em foco. */
  semana: string;
  /** As últimas semanas (ordem crescente) que terminam na semana em foco. */
  semanas: string[];
  calc: ContagemCalculada[];
  itens: CmvItem[];
  resumos: ResumoSemanaCmv[];
  alertas: AlertaCmv[];
  /** Meta de CMV vigente na semana em foco: por loja (id) e a padrão da rede. */
  metaPorLoja: Record<string, number | null>;
  metaRede: number | null;
  /** CMV do mês da semana em foco (Σ real ÷ Σ vendas das semanas que começam no mês). */
  mes: CmvDoMes[];
  /** Vendas lançadas no módulo Vendas na semana em foco (segunda a domingo), por loja — base quando a contagem não informa vendas. */
  vendasModulo: Record<string, number>;
};

async function semanaPadrao(db: Db, lojaIds: string[], hoje: string): Promise<string> {
  if (lojaIds.length > 0) {
    const { data } = await db.from("rede_cmv_semanal").select("semana").in("loja_id", lojaIds).order("semana", { ascending: false }).limit(1);
    const s = ((data ?? [])[0] as Linha | undefined)?.semana;
    if (s) return String(s);
  }
  return somarDias(segundaDaSemana(hoje), -7);
}

export async function carregarCmvTela(ctx: RedeContexto, params: Params): Promise<DadosCmv> {
  const { db } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const f = lerFiltros(params, mesDe(hoje));
  const lojaFiltro = f.loja ? (base.lojas.find((l) => l.slug === f.loja) ?? null) : null;
  const lojas = base.lojas.filter((l) => l.status !== "inativa" && (!lojaFiltro || l.id === lojaFiltro.id));
  const ids = lojas.map((l) => l.id);

  const pedida = um(params.semana);
  const semana = pedida && /^\d{4}-\d{2}-\d{2}$/.test(pedida) && !Number.isNaN(new Date(`${pedida}T12:00:00Z`).getTime()) ? segundaDaSemana(pedida) : await semanaPadrao(db, ids, hoje);
  const inicio = somarDias(semana, -7 * (SEMANAS_NA_TELA - 1));
  const semanas = Array.from({ length: SEMANAS_NA_TELA }, (_, i) => somarDias(inicio, 7 * i));

  // Janela: as semanas mostradas + o mês inteiro da semana em foco (para o CMV do mês).
  const mesIni = primeiroDiaDoMes(mesDe(semana));
  const de = mesIni < inicio ? mesIni : inicio;
  const [calcJanela, itensRes, vendasSemana] = await Promise.all([
    lerContagensCalculadas(db, ids, de, semana),
    ids.length === 0
      ? Promise.resolve({ data: [] as Linha[] })
      : db.from("rede_cmv_itens").select("loja_id,semana,item,consumo_teorico,consumo_real").in("loja_id", ids).eq("semana", semana).order("item"),
    lerVendas(db, ids, semana, somarDias(semana, 6)),
  ]);
  const vendasModulo: Record<string, number> = {};
  for (const [k, v] of vendasPorSemana(vendasSemana)) {
    const [lojaId, sem] = k.split("|");
    if (sem === semana) vendasModulo[lojaId] = v;
  }
  const calc = calcJanela.filter((c) => c.contagem.semana >= inicio && c.contagem.semana <= semana);
  const itens = ((itensRes.data ?? []) as Linha[]).map(mapCmvItem);

  const metaRede = resolverMeta(base.metas, null, "cmv", semana).meta;
  const metaPorLoja: Record<string, number | null> = {};
  for (const l of lojas) metaPorLoja[l.id] = resolverMeta(base.metas, l.id, "cmv", semana).meta;

  const tolDispersao = base.config.toleranciaCmv;
  const tolPct = base.config.toleranciaSemaforoPct;
  const resumos = semanas.map((s) => {
    const r = resumirSemana(calc, s, metaRede, tolDispersao);
    // "Acima da meta" conta cada loja contra a sua própria meta (a da loja, se houver; senão a da rede).
    const acimaMeta = calc.filter((c) => {
      if (c.contagem.semana !== s || c.pct == null) return false;
      const m = resolverMeta(base.metas, c.contagem.lojaId, "cmv", s);
      const st = statusMeta(m.meta, m.direcao, c.pct, tolPct);
      return st === "warn" || st === "bad";
    }).length;
    return { ...r, acimaMeta };
  });
  const alertas = alertasCmv({ calc, semana, lojas: lojas.filter((l) => l.status === "operando"), metas: base.metas, tolPct, tolDispersao });
  const mes = cmvDoMes(calcJanela.filter((c) => mesDe(c.contagem.semana) === mesDe(semana)));

  return { base, hoje, lojaFiltro, lojas, semana, semanas, calc, itens, resumos, alertas, metaPorLoja, metaRede, mes, vendasModulo };
}

/* ================================================================== insumos do DRE */

export type InsumosDre = {
  vendas: VendaDia[];
  premissas: PremissasDreRow[];
  lancamentos: LancamentoDre[];
  metasFat: MetaFaturamento[];
  indicadores: IndicadorMes[];
  cmvMes: CmvDoMes[];
};

export async function lerPremissas(db: Db, tenantId: string): Promise<PremissasDreRow[]> {
  const { data, error } = await db.from("rede_dre_premissas").select("*").eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Linha[]).map(mapPremissa);
}

export async function lerLancamentosDre(db: Db, lojaIds: string[], deMes: string, ateMes: string): Promise<LancamentoDre[]> {
  if (lojaIds.length === 0) return [];
  const linhas = await lerTudo((a, b) =>
    db.from("rede_dre_lancamentos").select("*").in("loja_id", lojaIds).gte("mes", primeiroDiaDoMes(deMes)).lte("mes", primeiroDiaDoMes(ateMes)).order("mes").order("loja_id").order("linha").range(a, b),
  );
  return linhas.map(mapLancamento);
}

/** Tudo o que o DRE precisa para os meses de `deMes` a `ateMes` (YYYY-MM) das lojas informadas. */
export async function lerInsumosDre(db: Db, tenantId: string, lojaIds: string[], deMes: string, ateMes: string): Promise<InsumosDre> {
  const de = primeiroDiaDoMes(deMes);
  const ate = ultimoDiaDoMes(ateMes);
  const [vendas, premissas, lancamentos, metasFat, indicadores, contagens] = await Promise.all([
    lerVendas(db, lojaIds, de, ate),
    lerPremissas(db, tenantId),
    lerLancamentosDre(db, lojaIds, deMes, ateMes),
    lerMetasFaturamento(db, lojaIds, de, ate),
    lerIndicadoresMes(db, lojaIds, de, ate),
    lerContagensCalculadas(db, lojaIds, de, ate),
  ]);
  return { vendas, premissas, lancamentos, metasFat, indicadores, cmvMes: cmvDoMes(contagens) };
}

export const calcularDoMes = (lojas: Loja[], mes: string, i: InsumosDre): DreRedeMes => calcularDreRede({ lojas, mes, ...i });

/* ================================================================== DRE */

export const MESES_NA_EVOLUCAO = 6;

export type DadosDre = {
  base: BaseRede;
  hoje: string;
  mes: string;
  /** Filtros da barra (o DRE é sempre mensal). */
  filtros: FiltrosRede;
  lojaFiltro: Loja | null;
  lojas: Loja[];
  premissasRows: PremissasDreRow[];
  premissaPadrao: PremissasDre;
  lancamentos: LancamentoDre[];
  dre: DreRedeMes;
  evolucao: { mes: string; fat: number; resultado: number; margem: number; estimadas: number; total: number }[];
};

export async function carregarDreTela(ctx: RedeContexto, params: Params): Promise<DadosDre> {
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const ids = base.lojas.map((l) => l.id);
  const ult = await ultimaVenda(ctx.db, ids);
  const f = lerFiltros(params, ult ? mesDe(ult) : mesDe(hoje));
  const lojaFiltro = f.loja ? (base.lojas.find((l) => l.slug === f.loja) ?? null) : null;
  const lojas = base.lojas.filter((l) => !lojaFiltro || l.id === lojaFiltro.id);
  const inicio = somarMeses(f.mes, -(MESES_NA_EVOLUCAO - 1));
  const insumos = await lerInsumosDre(ctx.db, ctx.tenant.id, lojas.map((l) => l.id), inicio, f.mes);
  const dre = calcularDoMes(lojas, f.mes, insumos);

  const evolucao: DadosDre["evolucao"] = [];
  for (let i = 0; i < MESES_NA_EVOLUCAO; i++) {
    const m = somarMeses(inicio, i);
    const x = m === f.mes ? dre : calcularDoMes(lojas, m, insumos);
    if (x.realizadoRede) evolucao.push({ mes: m, fat: x.realizadoRede.fat, resultado: x.realizadoRede.res, margem: x.realizadoRede.mg, estimadas: x.linhasEstimadas, total: x.linhasTotal });
  }

  return {
    base,
    hoje,
    mes: f.mes,
    filtros: { ...f, modo: "mes" },
    lojaFiltro,
    lojas,
    premissasRows: insumos.premissas,
    premissaPadrao: premissasPadrao(insumos.premissas),
    lancamentos: insumos.lancamentos.filter((l) => l.mes === primeiroDiaDoMes(f.mes)),
    dre,
    evolucao,
  };
}

/* ================================================================== orçamento e expansão */

export type DadosOrcamento = {
  base: BaseRede;
  hoje: string;
  cenarios: Cenario[];
  unidades: UnidadeExpansao[];
  config: ConfigExpansao;
  /** Mês de referência do DRE das lojas-base (último com vendas) — null se não há vendas. */
  mesRef: string | null;
  /** DRE realizado/estimado, no mês de referência, das lojas-base que têm vendas. */
  baseDre: { lojaId: string; nome: string; d: DreCalc }[];
};

export async function carregarOrcamentoTela(ctx: RedeContexto): Promise<DadosOrcamento> {
  const { db } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const ids = base.lojas.map((l) => l.id);
  const [cenRes, uniRes, configLida, ult] = await Promise.all([
    db.from("rede_orc_cenarios").select("*").eq("tenant_id", ctx.tenant.id).order("padrao", { ascending: false }).order("nome"),
    db.from("rede_expansao_unidades").select("*").eq("tenant_id", ctx.tenant.id).order("abertura_prevista", { ascending: true, nullsFirst: false }).order("nome"),
    lerConfigExpansao(db, ctx.tenant.id),
    ultimaVenda(db, ids),
  ]);
  if (cenRes.error) throw new Error(cenRes.error.message);
  if (uniRes.error) throw new Error(uniRes.error.message);
  const config: ConfigExpansao = configLida ?? { metaLojas: 10, faturamentoMinimo: 500000, lojasBase: [] };

  let mesRef: string | null = null;
  let baseDre: DadosOrcamento["baseDre"] = [];
  const lojasBase = base.lojas.filter((l) => config.lojasBase.includes(l.id));
  if (ult && lojasBase.length > 0) {
    mesRef = mesDe(ult);
    const insumos = await lerInsumosDre(db, ctx.tenant.id, lojasBase.map((l) => l.id), mesRef, mesRef);
    const dre = calcularDoMes(lojasBase, mesRef, insumos);
    baseDre = dre.porLoja.filter((p) => !p.realizado.semVendas).map((p) => ({ lojaId: p.loja.id, nome: p.loja.nome, d: p.realizado.d }));
  }

  return {
    base,
    hoje,
    cenarios: ((cenRes.data ?? []) as Linha[]).map(mapCenario),
    unidades: ((uniRes.data ?? []) as Linha[]).map(mapUnidade),
    config,
    mesRef,
    baseDre,
  };
}
