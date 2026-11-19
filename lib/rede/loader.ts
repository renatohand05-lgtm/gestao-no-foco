import "server-only";

import { civilDateInTimezone } from "@/lib/dashboard/tenant-timezone";
import { listMembers } from "@/lib/equipe/members-service";

import type { Db, RedeContexto } from "./acesso";
import {
  calcularPainelRede,
  mediaPorHora,
  mesDe,
  primeiroDiaDoMes,
  somarDias,
  ultimoDiaDoMes,
  type PainelRede,
  type PontoHora,
} from "./calculo";
import { lerFiltros, mesDeReferencia, mesesDoPeriodo, type FiltrosRede } from "./filtros";
import { calcularContagens, indicadoresCmv, mesclarIndicadores, projecaoRede, vendasPorSemana, type ContagemCalculada } from "./financeiro";
import { mapCmv, mapConfigExpansao } from "./mapeadores-financeiro";
import { lojasDoPerfil, podeVer } from "./permissoes";
import type {
  CanaisLoja,
  CmvSemana,
  ConfigExpansao,
  ConfigRede,
  Direcao,
  IndicadorKey,
  IndicadorMes,
  Loja,
  MetaFaturamento,
  MetaRow,
  PapelRede,
  StatusLoja,
  VendaDia,
} from "./tipos";

type Linha = Record<string, unknown>;
const TAMANHO_PAGINA = 1000;
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));
const numOuNull = (v: unknown): number | null => (v == null ? null : Number(v));

export const PESOS_PADRAO: ConfigRede["pesosDiaSemana"] = { seg: 0.85, ter: 0.9, qua: 0.95, qui: 1, sex: 1.25, sab: 1.35, dom: 1.15 };

export function mapLoja(r: Linha): Loja {
  return {
    id: String(r.id),
    slug: String(r.slug),
    nome: String(r.nome),
    status: r.status as StatusLoja,
    canais: r.canais as CanaisLoja,
    dataInauguracao: (r.data_inauguracao as string | null) ?? null,
    inauguracaoPrevista: (r.inauguracao_prevista as string | null) ?? null,
    ordem: num(r.ordem),
  };
}

export function mapConfig(r: Linha | null): ConfigRede {
  const pesos = (r?.pesos_dia_semana ?? {}) as Record<string, unknown>;
  return {
    ambiente: r?.ambiente === "demonstracao" ? "demonstracao" : "real",
    pisoLoja: r ? num(r.piso_loja) : 500000,
    pesosDiaSemana: {
      seg: num(pesos.seg ?? PESOS_PADRAO.seg),
      ter: num(pesos.ter ?? PESOS_PADRAO.ter),
      qua: num(pesos.qua ?? PESOS_PADRAO.qua),
      qui: num(pesos.qui ?? PESOS_PADRAO.qui),
      sex: num(pesos.sex ?? PESOS_PADRAO.sex),
      sab: num(pesos.sab ?? PESOS_PADRAO.sab),
      dom: num(pesos.dom ?? PESOS_PADRAO.dom),
    },
    toleranciaCmv: r ? num(r.tolerancia_cmv) : 1,
    toleranciaSemaforoPct: r ? num(r.tolerancia_semaforo_pct) : 10,
  };
}

export function mapMeta(r: Linha): MetaRow {
  return {
    id: String(r.id),
    lojaId: (r.loja_id as string | null) ?? null,
    indicador: r.indicador as IndicadorKey,
    meta: numOuNull(r.meta),
    direcao: (r.direcao as Direcao | null) ?? null,
    validoDe: String(r.valido_de),
    validoAte: (r.valido_ate as string | null) ?? null,
  };
}

export function mapVenda(r: Linha): VendaDia {
  return {
    lojaId: String(r.loja_id),
    data: String(r.data),
    salao: num(r.venda_salao),
    delivery: num(r.venda_delivery),
    pedidosSalao: num(r.pedidos_salao),
    pedidosDelivery: num(r.pedidos_delivery),
  };
}

