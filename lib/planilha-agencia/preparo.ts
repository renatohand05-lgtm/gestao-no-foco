/**
 * Monta o "preparo" da importação: junta a análise da planilha, as escolhas do usuário e o que já
 * existe no banco, e devolve exatamente o que será criado/atualizado. É o mesmo cálculo usado na
 * prévia e na hora de gravar — por isso o que a pessoa vê é o que acontece.
 * Função pura (o banco é lido antes e passado em `existentes`).
 */
import { sugerirOpcoes } from "./analisar.ts";
import { classificarCategoria, type ClassificacaoDre, type SugestaoPorNome } from "./categorias.ts";
import {
  aplicarMesesDosBlocos,
  juntarItens,
  planejarClientes,
  planejarLancamentos,
} from "./plano.ts";
import { sem } from "./texto.ts";
import type {
  AnalisePlanilha,
  ClienteExistente,
  ClientePlanilha,
  ItemDre,
  LancamentoExistente,
  LayoutDre,
  OpcoesImportacao,
  PlanoCliente,
  PlanoLancamento,
  PlanoMes,
  TipoLancamento,
} from "./tipos.ts";

export type CategoriaExistente = {
  id: string;
  nome: string;
  tipo: string;
  dre_linha: string | null;
};

export type Existentes = {
  clientes: ClienteExistente[];
  lancamentos: LancamentoExistente[];
  categorias: CategoriaExistente[];
};

export type CategoriaPlanejada = {
  tipo: TipoLancamento;
  nome: string;
  /** `null` quando a categoria já existe no portal. */
  nova: ClassificacaoDre | null;
  existenteId: string | null;
};

export type Preparo = {
  opcoes: OpcoesImportacao;
  layout: LayoutDre | null;
  /** Clientes escolhidos, já conciliados com o que existe. */
  planoClientes: PlanoCliente[];
  /** Todos os itens da DRE (com os meses já corrigidos), de todos os meses do layout. */
  itens: ItemDre[];
  planoLancamentos: PlanoLancamento[];
  planoMeses: PlanoMes[];
  categorias: CategoriaPlanejada[];
};

export function juntarOpcoes(
  analise: AnalisePlanilha,
  pedidas: Partial<OpcoesImportacao> | undefined,
): OpcoesImportacao {
  const base = sugerirOpcoes(analise);
  const layoutDre = pedidas?.layoutDre === undefined ? base.layoutDre : pedidas.layoutDre;
  const mesesDosBlocos = pedidas?.mesesDosBlocos ?? base.mesesDosBlocos;
  const layout = analise.dre.find((l) => l.id === layoutDre) ?? null;
  const parcial: OpcoesImportacao = {
    abasClientes: pedidas?.abasClientes ?? base.abasClientes,
    layoutDre,
    mesesDre: [],
    mesesDosBlocos,
    mesesSobrepostos: pedidas?.mesesSobrepostos ?? base.mesesSobrepostos,
  };
  // Sem escolha explícita, importa todos os meses do layout (já com os meses corrigidos).
  parcial.mesesDre =
    pedidas?.mesesDre ??
    [...new Set(itensDoLayout(layout, parcial).map((i) => i.mes))].sort();
  return parcial;
}

/** Itens da DRE do layout escolhido, com os meses dos blocos corrigidos pelo usuário. */
export function itensDoLayout(layout: LayoutDre | null, opcoes: OpcoesImportacao): ItemDre[] {
  if (!layout) return [];
  return juntarItens(aplicarMesesDosBlocos(layout.itens, opcoes.mesesDosBlocos));
}

/** Menor e maior mês da DRE escolhida — usado para consultar só esse intervalo no banco. */
export function intervaloDeMeses(itens: ItemDre[]): { de: string; ate: string } | null {
  if (!itens.length) return null;
  const meses = itens.map((i) => i.mes).sort();
  return { de: meses[0], ate: meses[meses.length - 1] };
}

