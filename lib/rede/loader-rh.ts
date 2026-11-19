import "server-only";

import type { RedeContexto } from "./acesso";
import { mesDe, primeiroDiaDoMes, somarDias, ultimoDiaDoMes } from "./calculo";
import { mesclarIndicadores } from "./financeiro";
import { evolucaoDosGerentes, avaliarGerentesDoMes, mesesDaEvolucao, mesesDoSeletor, resumirGerentes, type EntradaGerentes, type LinhaGerente, type PontoEvolucao, type ResumoGerentes } from "./gerentes";
import {
  carregarBase,
  hojeDoTenant,
  lerIndicadoresCalculados,
  lerIndicadoresMes,
  lerMetasFaturamento,
  lerTudo,
  lerVendas,
  ultimaVenda,
  type BaseRede,
} from "./loader";
import { COLUNAS_VISITA, mapVisita } from "./mapeadores-qualidade";
import { COLUNAS_COLAB, COLUNAS_MES, COLUNAS_OCORRENCIA, COLUNAS_PREVISTO, mapColaborador, mapMes, mapOcorrencia, mapPrevisto } from "./mapeadores-rh";
import { COLUNAS_CRITERIO, COLUNAS_LIDERANCA, COLUNAS_NINEBOX, mapCriterioCargo, mapLideranca, mapNineBox } from "./mapeadores-talentos";
import { podeEditar, podeVer } from "./permissoes";
import { ordenarOcorrencias } from "./rh";
import type { ColaboradorRh, CriterioCargo, LiderancaRh, Loja, MesRh, NineBoxRh, OcorrenciaRh, PrevistoRh } from "./tipos";

type Params = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const lojaDoFiltro = (params: Params, lojas: Loja[]): Loja | null => {
  const slug = um(params.loja);
  return slug && /^[a-z0-9-]{1,60}$/.test(slug) ? (lojas.find((l) => l.slug === slug) ?? null) : null;
};

/** Quanto do passado as telas de RH carregam (ocorrências e lançamentos mensais). O que é mais antigo continua no banco. */
export const DIAS_RH_NA_TELA = 1100;
/** A visita de qualidade mais recente de cada loja vale para a nota do gerente; lê-se até este passado. */
export const DIAS_QUALIDADE_PARA_GERENTES = 730;

export type AbaRh = "quadro" | "movimentos" | "ocorrencias" | "gerentes" | "ninebox" | "sucessao";

export type DadosGerentes = {
  /** AAAA-MM avaliado. */
  mes: string;
  /** Meses que o seletor oferece (do mais recente ao mais antigo). */
  mesesSeletor: string[];
  /** Meses do gráfico de evolução (do mais antigo ao mais recente). */
  mesesEvolucao: string[];
  linhas: LinhaGerente[];
  evolucao: PontoEvolucao[];
  resumo: ResumoGerentes;
  /** Fontes que o perfil não enxerga (o critério correspondente fica de fora do score). */
  semAcesso: string[];
};

export type DadosRh = {
  base: BaseRede;
  hoje: string;
  /** AAAA-MM do mês de hoje (o lançamento mensal não pode ser de mês futuro). */
  mesAtual: string;
  abas: AbaRh[];
  aba: AbaRh;
  /** Lojas que aparecem na tela (operando ou em inauguração). */
  lojas: Loja[];
  lojaFiltro: Loja | null;
  /** Cadastro (ativos e desligados) das lojas do filtro; null = o perfil não vê o quadro de pessoal. */
  colaboradores: ColaboradorRh[] | null;
  previstos: PrevistoRh[];
  /** Lançamentos mensais; null = o perfil não vê turnover e absenteísmo. */
  mensais: MesRh[] | null;
  /** Ocorrências (mais recente primeiro); null = o perfil não vê ocorrências ou a aba não está aberta. */
  ocorrencias: OcorrenciaRh[] | null;
  /** Avaliações do Nine Box das lojas do filtro; null = o perfil não vê o Nine Box (ou a aba aberta não o usa). */
  ninebox: NineBoxRh[] | null;
  /** Critérios por cargo ajustados pela empresa (o que não está aqui usa o padrão do painel original). */
  criterios: CriterioCargo[];
  gerentes: DadosGerentes | null;
  edita: { quadro: boolean; movimentos: boolean; ocorrencias: boolean; gerentes: boolean; ninebox: boolean; sucessao: boolean };
  /** Só administrador e consultor leem o histórico de alterações. */
  vePorHistorico: boolean;
};

