import "server-only";

import type { RedeContexto } from "./acesso";
import { resolverMeta, somarDias } from "./calculo";
import { LINHAS_NO_HISTORICO, META_RUPTURAS_SEMANA, resumirEstoque, resumirRupturas, rupturasPorProduto, type ResumoEstoque, type ResumoRupturas } from "./cozinha";
import { segundaDaSemana } from "./financeiro";
import { carregarBase, hojeDoTenant, lerTudo, type BaseRede } from "./loader";
import { mapProduto, mapRegistroDelivery, mapRuptura } from "./mapeadores-cozinha";
import { podeEditar, podeVer } from "./permissoes";
import type { Loja, ProdutoCC, RegistroDelivery, Ruptura } from "./tipos";

type Params = Record<string, string | string[] | undefined>;
type Linha = Record<string, unknown>;

const um = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const lojaDoFiltro = (params: Params, lojas: Loja[]): Loja | null => {
  const slug = um(params.loja);
  return slug && /^[a-z0-9-]{1,60}$/.test(slug) ? (lojas.find((l) => l.slug === slug) ?? null) : null;
};

/** Quanto do passado a tela carrega (rupturas e checklists). Mais antigo que isso continua no banco. */
export const DIAS_RUPTURAS_NA_TELA = 730;
export const DIAS_DELIVERY_NA_TELA = 400;

/* ================================================================== cozinha central */

export type AbaCozinha = "rupturas" | "estoque";

export type DadosCozinha = {
  base: BaseRede;
  hoje: string;
  /** Lojas que entram na tela (operando ou em inauguração, dentro do acesso e do filtro). */
  lojas: Loja[];
  lojaFiltro: Loja | null;
  /** Abas que o perfil pode abrir, na ordem do painel original. */
  abas: AbaCozinha[];
  aba: AbaCozinha;
  /** Rupturas (mais recentes primeiro) das lojas do filtro. */
  rupturas: Ruptura[];
  resumo: ResumoRupturas;
  /** Meta semanal de rupturas de cada loja (a da loja, a da rede ou 5 do painel original). */
  metaPorLoja: Record<string, number>;
  metaPadrao: number;
  produtos: ProdutoCC[];
  estoque: ResumoEstoque;
  /** Rupturas de cada produto do estoque nas semanas mostradas (id do produto → quantidade). */
  rupturasPorProduto: Record<string, number>;
};

export async function carregarCozinhaTela(ctx: RedeContexto, params: Params): Promise<DadosCozinha> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const verRupturas = podeVer(perfil, "rupturas");
  const verEstoque = podeVer(perfil, "estoque_cc");
  const abas: AbaCozinha[] = [...(verRupturas ? (["rupturas"] as const) : []), ...(verEstoque ? (["estoque"] as const) : [])];
  const pedida = um(params.aba);
  const aba: AbaCozinha = abas.find((a) => a === pedida) ?? abas[0] ?? "rupturas";

  const visiveis = base.lojas.filter((l) => l.status !== "inativa");
  const lojaFiltro = lojaDoFiltro(params, visiveis);
  const lojas = lojaFiltro ? [lojaFiltro] : visiveis;
  const todasIds = visiveis.map((l) => l.id);

  const [linhasRup, linhasProd] = await Promise.all([
    verRupturas && todasIds.length > 0
      ? lerTudo((a, b) =>
          db
            .from("rede_rupturas")
            .select("id,loja_id,data,item,motivo,horas,acao,origem")
            .in("loja_id", todasIds)
            .gte("data", somarDias(hoje, -DIAS_RUPTURAS_NA_TELA))
            .order("data", { ascending: false })
            .order("id", { ascending: false })
            .range(a, b),
        )
      : Promise.resolve([] as Linha[]),
    verEstoque
      ? lerTudo((a, b) =>
          db
            .from("rede_cc_estoque")
            .select("id,item,unidade,atual,minimo,consumo_dia,custo_unitario,origem")
            .eq("tenant_id", ctx.tenant.id)
            .order("item")
            .order("id")
            .range(a, b),
        )
      : Promise.resolve([] as Linha[]),
  ]);

  const todasRupturas = linhasRup.map(mapRuptura);
  const idsDoFiltro = new Set(lojas.map((l) => l.id));
  const rupturas = todasRupturas.filter((r) => idsDoFiltro.has(r.lojaId));
  const produtos = linhasProd.map(mapProduto);

  const metaPadrao = resolverMeta(base.metas, null, "rupturas", hoje).meta ?? META_RUPTURAS_SEMANA;
  const metaPorLoja: Record<string, number> = {};
  for (const l of visiveis) metaPorLoja[l.id] = resolverMeta(base.metas, l.id, "rupturas", hoje).meta ?? metaPadrao;

  const resumo = resumirRupturas({ rupturas, lojasOrdem: lojas.map((l) => l.id), metaPadrao, metas: metaPorLoja });
  // A coluna "rupturas" do estoque conta as da rede toda que o perfil enxerga (o estoque não tem filtro de loja).
  const porProduto = rupturasPorProduto(todasRupturas, produtos, resumirRupturas({ rupturas: todasRupturas, lojasOrdem: [] }).semanas);
  const rupturasDoProduto: Record<string, number> = {};
  for (const [id, n] of porProduto) rupturasDoProduto[id] = n;

  return { base, hoje, lojas, lojaFiltro, abas, aba, rupturas, resumo, metaPorLoja, metaPadrao, produtos, estoque: resumirEstoque(produtos), rupturasPorProduto: rupturasDoProduto };
}