export function clientesEscolhidos(
  analise: AnalisePlanilha,
  opcoes: OpcoesImportacao,
): ClientePlanilha[] {
  const vistos = new Set<string>();
  const out: ClientePlanilha[] = [];
  for (const aba of opcoes.abasClientes) {
    const tabela = analise.clientes.find((t) => t.aba === aba);
    if (!tabela) continue;
    for (const c of tabela.clientes) {
      if (vistos.has(c.chave)) continue;
      vistos.add(c.chave);
      out.push(c);
    }
  }
  return out;
}

export function planejarCategorias(
  itens: ItemDre[],
  existentes: CategoriaExistente[],
  sugerir: SugestaoPorNome,
): CategoriaPlanejada[] {
  const porNome = new Map<string, CategoriaExistente[]>();
  for (const c of existentes) {
    const k = sem(c.nome);
    porNome.set(k, [...(porNome.get(k) ?? []), c]);
  }
  const vistos = new Set<string>();
  const out: CategoriaPlanejada[] = [];
  for (const it of itens) {
    const k = `${it.tipo}|${sem(it.rotulo)}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    const achada = (porNome.get(sem(it.rotulo)) ?? []).find(
      (c) => c.tipo === it.tipo || c.tipo === "ambos",
    );
    out.push({
      tipo: it.tipo,
      nome: it.rotulo,
      nova: achada ? null : classificarCategoria(it.rotulo, it.tipo, sugerir),
      existenteId: achada?.id ?? null,
    });
  }
  return out;
}

export function montarPreparo(args: {
  analise: AnalisePlanilha;
  opcoes: OpcoesImportacao;
  existentes: Existentes;
  sugerir: SugestaoPorNome;
}): Preparo {
  const { analise, opcoes, existentes, sugerir } = args;
  const layout = analise.dre.find((l) => l.id === opcoes.layoutDre) ?? null;
  const itens = itensDoLayout(layout, opcoes);

  const planoClientes = planejarClientes(clientesEscolhidos(analise, opcoes), existentes.clientes);
  const { lancamentos, meses } = planejarLancamentos(
    itens,
    existentes.lancamentos,
    opcoes.mesesSobrepostos,
  );

  // Só vale o que o usuário marcou e que não está "ocupado" (já tem lançamentos de outra origem).
  const escolhidos = new Set(opcoes.mesesDre);
  const lancamentosEscolhidos = lancamentos.filter((l) => escolhidos.has(l.item.mes));
  const itensEscolhidos = lancamentosEscolhidos.map((l) => l.item);

  return {
    opcoes,
    layout,
    planoClientes,
    itens,
    planoLancamentos: lancamentosEscolhidos,
    planoMeses: meses,
    categorias: planejarCategorias(itensEscolhidos, existentes.categorias, sugerir),
  };
}

const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

function listaDeTextos(v: unknown, max = 200, tamanho = 200): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= tamanho)
    .slice(0, max);
}

/** Aceita só o formato esperado das escolhas que vêm da tela (nunca confia no navegador). */
export function sanearOpcoes(bruto: unknown): Partial<OpcoesImportacao> | undefined {
  if (!bruto || typeof bruto !== "object") return undefined;
  const o = bruto as Record<string, unknown>;
  const out: Partial<OpcoesImportacao> = {};

  const abas = listaDeTextos(o.abasClientes, 20);
  if (abas) out.abasClientes = abas;

  if (o.layoutDre === null) out.layoutDre = null;
  else if (typeof o.layoutDre === "string" && o.layoutDre.length <= 300) out.layoutDre = o.layoutDre;

  const meses = listaDeTextos(o.mesesDre, 240, 7);
  if (meses) out.mesesDre = meses.filter((m) => MES_VALIDO.test(m));
  const sobrepostos = listaDeTextos(o.mesesSobrepostos, 240, 7);
  if (sobrepostos) out.mesesSobrepostos = sobrepostos.filter((m) => MES_VALIDO.test(m));

  if (o.mesesDosBlocos && typeof o.mesesDosBlocos === "object") {
    const corrigidos: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.mesesDosBlocos as Record<string, unknown>).slice(0, 240)) {
      if (k.length <= 300 && typeof v === "string" && MES_VALIDO.test(v)) corrigidos[k] = v;
    }
    out.mesesDosBlocos = corrigidos;
  }
  return out;
}
