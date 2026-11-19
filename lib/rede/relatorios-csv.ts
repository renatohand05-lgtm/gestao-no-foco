/**
 * Rede de lojas — exportações CSV das telas Metas e indicadores e CMV (COMANDO MESTRE §25).
 * Puro (sem banco, sem React). Cada função devolve a tabela; o cabeçalho do relatório (cliente, período, unidades,
 * data, origem) é acrescentado na hora de baixar (`comCabecalhoCsv`).
 *
 * Nada é recalculado aqui de um jeito diferente da tela: status por meta, desvio de item e CMV usam as mesmas
 * funções de `calculo.ts` e `financeiro.ts`.
 */
import { resolverMeta, statusMeta } from "./calculo.ts";
import { FONTE_CALCULADA } from "./delivery.ts";
import { desvioItemPct, statusDispersao, statusItem, type ContagemCalculada } from "./financeiro.ts";
import { INDICADORES, type CmvItem, type IndicadorMes, type MetaFaturamento, type MetaRow, type Status } from "./tipos.ts";

type Celula = string | number | null;
type LojaRef = { id: string; nome: string };

const ddmmaaaa = (iso: string | null): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const arred = (v: number | null | undefined, casas = 2): number | null => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** casas) / 10 ** casas);

export const ROTULO_STATUS: Record<Status, string> = { ok: "Na meta", warn: "Atenção", bad: "Fora da meta", neu: "Sem meta ou sem valor" };

const REGRA_META = (direcao: "min" | "max" | null): string => (direcao === "min" ? "pelo menos" : direcao === "max" ? "no máximo" : "só acompanhar");

/** Metas vigentes hoje: a padrão da rede e as próprias de cada loja, por indicador. */
export function linhasCsvMetasVigentes(lojas: readonly LojaRef[], metas: readonly MetaRow[]): Celula[][] {
  const linhas: Celula[][] = [["Escopo", "Indicador", "Grupo", "Regra", "Meta", "Vale desde"]];
  const escopos: { nome: string; lojaId: string | null }[] = [{ nome: "Padrão da rede", lojaId: null }, ...lojas.map((l) => ({ nome: l.nome, lojaId: l.id }))];
  for (const e of escopos) {
    for (const d of INDICADORES) {
      const m = metas.find((x) => x.lojaId === e.lojaId && x.indicador === d.k && x.validoAte == null);
      if (!m) continue;
      linhas.push([e.nome, d.nome, d.grupo, REGRA_META(m.direcao), m.direcao == null ? null : arred(m.meta), ddmmaaaa(m.validoDe)]);
    }
  }
  return linhas;
}

/**
 * Indicadores lançados do mês por loja (os mesmos da tela): valor, meta, situação e de onde vem o número.
 * Valor calculado por outro módulo (CMV, rupturas, delivery, RH) vale mais que o lançado à mão, como na tela.
 */
export function linhasCsvIndicadoresMes(p: {
  lojas: readonly LojaRef[];
  metas: readonly MetaRow[];
  indicadores: readonly IndicadorMes[];
  calculados: readonly IndicadorMes[];
  /** "YYYY-MM" */
  mes: string;
  tolPct: number;
}): Celula[][] {
  const ref = `${p.mes}-01`;
  const linhas: Celula[][] = [["Loja", "Indicador", "Grupo", "Regra da meta", "Meta", "Valor", "Situação", "Origem do valor"]];
  for (const l of p.lojas) {
    for (const d of INDICADORES.filter((x) => !x.calculado)) {
      const m = resolverMeta(p.metas, l.id, d.k, ref);
      const calculado = FONTE_CALCULADA[d.k] ? (p.calculados.find((i) => i.lojaId === l.id && i.indicador === d.k && i.mes === ref) ?? null) : null;
      const lancado = p.indicadores.find((i) => i.lojaId === l.id && i.indicador === d.k && i.mes === ref) ?? null;
      const valor = calculado ? calculado.valor : (lancado?.valor ?? null);
      const origem = calculado ? `Calculado ${FONTE_CALCULADA[d.k] ?? "de outro módulo"}` : lancado ? (lancado.origem === "exemplo" ? "Exemplo (demonstração)" : "Lançado") : "Sem lançamento";
      linhas.push([l.nome, d.nome, d.grupo, REGRA_META(m.direcao), m.direcao == null ? null : arred(m.meta), arred(valor), ROTULO_STATUS[statusMeta(m.meta, m.direcao, valor, p.tolPct)], origem]);
    }
  }
  return linhas;
}