export async function carregarRhTela(ctx: RedeContexto, params: Params): Promise<DadosRh> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const lojas = base.lojas.filter((l) => l.status !== "inativa");
  const lojaFiltro = lojaDoFiltro(params, lojas);
  const lojasDaTela = lojaFiltro ? [lojaFiltro] : lojas;
  const ids = lojasDaTela.map((l) => l.id);

  const verQuadro = podeVer(perfil, "rh_quadro");
  const verMov = podeVer(perfil, "rh_movimentos");
  const verOco = podeVer(perfil, "rh_ocorrencias");
  // Gerentes, Nine Box e Sucessão mostram nomes e cargos: precisam também do cadastro de pessoal. A sucessão lê as notas do Nine Box.
  const verNine = podeVer(perfil, "nine_box") && verQuadro;
  const verGer = podeVer(perfil, "avaliacao_gerentes") && verQuadro;
  const verSuc = podeVer(perfil, "sucessao") && verNine;
  const abas: AbaRh[] = [
    ...(verQuadro ? (["quadro"] as const) : []),
    ...(verMov ? (["movimentos"] as const) : []),
    ...(verOco ? (["ocorrencias"] as const) : []),
    ...(verGer ? (["gerentes"] as const) : []),
    ...(verNine ? (["ninebox"] as const) : []),
    ...(verSuc ? (["sucessao"] as const) : []),
  ];
  const pedida = um(params.aba);
  const aba: AbaRh = abas.find((a) => a === pedida) ?? abas[0] ?? "quadro";

  const desde = somarDias(hoje, -DIAS_RH_NA_TELA);
  const vazio = ids.length === 0;
  // As avaliações só carregam onde a aba aberta as usa E o perfil pode abrir essa aba (nunca "de brinde").
  const precisaNine = podeVer(perfil, "nine_box") && ((aba === "quadro" && verQuadro) || (aba === "ninebox" && verNine) || (aba === "sucessao" && verSuc) || (aba === "gerentes" && verGer));
  const [colabs, previstos, mensais, ocorrencias, nineLido, criteriosLidos] = await Promise.all([
    // O cadastro serve a todas as abas (quadro, sugestão do lançamento mensal, nome nas ocorrências e nos talentos).
    verQuadro && !vazio
      ? lerTudo((a, b) => db.from("rede_rh_colaboradores").select(COLUNAS_COLAB).in("loja_id", ids).order("nome").order("id").range(a, b))
      : Promise.resolve(null),
    verQuadro && aba === "quadro" && !vazio
      ? lerTudo((a, b) => db.from("rede_rh_quadro_previsto").select(COLUNAS_PREVISTO).in("loja_id", ids).order("loja_id").order("cargo").range(a, b))
      : Promise.resolve([]),
    // Os lançamentos também alimentam os KPIs de turnover e absenteísmo do quadro.
    verMov && (aba === "movimentos" || aba === "quadro") && !vazio
      ? lerTudo((a, b) =>
          db.from("rede_rh_mensal").select(COLUNAS_MES).in("loja_id", ids).gte("mes", primeiroDiaDoMes(mesDe(desde))).order("mes", { ascending: false }).order("loja_id").range(a, b),
        )
      : Promise.resolve(null),
    verOco && aba === "ocorrencias" && !vazio
      ? lerTudo((a, b) =>
          db.from("rede_rh_ocorrencias").select(COLUNAS_OCORRENCIA).in("loja_id", ids).gte("data", desde).order("data", { ascending: false }).order("id").range(a, b),
        )
      : Promise.resolve(null),
    precisaNine && !vazio
      ? lerTudo((a, b) => db.from("rede_rh_ninebox").select(COLUNAS_NINEBOX).in("loja_id", ids).order("colaborador_id").range(a, b))
      : Promise.resolve(null),
    verSuc && aba === "sucessao"
      ? lerTudo((a, b) => db.from("rede_rh_criterios_cargo").select(COLUNAS_CRITERIO).eq("tenant_id", ctx.tenant.id).order("cargo").range(a, b))
      : Promise.resolve([]),
  ]);

  const colaboradores = verQuadro ? (colabs ?? []).map(mapColaborador) : null;
  const ninebox = precisaNine ? (nineLido ?? []).map(mapNineBox).filter((x): x is NineBoxRh => x != null) : null;
  const criterios = (criteriosLidos ?? []).map(mapCriterioCargo).filter((x): x is CriterioCargo => x != null);
  const gerentes = verGer && aba === "gerentes" ? await carregarGerentes(ctx, params, base, lojasDaTela, colaboradores ?? [], ninebox ?? [], hoje) : null;

  return {
    base,
    hoje,
    mesAtual: mesDe(hoje),
    abas,
    aba,
    lojas,
    lojaFiltro,
    colaboradores,
    previstos: (previstos ?? []).map(mapPrevisto),
    mensais: verMov ? (mensais ?? []).map(mapMes) : null,
    ocorrencias: verOco && aba === "ocorrencias" ? ordenarOcorrencias((ocorrencias ?? []).map(mapOcorrencia)) : null,
    ninebox,
    criterios,
    gerentes,
    edita: {
      quadro: podeEditar(perfil, "rh_quadro"),
      movimentos: podeEditar(perfil, "rh_movimentos"),
      ocorrencias: podeEditar(perfil, "rh_ocorrencias"),
      gerentes: podeEditar(perfil, "avaliacao_gerentes"),
      ninebox: podeEditar(perfil, "nine_box"),
      sucessao: podeEditar(perfil, "sucessao"),
    },
    vePorHistorico: perfil?.papel === "administrador" || perfil?.papel === "consultor",
  };
}

