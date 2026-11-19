import "server-only";

import type { RedeContexto } from "./acesso";
import { somarDias } from "./calculo";
import { carregarBase, hojeDoTenant, lerTudo, type BaseRede } from "./loader";
import { COLUNAS_PLANO, COLUNAS_VISITA, mapPlano, mapVisita } from "./mapeadores-qualidade";
import { podeVer } from "./permissoes";
import { FILTRO_VAZIO, ORIGENS_PLANO, SITUACOES_FILTRO, type FiltroPlanos } from "./planos";
import { ordenarVisitas, resumirRedeQualidade, type ResumoRedeQualidade } from "./qualidade";
import type { Loja, PlanoAcao, VisitaQualidade } from "./tipos";

type Params = Record<string, string | string[] | undefined>;
type Linha = Record<string, unknown>;

const um = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const lojaDoFiltro = (params: Params, lojas: Loja[]): Loja | null => {
  const slug = um(params.loja);
  return slug && /^[a-z0-9-]{1,60}$/.test(slug) ? (lojas.find((l) => l.slug === slug) ?? null) : null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quanto do passado a tela de qualidade carrega (visitas). Mais antigo que isso continua no banco. */
export const DIAS_QUALIDADE_NA_TELA = 730;
/** Planos concluídos ou cancelados há mais que isso saem da lista (os abertos e os a verificar ficam sempre). */
export const DIAS_PLANOS_FECHADOS_NA_TELA = 180;

/* ================================================================== checklist de qualidade */

export type DadosQualidade = {
  base: BaseRede;
  hoje: string;
  /** Lojas que a pessoa pode avaliar (operando ou em inauguração). */
  lojas: Loja[];
  lojaFiltro: Loja | null;
  /** Histórico (mais recente primeiro) das lojas do filtro. */
  visitas: VisitaQualidade[];
  /** Planos de ação nascidos das visitas listadas; null = o perfil não vê planos de ação. */
  planos: PlanoAcao[] | null;
  resumo: ResumoRedeQualidade;
  /** Visita pedida na URL (?visita=), para abrir já em edição. */
  abrir: VisitaQualidade | null;
  /** Há planos de ação criáveis por este perfil (decide se a visita com desvios pode ser salva). */
  podeGerarPlanos: boolean;
};

export async function carregarQualidadeTela(ctx: RedeContexto, params: Params): Promise<DadosQualidade> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const visiveis = base.lojas.filter((l) => l.status !== "inativa");
  const lojaFiltro = lojaDoFiltro(params, visiveis);
  const lojas = lojaFiltro ? [lojaFiltro] : visiveis;
  const ids = lojas.map((l) => l.id);
  const idsTodas = base.lojas.map((l) => l.id);

  const pedida = um(params.visita);
  const [linhas, pedidaRes] = await Promise.all([
    ids.length > 0
      ? lerTudo((a, b) =>
          db
            .from("rede_qualidade_visitas")
            .select(COLUNAS_VISITA)
            .in("loja_id", ids)
            .gte("data", somarDias(hoje, -DIAS_QUALIDADE_NA_TELA))
            .order("data", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id")
            .range(a, b),
        )
      : Promise.resolve([] as Linha[]),
    pedida && UUID.test(pedida) ? db.from("rede_qualidade_visitas").select(COLUNAS_VISITA).eq("id", pedida).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const visitas = ordenarVisitas(linhas.map(mapVisita));
  let abrir: VisitaQualidade | null = null;
  if (pedidaRes && !pedidaRes.error && pedidaRes.data) {
    const v = mapVisita(pedidaRes.data as Linha);
    // Só abre visita de loja que a pessoa enxerga (o banco já barra; a conferência deixa a regra explícita).
    if (idsTodas.includes(v.lojaId)) abrir = v;
  }

  const verPlanos = podeVer(perfil, "planos_acao");
  const idsDosPlanos = [...new Set([...ids, ...(abrir ? [abrir.lojaId] : [])])];
  const linhasPlanos =
    verPlanos && idsDosPlanos.length > 0
      ? await lerTudo((a, b) =>
          db
            .from("rede_planos_acao")
            .select(COLUNAS_PLANO)
            .eq("origem_tipo", "qualidade")
            .in("loja_id", idsDosPlanos)
            .order("created_at", { ascending: false })
            .order("id")
            .range(a, b),
        )
      : [];

  return {
    base,
    hoje,
    lojas: visiveis,
    lojaFiltro,
    visitas,
    planos: verPlanos ? linhasPlanos.map(mapPlano) : null,
    resumo: resumirRedeQualidade(visitas, ids, hoje),
    abrir,
    podeGerarPlanos: verPlanos && perfil?.modulos.planos_acao?.editar === true,
  };
}

/* ================================================================== planos de ação */

export type DadosPlanos = {
  base: BaseRede;
  hoje: string;
  /** Lojas onde se pode criar plano (operando ou em inauguração). */
  lojas: Loja[];
  /** Planos abertos, a verificar e os fechados nos últimos 180 dias (todas as lojas do acesso). */
  planos: PlanoAcao[];
  /** Filtro inicial vindo da URL (links dos checklists). */
  filtro: FiltroPlanos;
  /** Abrir já em edição (?plano=). */
  abrirId: string | null;
  /** Pré-preenchimento do formulário de novo plano (?novo=indicador). */
  novo: { origemTipo: "manual" | "indicador"; lojaId: string | null; descricao: string; origemRotulo: string } | null;
  /** Só administrador e consultor leem o histórico de alterações. */
  podeVerHistorico: boolean;
  /** Papéis que verificam a conclusão (quem acompanha a loja de fora). */
  podeVerificar: boolean;
};

const SITUACOES = new Set(SITUACOES_FILTRO.map((s) => s.v));
const ORIGENS = new Set(ORIGENS_PLANO.map((o) => o.v));

export async function carregarPlanosTela(ctx: RedeContexto, params: Params): Promise<DadosPlanos> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const visiveis = base.lojas.filter((l) => l.status !== "inativa");
  const ids = base.lojas.map((l) => l.id);
  const corte = somarDias(hoje, -DIAS_PLANOS_FECHADOS_NA_TELA);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lerPlanos = (filtrar: (q: any) => any) =>
    lerTudo((a, b) => filtrar(db.from("rede_planos_acao").select(COLUNAS_PLANO).in("loja_id", ids)).order("created_at", { ascending: false }).order("id").range(a, b));

  // Três leituras (e não um "ou" no filtro): abertos, fechados recentes e concluídos ainda sem verificação.
  const [abertos, recentes, aVerificar] =
    ids.length > 0
      ? await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lerPlanos((q: any) => q.in("status", ["pendente", "em_andamento"])),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lerPlanos((q: any) => q.in("status", ["concluido", "cancelado"]).gte("updated_at", `${corte}T00:00:00Z`)),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lerPlanos((q: any) => q.eq("status", "concluido").is("verificado_em", null)),
        ])
      : [[], [], []];

  const porId = new Map<string, PlanoAcao>();
  for (const l of [...abertos, ...recentes, ...aVerificar]) {
    const p = mapPlano(l);
    porId.set(p.id, p);
  }

  const sit = um(params.situacao);
  const ori = um(params.origem);
  const pri = um(params.prioridade);
  const lojaFiltro = lojaDoFiltro(params, base.lojas);
  const registro = um(params.registro);
  const novoTipo = um(params.novo);
  const rotuloNovo = (um(params.indicador) ?? "").slice(0, 200);
  const descNovo = (um(params.descricao) ?? "").slice(0, 500);
  const abrirId = um(params.plano);

  return {
    base,
    hoje,
    lojas: visiveis,
    planos: [...porId.values()],
    filtro: {
      ...FILTRO_VAZIO,
      loja: lojaFiltro?.id ?? null,
      situacao: sit && SITUACOES.has(sit as never) ? (sit as FiltroPlanos["situacao"]) : FILTRO_VAZIO.situacao,
      origem: ori && ORIGENS.has(ori as never) ? (ori as FiltroPlanos["origem"]) : "todas",
      prioridade: pri === "alta" || pri === "media" || pri === "baixa" ? pri : "todas",
      texto: (um(params.q) ?? "").slice(0, 120),
      origemId: registro && UUID.test(registro) ? registro : null,
    },
    abrirId: abrirId && UUID.test(abrirId) ? abrirId : null,
    novo:
      novoTipo === "manual" || novoTipo === "indicador"
        ? { origemTipo: novoTipo, lojaId: lojaDoFiltro(params, visiveis)?.id ?? null, descricao: descNovo, origemRotulo: rotuloNovo }
        : null,
    podeVerHistorico: perfil?.papel === "administrador" || perfil?.papel === "consultor",
    podeVerificar: perfil?.papel === "administrador" || perfil?.papel === "consultor" || perfil?.papel === "gerente_regional",
  };
}
