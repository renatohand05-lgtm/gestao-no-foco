import "server-only";

import type { RedeContexto } from "./acesso";
import { mesDe, primeiroDiaDoMes, somarDias } from "./calculo";
import { carregarBase, hojeDoTenant, lerTudo, type BaseRede } from "./loader";
import { COLUNAS_COLAB, COLUNAS_MES, COLUNAS_OCORRENCIA, COLUNAS_PREVISTO, mapColaborador, mapMes, mapOcorrencia, mapPrevisto } from "./mapeadores-rh";
import { podeEditar, podeVer } from "./permissoes";
import { ordenarOcorrencias } from "./rh";
import type { ColaboradorRh, Loja, MesRh, OcorrenciaRh, PrevistoRh } from "./tipos";

type Params = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const lojaDoFiltro = (params: Params, lojas: Loja[]): Loja | null => {
  const slug = um(params.loja);
  return slug && /^[a-z0-9-]{1,60}$/.test(slug) ? (lojas.find((l) => l.slug === slug) ?? null) : null;
};

/** Quanto do passado as telas de RH carregam (ocorrências e lançamentos mensais). O que é mais antigo continua no banco. */
export const DIAS_RH_NA_TELA = 1100;

export type AbaRh = "quadro" | "movimentos" | "ocorrencias";

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
  edita: { quadro: boolean; movimentos: boolean; ocorrencias: boolean };
};

export async function carregarRhTela(ctx: RedeContexto, params: Params): Promise<DadosRh> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const lojas = base.lojas.filter((l) => l.status !== "inativa");
  const lojaFiltro = lojaDoFiltro(params, lojas);
  const ids = (lojaFiltro ? [lojaFiltro] : lojas).map((l) => l.id);

  const verQuadro = podeVer(perfil, "rh_quadro");
  const verMov = podeVer(perfil, "rh_movimentos");
  const verOco = podeVer(perfil, "rh_ocorrencias");
  const abas: AbaRh[] = [...(verQuadro ? (["quadro"] as const) : []), ...(verMov ? (["movimentos"] as const) : []), ...(verOco ? (["ocorrencias"] as const) : [])];
  const pedida = um(params.aba);
  const aba: AbaRh = abas.find((a) => a === pedida) ?? abas[0] ?? "quadro";

  const desde = somarDias(hoje, -DIAS_RH_NA_TELA);
  const vazio = ids.length === 0;
  const [colabs, previstos, mensais, ocorrencias] = await Promise.all([
    // O cadastro serve às três abas (quadro, sugestão do lançamento mensal e nome nas ocorrências).
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
  ]);

  return {
    base,
    hoje,
    mesAtual: mesDe(hoje),
    abas,
    aba,
    lojas,
    lojaFiltro,
    colaboradores: verQuadro ? (colabs ?? []).map(mapColaborador) : null,
    previstos: (previstos ?? []).map(mapPrevisto),
    mensais: verMov ? (mensais ?? []).map(mapMes) : null,
    ocorrencias: verOco && aba === "ocorrencias" ? ordenarOcorrencias((ocorrencias ?? []).map(mapOcorrencia)) : null,
    edita: { quadro: podeEditar(perfil, "rh_quadro"), movimentos: podeEditar(perfil, "rh_movimentos"), ocorrencias: podeEditar(perfil, "rh_ocorrencias") },
  };
}