/** Lê todas as páginas de uma consulta (o PostgREST corta em 1 000 linhas por resposta). */
export async function lerTudo(pagina: (de: number, ate: number) => PromiseLike<{ data: Linha[] | null; error: { message: string } | null }>): Promise<Linha[]> {
  const out: Linha[] = [];
  for (let de = 0; de < 200_000; de += TAMANHO_PAGINA) {
    const { data, error } = await pagina(de, de + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return out;
}

export const hojeDoTenant = (): string => civilDateInTimezone(new Date());

/* ------------------------------------------------------------------ base */

export type BaseRede = { lojas: Loja[]; config: ConfigRede; metas: MetaRow[] };

export async function carregarBase(ctx: RedeContexto): Promise<BaseRede> {
  const { db, tenant, perfil } = ctx;
  const [lojasRes, configRes, metasRes] = await Promise.all([
    db.from("rede_lojas").select("*").eq("tenant_id", tenant.id).order("ordem").order("nome"),
    db.from("rede_config").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    db.from("rede_metas").select("*").eq("tenant_id", tenant.id).order("valido_de", { ascending: false }),
  ]);
  if (lojasRes.error) throw new Error(lojasRes.error.message);
  const todasAsLojas = ((lojasRes.data ?? []) as Linha[]).map(mapLoja);
  return {
    // O banco já filtra por acesso; o filtro extra deixa a regra explícita.
    lojas: lojasDoPerfil(perfil, todasAsLojas),
    config: mapConfig((configRes.data as Linha | null) ?? null),
    metas: ((metasRes.data ?? []) as Linha[]).map(mapMeta),
  };
}

/** Só o ambiente (real ou demonstração) — leve, usado pelo cabeçalho de todas as telas. */
export async function carregarConfigAmbiente(ctx: RedeContexto): Promise<ConfigRede["ambiente"]> {
  const { data } = await ctx.db.from("rede_config").select("ambiente").eq("tenant_id", ctx.tenant.id).maybeSingle();
  return (data as Linha | null)?.ambiente === "demonstracao" ? "demonstracao" : "real";
}

export async function ultimaVenda(db: Db, lojaIds: string[]): Promise<string | null> {
  if (lojaIds.length === 0) return null;
  const { data } = await db.from("rede_vendas_dia").select("data").in("loja_id", lojaIds).order("data", { ascending: false }).limit(1);
  return ((data ?? [])[0] as Linha | undefined)?.data ? String((data as Linha[])[0].data) : null;
}

/* ------------------------------------------------------------------ vendas e mensais */

export async function lerVendas(db: Db, lojaIds: string[], de: string, ate: string): Promise<VendaDia[]> {
  if (lojaIds.length === 0) return [];
  const linhas = await lerTudo((a, b) =>
    db.from("rede_vendas_dia").select("loja_id,data,venda_salao,venda_delivery,pedidos_salao,pedidos_delivery").in("loja_id", lojaIds).gte("data", de).lte("data", ate).order("data").order("loja_id").range(a, b),
  );
  return linhas.map(mapVenda);
}

export async function lerMetasFaturamento(db: Db, lojaIds: string[], de: string, ate: string): Promise<MetaFaturamento[]> {
  if (lojaIds.length === 0) return [];
  const linhas = await lerTudo((a, b) =>
    db.from("rede_metas_faturamento").select("loja_id,mes,valor").in("loja_id", lojaIds).gte("mes", primeiroDiaDoMes(mesDe(de))).lte("mes", primeiroDiaDoMes(mesDe(ate))).order("mes").order("loja_id").range(a, b),
  );
  return linhas.map((r) => ({ lojaId: String(r.loja_id), mes: String(r.mes), valor: num(r.valor) }));
}

export async function lerIndicadoresMes(db: Db, lojaIds: string[], de: string, ate: string): Promise<IndicadorMes[]> {
  if (lojaIds.length === 0) return [];
  const linhas = await lerTudo((a, b) =>
    db.from("rede_indicadores_mes").select("loja_id,mes,indicador,valor,origem").in("loja_id", lojaIds).gte("mes", primeiroDiaDoMes(mesDe(de))).lte("mes", primeiroDiaDoMes(mesDe(ate))).order("mes").order("loja_id").order("indicador").range(a, b),
  );
  return linhas.map((r) => ({
    lojaId: String(r.loja_id),
    mes: String(r.mes),
    indicador: r.indicador as IndicadorKey,
    valor: num(r.valor),
    origem: r.origem === "exemplo" ? "exemplo" : "manual",
  }));
}

/* ------------------------------------------------------------------ CMV e expansão (usados pela visão geral e pelo DRE) */

/** Contagens semanais cuja semana começa entre `de` e `ate`. */
export async function lerCmvSemanal(db: Db, lojaIds: string[], de: string, ate: string): Promise<CmvSemana[]> {
  if (lojaIds.length === 0) return [];
  const linhas = await lerTudo((a, b) =>
    db.from("rede_cmv_semanal").select("*").in("loja_id", lojaIds).gte("semana", de).lte("semana", ate).order("semana").order("loja_id").range(a, b),
  );
  return linhas.map(mapCmv);
}

/**
 * Contagens semanais já calculadas (CMV real, %, dispersão). Se uma contagem não traz vendas, usa as
 * vendas lançadas no módulo Vendas na semana (segunda a domingo).
 */
export async function calcularContagensLidas(db: Db, contagens: CmvSemana[]): Promise<ContagemCalculada[]> {
  if (contagens.length === 0) return [];
  let mapa = new Map<string, number>();
  const semBase = contagens.filter((c) => c.vendas == null);
  if (semBase.length > 0) {
    const semanas = semBase.map((c) => c.semana).sort();
    const vendas = await lerVendas(db, [...new Set(semBase.map((c) => c.lojaId))], semanas[0], somarDias(semanas[semanas.length - 1], 6));
    mapa = vendasPorSemana(vendas);
  }
  return calcularContagens(contagens, mapa);
}

/** Contagens cujas semanas começam nos meses de `de` a `ate`, já calculadas. */
export async function lerContagensCalculadas(db: Db, lojaIds: string[], de: string, ate: string): Promise<ContagemCalculada[]> {
  const contagens = await lerCmvSemanal(db, lojaIds, primeiroDiaDoMes(mesDe(de)), ultimoDiaDoMes(mesDe(ate)));
  return calcularContagensLidas(db, contagens);
}

/**
 * CMV do mês de cada loja, calculado das contagens semanais (semanas que começam no mês). Alimenta o
 * indicador "CMV" da visão geral e do semáforo — e tem prioridade sobre o valor lançado à mão.
 */
export async function lerIndicadoresCmv(db: Db, lojaIds: string[], de: string, ate: string): Promise<IndicadorMes[]> {
  return indicadoresCmv(await lerContagensCalculadas(db, lojaIds, de, ate));
}

export async function lerConfigExpansao(db: Db, tenantId: string): Promise<ConfigExpansao | null> {
  const { data } = await db.from("rede_expansao_config").select("*").eq("tenant_id", tenantId).maybeSingle();
  return mapConfigExpansao((data as Linha | null) ?? null);
}

/* ------------------------------------------------------------------ painel */

export type DadosPainel = {
  base: BaseRede;
  filtros: FiltrosRede;
  lojaFiltro: Loja | null;
  painel: PainelRede;
  horas: { pontos: PontoHora[]; pico: PontoHora | null; mesesComDados: number };
  hoje: string;
  temVendas: boolean;
  /** Projeção "rede com N lojas" (só para quem enxerga o orçamento e sem filtro de loja). */
  projecao: {
    metaLojas: number;
    qtdNovas: number;
    faturamentoMinimo: number;
    /** Faturamento do mês de referência das lojas-base. */
    base: { nome: string; fat: number }[];
    fatBase: number;
    /** Faturamento do mês de referência de toda a rede em operação. */
    fatRede: number;
    lojasOperando: number;
    projecao: number;
    vezes: number | null;
    /** Próximas inaugurações do calendário (planejadas, a partir do mês corrente), em ordem de data. */
    proximas: { nome: string; mes: string | null }[];
  } | null;
};

export async function carregarPainel(ctx: RedeContexto, params: Record<string, string | string[] | undefined>): Promise<DadosPainel> {
  const { db } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const lojaIds = base.lojas.map((l) => l.id);

  const ult = await ultimaVenda(db, lojaIds);
  const filtros = lerFiltros(params, ult ? mesDe(ult) : mesDe(hoje));
  const lojaFiltro = filtros.loja ? (base.lojas.find((l) => l.slug === filtros.loja) ?? null) : null;

  // Janela em meses inteiros: ranking e alertas olham o mês de referência completo.
  const janelaDe = primeiroDiaDoMes(mesDe(filtros.de));
  const janelaAte = ultimoDiaDoMes(mesDe(filtros.ate));
  const [vendas, metasFat, indicadoresLancados, indicadoresCmvCalc, configExpansao] = await Promise.all([
    lerVendas(db, lojaIds, janelaDe, janelaAte),
    lerMetasFaturamento(db, lojaIds, janelaDe, janelaAte),
    lerIndicadoresMes(db, lojaIds, janelaDe, janelaAte),
    lerIndicadoresCmv(db, lojaIds, janelaDe, janelaAte),
    lojaFiltro ? Promise.resolve(null) : lerConfigExpansao(db, ctx.tenant.id),
  ]);
  // CMV calculado das contagens semanais tem prioridade sobre o lançado à mão.
  const indicadores = mesclarIndicadores(indicadoresLancados, indicadoresCmvCalc);

  const mesRef = mesDeReferencia(filtros.de, filtros.ate, hoje, vendas.map((v) => v.data));
  const painel = calcularPainelRede({
    lojas: base.lojas,
    config: base.config,
    metas: base.metas,
    metasFat,
    indicadores,
    vendas,
    de: filtros.de,
    ate: filtros.ate,
    mesRef,
    hoje,
    lojaFiltroId: lojaFiltro?.id ?? null,
  });

  // Vendas por hora: fechamento mensal por hora; média por dia com venda nos meses do período.
  const idsFoco = lojaFiltro ? [lojaFiltro.id] : lojaIds;
  const meses = mesesDoPeriodo(filtros).map(primeiroDiaDoMes);
  let pontos: PontoHora[] = [];
  let pico: PontoHora | null = null;
  let mesesComDados = 0;
  if (idsFoco.length > 0 && meses.length > 0) {
    const linhas = await lerTudo((a, b) =>
      db.from("rede_vendas_hora_mes").select("loja_id,mes,hora,venda_salao,venda_delivery").in("loja_id", idsFoco).in("mes", meses).order("mes").order("loja_id").order("hora").range(a, b),
    );
    mesesComDados = new Set(linhas.map((l) => String(l.mes))).size;
    const mesesDados = new Set(linhas.map((l) => String(l.mes).slice(0, 7)));
    const dias = new Set(vendas.filter((v) => idsFoco.includes(v.lojaId) && mesesDados.has(mesDe(v.data)) && v.salao + v.delivery > 0).map((v) => v.data));
    const r = mediaPorHora(linhas.map((l) => ({ hora: num(l.hora), salao: num(l.venda_salao), delivery: num(l.venda_delivery) })), dias.size);
    pontos = r.pontos;
    pico = r.pico;
  }

  let projecao: DadosPainel["projecao"] = null;
  // A projeção da rede é do módulo Orçamento: quem não o enxerga (gerentes) não a recebe, além do que o RLS já nega.
  if (configExpansao && !lojaFiltro && podeVer(ctx.perfil, "orcamento")) {
    // Mês de referência (mês cheio), como no painel original: a projeção compara meses, não o período filtrado.
    const base0 = painel.porLoja.filter((p) => configExpansao.lojasBase.includes(p.loja.id));
    const fatBase = base0.reduce((a, p) => a + p.mes.totais.fat, 0);
    const fatRede = painel.porLoja.reduce((a, p) => a + p.mes.totais.fat, 0);
    const { data: unidadesLidas } = await db.from("rede_expansao_unidades").select("nome,abertura_prevista,status").eq("tenant_id", ctx.tenant.id).neq("status", "cancelada").order("abertura_prevista", { ascending: true, nullsFirst: false });
    const mesCorrente = mesDe(hoje);
    const proximas = ((unidadesLidas ?? []) as Linha[])
      .map((u) => ({ nome: String(u.nome), mes: u.abertura_prevista ? mesDe(String(u.abertura_prevista)) : null, status: String(u.status) }))
      .filter((u) => u.status === "planejada" && (u.mes == null || u.mes >= mesCorrente))
      .slice(0, 3)
      .map(({ nome, mes }) => ({ nome, mes }));
    const qtdNovas = Math.max(0, configExpansao.metaLojas - configExpansao.lojasBase.length);
    const pj = projecaoRede({ fatBase, qtdNovas, faturamentoMinimo: configExpansao.faturamentoMinimo, fatRede });
    projecao = {
      metaLojas: configExpansao.metaLojas,
      qtdNovas,
      faturamentoMinimo: configExpansao.faturamentoMinimo,
      base: base0.map((p) => ({ nome: p.loja.nome, fat: p.mes.totais.fat })),
      fatBase,
      fatRede,
      lojasOperando: painel.porLoja.length,
      projecao: pj.projecao,
      vezes: pj.vezes,
      proximas,
    };
  }

  return { base, filtros, lojaFiltro, painel, horas: { pontos, pico, mesesComDados }, hoje, temVendas: vendas.length > 0, projecao };
}

/* ------------------------------------------------------------------ telas de vendas e metas */

type Params = Record<string, string | string[] | undefined>;

export type DadosVendas = { base: BaseRede; filtros: FiltrosRede; lojaFiltro: Loja | null; vendas: VendaDia[]; hoje: string };

export async function carregarVendasTela(ctx: RedeContexto, params: Params): Promise<DadosVendas> {
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const ids = base.lojas.map((l) => l.id);
  const ult = await ultimaVenda(ctx.db, ids);
  const filtros = lerFiltros(params, ult ? mesDe(ult) : mesDe(hoje));
  const lojaFiltro = filtros.loja ? (base.lojas.find((l) => l.slug === filtros.loja) ?? null) : null;
  const vendas = await lerVendas(ctx.db, lojaFiltro ? [lojaFiltro.id] : ids, filtros.de, filtros.ate);
  return { base, filtros, lojaFiltro, vendas, hoje };
}

export type DadosMetas = {
  base: BaseRede;
  ano: string;
  mes: string;
  metasFat: MetaFaturamento[];
  indicadores: IndicadorMes[];
  /** CMV do mês calculado das contagens semanais (por loja): tem prioridade sobre o lançado à mão. */
  cmvCalculado: IndicadorMes[];
  hoje: string;
};

export async function carregarMetasTela(ctx: RedeContexto, params: Params): Promise<DadosMetas> {
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const ids = base.lojas.map((l) => l.id);
  const ult = await ultimaVenda(ctx.db, ids);
  const f = lerFiltros(params, ult ? mesDe(ult) : mesDe(hoje));
  const [metasFat, indicadores, cmvCalculado] = await Promise.all([
    lerMetasFaturamento(ctx.db, ids, `${f.ano}-01-01`, `${f.ano}-12-31`),
    lerIndicadoresMes(ctx.db, ids, primeiroDiaDoMes(f.mes), ultimoDiaDoMes(f.mes)),
    lerIndicadoresCmv(ctx.db, ids, primeiroDiaDoMes(f.mes), ultimoDiaDoMes(f.mes)),
  ]);
  return { base, ano: f.ano, mes: f.mes, metasFat, indicadores, cmvCalculado, hoje };
}

/* ------------------------------------------------------------------ lojas e acessos */

export type AcessoLinha = {
  userId: string;
  nome: string;
  email: string;
  papel: Exclude<PapelRede, "administrador">;
  todasLojas: boolean;
  lojaIds: string[];
  modulos: string[];
  ativo: boolean;
};

export type MembroLinha = { userId: string; nome: string; email: string; papelTenant: string };

export type DadosGestao = { base: BaseRede; acessos: AcessoLinha[]; membros: MembroLinha[] };

export async function carregarGestao(ctx: RedeContexto): Promise<DadosGestao> {
  const base = await carregarBase(ctx);
  const [acessosRes, membros] = await Promise.all([ctx.db.from("rede_acessos").select("*").eq("tenant_id", ctx.tenant.id).order("created_at"), listMembers(ctx.tenant.id)]);
  if (acessosRes.error) throw new Error(acessosRes.error.message);
  const porUsuario = new Map(membros.map((m) => [m.userId, m] as const));
  const acessos = ((acessosRes.data ?? []) as Linha[]).map((r) => {
    const m = porUsuario.get(String(r.user_id));
    return {
      userId: String(r.user_id),
      nome: m?.profile.fullName ?? m?.profile.email ?? "Usuário",
      email: m?.profile.email ?? "",
      papel: r.papel as AcessoLinha["papel"],
      todasLojas: r.todas_lojas === true,
      lojaIds: Array.isArray(r.loja_ids) ? (r.loja_ids as string[]) : [],
      modulos: Array.isArray(r.modulos) ? (r.modulos as string[]) : [],
      ativo: r.status === "active",
    };
  });
  return {
    base,
    acessos,
    membros: membros
      .filter((m) => m.status === "active" && m.role !== "owner" && m.role !== "admin")
      .map((m) => ({ userId: m.userId, nome: m.profile.fullName ?? m.profile.email ?? "Sem nome", email: m.profile.email ?? "", papelTenant: m.role })),
  };
}