/** Metas de faturamento do ano, uma linha por loja e mês que tem meta cadastrada. */
export function linhasCsvMetasFaturamento(lojas: readonly LojaRef[], metasFat: readonly MetaFaturamento[], ano: string): Celula[][] {
  const nome = new Map(lojas.map((l) => [l.id, l.nome] as const));
  const linhas: Celula[][] = [["Loja", "Mês", "Meta de faturamento (R$)"]];
  const doAno = metasFat.filter((m) => m.mes.startsWith(`${ano}-`) && nome.has(m.lojaId));
  doAno.sort((a, b) => (nome.get(a.lojaId) as string).localeCompare(nome.get(b.lojaId) as string, "pt-BR") || a.mes.localeCompare(b.mes));
  for (const m of doAno) linhas.push([nome.get(m.lojaId) as string, `${m.mes.slice(5, 7)}/${m.mes.slice(0, 4)}`, arred(m.valor)]);
  return linhas;
}

const ROTULO_ORIGEM_VENDAS = { informada: "Informada na contagem", modulo_vendas: "Soma do módulo Vendas" } as const;

/** CMV semana a semana por loja: movimentos, CMV real em R$ e %, teórico, dispersão e a situação contra a meta da loja. */
export function linhasCsvCmvSemanas(p: {
  lojas: readonly LojaRef[];
  calc: readonly ContagemCalculada[];
  metas: readonly MetaRow[];
  tolPct: number;
  tolDispersao: number;
}): Celula[][] {
  const nome = new Map(p.lojas.map((l) => [l.id, l.nome] as const));
  const linhas: Celula[][] = [
    ["Semana (segunda)", "Loja", "Estoque inicial", "Compras", "Transferências de entrada", "Transferências de saída", "Devoluções", "Estoque final", "CMV real (R$)", "Vendas da semana (R$)", "Base das vendas", "CMV real (%)", "CMV teórico (%)", "Dispersão (p.p.)", "Situação do CMV real", "Situação da dispersão", "Responsável"],
  ];
  const ordenadas = p.calc.filter((c) => nome.has(c.contagem.lojaId)).sort((a, b) => b.contagem.semana.localeCompare(a.contagem.semana) || (nome.get(a.contagem.lojaId) as string).localeCompare(nome.get(b.contagem.lojaId) as string, "pt-BR"));
  for (const c of ordenadas) {
    const k = c.contagem;
    const m = resolverMeta(p.metas, k.lojaId, "cmv", k.semana);
    linhas.push([
      ddmmaaaa(k.semana),
      nome.get(k.lojaId) as string,
      arred(k.estoqueInicial),
      arred(k.compras),
      arred(k.transferenciasEntrada),
      arred(k.transferenciasSaida),
      arred(k.devolucoes),
      arred(k.estoqueFinal),
      arred(c.reais),
      arred(c.vendas),
      c.vendasOrigem ? ROTULO_ORIGEM_VENDAS[c.vendasOrigem] : "Sem vendas na base",
      arred(c.pct),
      arred(c.teorico),
      arred(c.dispersao),
      ROTULO_STATUS[statusMeta(m.meta, m.direcao, c.pct, p.tolPct)],
      ROTULO_STATUS[statusDispersao(c.dispersao, p.tolDispersao)],
      k.responsavel ?? "",
    ]);
  }
  return linhas;
}

const ROTULO_ITEM: Record<Status, string> = { ok: "Dentro do esperado", warn: "Atenção", bad: "Crítico", neu: "Sem teórico" };

/** Consumo real contra o teórico por item e loja, na semana em foco. */
export function linhasCsvCmvItens(lojas: readonly LojaRef[], itens: readonly CmvItem[], semana: string): Celula[][] {
  const nome = new Map(lojas.map((l) => [l.id, l.nome] as const));
  const linhas: Celula[][] = [["Semana (segunda)", "Loja", "Item", "Consumo teórico", "Consumo real", "Diferença (%)", "Situação"]];
  const ordenados = itens.filter((i) => nome.has(i.lojaId)).sort((a, b) => (nome.get(a.lojaId) as string).localeCompare(nome.get(b.lojaId) as string, "pt-BR") || a.item.localeCompare(b.item, "pt-BR"));
  for (const i of ordenados) {
    const d = desvioItemPct(i.consumoTeorico, i.consumoReal);
    linhas.push([ddmmaaaa(semana), nome.get(i.lojaId) as string, i.item, arred(i.consumoTeorico), arred(i.consumoReal), arred(d), ROTULO_ITEM[statusItem(d)]]);
  }
  return linhas;
}