/* ================================================================== checklist de delivery */

export type DadosDelivery = {
  base: BaseRede;
  hoje: string;
  lojas: Loja[];
  lojaFiltro: Loja | null;
  /** Histórico (mais recente primeiro) das lojas do filtro. */
  registros: RegistroDelivery[];
  /** Há mais registros no período carregado do que a tabela mostra. */
  truncado: boolean;
  /** Rupturas registradas na cozinha central por loja e semana ("lojaId|segunda-feira" → quantidade). */
  rupturasPorSemana: Record<string, number>;
  /** Planos de ação de cada checklist (id do registro → total e abertos); null = o perfil não vê planos de ação. */
  planosPorRegistro: Record<string, { total: number; abertos: number }> | null;
  /** O perfil pode criar planos de ação a partir dos desvios do checklist. */
  podeGerarPlanos: boolean;
};

export async function carregarDeliveryTela(ctx: RedeContexto, params: Params): Promise<DadosDelivery> {
  const { db, perfil } = ctx;
  const hoje = hojeDoTenant();
  const base = await carregarBase(ctx);
  const visiveis = base.lojas.filter((l) => l.status !== "inativa");
  const lojaFiltro = lojaDoFiltro(params, visiveis);
  const lojas = lojaFiltro ? [lojaFiltro] : visiveis;
  const ids = lojas.map((l) => l.id);
  const idsTodas = visiveis.map((l) => l.id);

  const verPlanos = podeVer(perfil, "planos_acao");
  const [linhas, linhasRup, linhasPlanos] = await Promise.all([
    ids.length > 0
      ? lerTudo((a, b) =>
          db
            .from("rede_delivery_registros")
            .select("*")
            .in("loja_id", ids)
            .gte("data", somarDias(hoje, -DIAS_DELIVERY_NA_TELA))
            .order("data", { ascending: false })
            .order("periodo")
            .order("id")
            .range(a, b),
        )
      : Promise.resolve([] as Linha[]),
    podeVer(perfil, "rupturas") && idsTodas.length > 0
      ? lerTudo((a, b) =>
          db
            .from("rede_rupturas")
            .select("loja_id,data")
            .in("loja_id", idsTodas)
            .gte("data", somarDias(hoje, -60))
            .order("data")
            .order("id")
            .range(a, b),
        )
      : Promise.resolve([] as Linha[]),
    verPlanos && ids.length > 0
      ? lerTudo((a, b) => db.from("rede_planos_acao").select("origem_id,status").eq("origem_tipo", "delivery").in("loja_id", ids).not("origem_id", "is", null).order("id").range(a, b))
      : Promise.resolve([] as Linha[]),
  ]);

  const registros = linhas.map(mapRegistroDelivery);
  const planosPorRegistro: Record<string, { total: number; abertos: number }> | null = verPlanos ? {} : null;
  if (planosPorRegistro) {
    for (const l of linhasPlanos) {
      const k = String(l.origem_id);
      const x = (planosPorRegistro[k] ??= { total: 0, abertos: 0 });
      x.total++;
      if (l.status === "pendente" || l.status === "em_andamento") x.abertos++;
    }
  }
  const rupturasPorSemana: Record<string, number> = {};
  for (const r of linhasRup) {
    const k = `${String(r.loja_id)}|${segundaDaSemana(String(r.data).slice(0, 10))}`;
    rupturasPorSemana[k] = (rupturasPorSemana[k] ?? 0) + 1;
  }

  return {
    base,
    hoje,
    lojas,
    lojaFiltro,
    registros,
    truncado: registros.length > LINHAS_NO_HISTORICO,
    rupturasPorSemana,
    planosPorRegistro,
    podeGerarPlanos: verPlanos && podeEditar(perfil, "planos_acao"),
  };
}