/* ------------------------------------------------------------------ avaliação de gerentes */

async function carregarGerentes(ctx: RedeContexto, params: Params, base: BaseRede, lojas: Loja[], colaboradores: ColaboradorRh[], ninebox: NineBoxRh[], hoje: string): Promise<DadosGerentes> {
  const { db, perfil } = ctx;
  const ids = lojas.map((l) => l.id);
  const mesesSeletor = mesesDoSeletor(hoje);
  const pedido = um(params.mes);
  let mes = pedido && mesesSeletor.includes(pedido) ? pedido : null;
  if (!mes) {
    const ult = podeVer(perfil, "vendas") ? await ultimaVenda(db, ids) : null;
    mes = ult && mesesSeletor.includes(mesDe(ult)) ? mesDe(ult) : mesDe(hoje);
  }
  const mesesEvolucao = mesesDaEvolucao(mes);
  const de = primeiroDiaDoMes(mesesEvolucao[0]);
  const ate = ultimoDiaDoMes(mes);

  const fontes = { vendas: podeVer(perfil, "vendas"), metas: podeVer(perfil, "metas"), qualidade: podeVer(perfil, "qualidade") };
  const semAcesso = [...(fontes.vendas ? [] : ["vendas"]), ...(fontes.metas ? [] : ["metas e indicadores"]), ...(fontes.qualidade ? [] : ["qualidade"])];
  const vazio = ids.length === 0;

  const [vendas, metasFat, lancados, calculados, visitas, liderancaLida] = await Promise.all([
    fontes.vendas && !vazio ? lerVendas(db, ids, de, ate) : Promise.resolve([]),
    fontes.metas && !vazio ? lerMetasFaturamento(db, ids, de, ate) : Promise.resolve([]),
    fontes.metas && !vazio ? lerIndicadoresMes(db, ids, de, ate) : Promise.resolve([]),
    fontes.metas && !vazio ? lerIndicadoresCalculados(db, ids, de, ate, hoje) : Promise.resolve([]),
    fontes.qualidade && !vazio
      ? lerTudo((a, b) =>
          db
            .from("rede_qualidade_visitas")
            .select(COLUNAS_VISITA)
            .in("loja_id", ids)
            .gte("data", somarDias(hoje, -DIAS_QUALIDADE_PARA_GERENTES))
            .lte("data", ate)
            .order("data", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id")
            .range(a, b),
        )
      : Promise.resolve([]),
    vazio
      ? Promise.resolve([])
      : lerTudo((a, b) => db.from("rede_rh_lideranca").select(COLUNAS_LIDERANCA).in("loja_id", ids).gte("mes", de).lte("mes", primeiroDiaDoMes(mes)).order("mes").order("id").range(a, b)),
  ]);

  const entrada: EntradaGerentes = {
    lojas,
    config: base.config,
    metas: base.metas,
    metasFat,
    indicadores: mesclarIndicadores(lancados, calculados),
    vendas,
    visitas: visitas.map(mapVisita),
    colaboradores,
    lideranca: liderancaLida.map(mapLideranca).filter((x): x is LiderancaRh => x != null),
    ninebox,
    hoje,
    fontes,
  };
  const linhas = avaliarGerentesDoMes(entrada, mes);
  return { mes, mesesSeletor, mesesEvolucao, linhas, evolucao: evolucaoDosGerentes(entrada, mesesEvolucao), resumo: resumirGerentes(linhas), semAcesso };
}
