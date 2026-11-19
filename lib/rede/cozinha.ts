/**
 * Rede de lojas — cozinha central: rupturas das lojas e estoque da central.
 * Puro (sem banco, sem React): os testes importam daqui e conferem contra o painel original (HTML).
 *
 * Regras do painel original:
 *  - A semana começa na segunda-feira. A tela mostra as últimas 6 semanas que têm ruptura registrada.
 *  - Meta: até 5 rupturas por loja na semana. Na tabela: até a meta = ok, meta + 1 = atenção, acima = crítico.
 *  - "Causadas pela cozinha central" = falta na cozinha central + atraso na entrega.
 *  - Estoque: crítico se abaixo do mínimo; atenção se abaixo de 1,5× o mínimo ou com menos de 3 dias de cobertura.
 *  - Reposição sugerida = máx(0, mínimo + consumo diário × 7 − atual), arredondada para cima.
 */
import { mesDe, primeiroDiaDoMes, somarDias, ultimoDiaDoMes } from "./calculo.ts";
import { normalizar } from "./csv.ts";
import { segundaDaSemana } from "./financeiro.ts";
import { MOTIVOS_RUPTURA, type IndicadorMes, type ProdutoCC, type Ruptura, type Status } from "./tipos.ts";

export { MOTIVOS_RUPTURA };

export const META_RUPTURAS_SEMANA = 5;
export const SEMANAS_NA_RUPTURA = 6;
export const ITENS_NO_RANKING = 8;
/** Linhas que as tabelas de histórico mostram de uma vez (a exportação leva tudo o que foi carregado). */
export const LINHAS_NO_HISTORICO = 300;
/** Motivos que têm a cozinha central como origem. */
export const MOTIVOS_DA_CENTRAL: readonly string[] = ["Falta na cozinha central", "Atraso na entrega"];

const EPS = 1e-9;
const arred = (v: number, casas = 6): number => Math.round(v * 10 ** casas) / 10 ** casas;

/* ================================================================== rupturas */

export type LinhaRupturaLoja = {
  lojaId: string;
  /** Rupturas da loja em cada semana de `semanas` (mesma ordem). */
  contagens: number[];
  media: number;
  /** Status de cada semana (régua da tabela do painel original). */
  status: Status[];
};

export type ResumoRupturas = {
  /** Segundas-feiras das semanas mostradas (até 6, em ordem). */
  semanas: string[];
  ultimaSemana: string | null;
  naUltimaSemana: number;
  lojasAcima: number;
  horas: number;
  /** % das rupturas das semanas mostradas causadas pela cozinha central (falta ou atraso). */
  pctCentral: number;
  totalNaTela: number;
  porLoja: LinhaRupturaLoja[];
  itens: { item: string; total: number; horas: number }[];
  motivos: { motivo: string; total: number }[];
};

/** Régua da tabela de rupturas por semana: até a meta = ok; meta + 1 = atenção; acima = crítico. */
export function statusRupturasSemana(qtd: number, meta: number): Status {
  if (qtd <= meta + EPS) return "ok";
  if (qtd <= meta + 1 + EPS) return "warn";
  return "bad";
}

/**
 * Resume as rupturas como o painel original. `lojasOrdem` define a ordem das linhas (só entram lojas com
 * alguma ruptura registrada). `metas` traz a meta semanal de cada loja; sem ela, vale `metaPadrao`.
 */
export function resumirRupturas(args: {
  rupturas: readonly Ruptura[];
  lojasOrdem: readonly string[];
  metaPadrao?: number;
  metas?: Readonly<Record<string, number | null | undefined>>;
}): ResumoRupturas {
  const { rupturas, lojasOrdem } = args;
  const metaPadrao = args.metaPadrao ?? META_RUPTURAS_SEMANA;
  const metaDa = (lojaId: string): number => args.metas?.[lojaId] ?? metaPadrao;

  const semanaDe = new Map<string, string>();
  const sem = (data: string): string => {
    let s = semanaDe.get(data);
    if (!s) {
      s = segundaDaSemana(data);
      semanaDe.set(data, s);
    }
    return s;
  };

  const semanas = [...new Set(rupturas.map((r) => sem(r.data)))].sort().slice(-SEMANAS_NA_RUPTURA);
  const naTela = new Set(semanas);
  const dasSemanas = rupturas.filter((r) => naTela.has(sem(r.data)));
  const ultimaSemana = semanas.length > 0 ? semanas[semanas.length - 1] : null;

  const cont = new Map<string, number>();
  for (const r of dasSemanas) {
    const k = `${r.lojaId}|${sem(r.data)}`;
    cont.set(k, (cont.get(k) ?? 0) + 1);
  }
  const comRuptura = new Set(rupturas.map((r) => r.lojaId));
  const porLoja: LinhaRupturaLoja[] = lojasOrdem
    .filter((id) => comRuptura.has(id))
    .map((lojaId) => {
      const contagens = semanas.map((s) => cont.get(`${lojaId}|${s}`) ?? 0);
      const meta = metaDa(lojaId);
      return {
        lojaId,
        contagens,
        media: contagens.length > 0 ? contagens.reduce((a, b) => a + b, 0) / contagens.length : 0,
        status: contagens.map((c) => statusRupturasSemana(c, meta)),
      };
    });

  const naUltimaSemana = ultimaSemana ? rupturas.filter((r) => sem(r.data) === ultimaSemana).length : 0;
  const lojasAcima = ultimaSemana ? porLoja.filter((l) => l.contagens[l.contagens.length - 1] > metaDa(l.lojaId) + EPS).length : 0;
  const horas = dasSemanas.reduce((a, r) => a + (Number.isFinite(r.horas) ? r.horas : 0), 0);
  const daCentral = dasSemanas.filter((r) => MOTIVOS_DA_CENTRAL.includes(r.motivo)).length;

  // Ranking de itens: mais rupturas primeiro; empate → mais horas parado → ordem alfabética (resultado estável).
  const porItem = new Map<string, { item: string; total: number; horas: number }>();
  for (const r of dasSemanas) {
    const k = normalizar(r.item);
    const x = porItem.get(k) ?? { item: r.item, total: 0, horas: 0 };
    x.total += 1;
    x.horas += Number.isFinite(r.horas) ? r.horas : 0;
    porItem.set(k, x);
  }
  const itens = [...porItem.values()]
    .sort((a, b) => b.total - a.total || b.horas - a.horas || a.item.localeCompare(b.item, "pt-BR"))
    .slice(0, ITENS_NO_RANKING);

  const motivos = MOTIVOS_RUPTURA.map((motivo) => ({ motivo: motivo as string, total: dasSemanas.filter((r) => r.motivo === motivo).length }));

  return {
    semanas,
    ultimaSemana,
    naUltimaSemana,
    lojasAcima,
    horas,
    pctCentral: dasSemanas.length > 0 ? (daCentral / dasSemanas.length) * 100 : 0,
    totalNaTela: dasSemanas.length,
    porLoja,
    itens,
    motivos,
  };
}

/** Rupturas de cada produto do estoque (por nome, ignorando acento e caixa) nas semanas da tela. */
export function rupturasPorProduto(rupturas: readonly Ruptura[], produtos: readonly ProdutoCC[], semanas: readonly string[]): Map<string, number> {
  const naTela = new Set(semanas);
  const porNome = new Map<string, number>();
  for (const r of rupturas) {
    if (!naTela.has(segundaDaSemana(r.data))) continue;
    const k = normalizar(r.item);
    porNome.set(k, (porNome.get(k) ?? 0) + 1);
  }
  return new Map(produtos.map((p) => [p.id, porNome.get(normalizar(p.item)) ?? 0] as const));
}

/**
 * Rupturas por semana de cada loja em cada mês — alimenta o indicador "Rupturas por semana".
 * A semana pertence ao mês em que começa (segunda-feira). Valor = rupturas das semanas do mês ÷ semanas do
 * mês que já começaram (até `hoje`); semana sem registro conta como zero. Loja sem nenhuma ruptura no mês
 * não gera valor (não sabemos se ninguém registrou ou se não houve falta): fica o lançado à mão, se houver.
 */
export function indicadoresRupturas(rupturas: readonly Pick<Ruptura, "lojaId" | "data">[], hoje: string): IndicadorMes[] {
  const semanasDoMes = (mes: string): string[] => {
    const out: string[] = [];
    const ultimo = ultimoDiaDoMes(mes);
    for (let d = segundaDaSemana(primeiroDiaDoMes(mes)); d <= ultimo; d = somarDias(d, 7)) {
      if (mesDe(d) === mes && d <= hoje) out.push(d);
    }
    return out;
  };

  const chaves = new Map<string, { lojaId: string; mes: string; porSemana: Map<string, number> }>();
  for (const r of rupturas) {
    const semana = segundaDaSemana(r.data);
    if (semana > hoje) continue;
    const mes = mesDe(semana);
    const k = `${r.lojaId}|${mes}`;
    const x = chaves.get(k) ?? { lojaId: r.lojaId, mes, porSemana: new Map<string, number>() };
    x.porSemana.set(semana, (x.porSemana.get(semana) ?? 0) + 1);
    chaves.set(k, x);
  }

  const out: IndicadorMes[] = [];
  for (const x of chaves.values()) {
    const semanas = semanasDoMes(x.mes);
    if (semanas.length === 0) continue;
    const total = semanas.reduce((a, s) => a + (x.porSemana.get(s) ?? 0), 0);
    out.push({ lojaId: x.lojaId, mes: primeiroDiaDoMes(x.mes), indicador: "rupturas", valor: total / semanas.length, origem: "calculado" });
  }
  return out.sort((a, b) => a.mes.localeCompare(b.mes) || a.lojaId.localeCompare(b.lojaId));
}

/* ================================================================== estoque da cozinha central */

export const DIAS_COBERTURA_ATENCAO = 3;
export const FATOR_MINIMO_ATENCAO = 1.5;
export const DIAS_DE_REPOSICAO = 7;

export type StatusEstoque = { rotulo: "Crítico" | "Atenção" | "OK"; tom: Status };

/** Dias de consumo cobertos pelo estoque atual (null quando não há consumo informado). */
export const coberturaDias = (p: Pick<ProdutoCC, "atual" | "consumoDia">): number | null => (p.consumoDia > 0 ? p.atual / p.consumoDia : null);

export function statusEstoque(p: Pick<ProdutoCC, "atual" | "minimo" | "consumoDia">): StatusEstoque {
  if (p.atual < p.minimo - EPS) return { rotulo: "Crítico", tom: "bad" };
  const cob = coberturaDias(p);
  if (p.atual < p.minimo * FATOR_MINIMO_ATENCAO - EPS || (cob != null && cob < DIAS_COBERTURA_ATENCAO - EPS)) return { rotulo: "Atenção", tom: "warn" };
  return { rotulo: "OK", tom: "ok" };
}

/** Reposição sugerida = máx(0, mínimo + consumo diário × 7 − atual), arredondada para cima. */
export function reposicaoSugerida(p: Pick<ProdutoCC, "atual" | "minimo" | "consumoDia">): number {
  return Math.max(0, Math.ceil(arred(p.minimo + p.consumoDia * DIAS_DE_REPOSICAO - p.atual)));
}

export type LinhaEstoque = {
  produto: ProdutoCC;
  status: StatusEstoque;
  cobertura: number | null;
  reposicao: number;
  valor: number;
};

export type ResumoEstoque = {
  itens: number;
  valor: number;
  criticos: number;
  atencao: number;
  /** Média de dias de cobertura dos itens com consumo informado. */
  coberturaMedia: number | null;
  /** Mais urgentes primeiro (crítico, atenção, ok) e, dentro de cada grupo, em ordem alfabética. */
  linhas: LinhaEstoque[];
};

const ORDEM_TOM: Record<Status, number> = { bad: 0, warn: 1, ok: 2, neu: 3 };

export function resumirEstoque(produtos: readonly ProdutoCC[]): ResumoEstoque {
  const linhas: LinhaEstoque[] = produtos
    .map((produto) => ({
      produto,
      status: statusEstoque(produto),
      cobertura: coberturaDias(produto),
      reposicao: reposicaoSugerida(produto),
      valor: produto.atual * produto.custo,
    }))
    .sort((a, b) => ORDEM_TOM[a.status.tom] - ORDEM_TOM[b.status.tom] || a.produto.item.localeCompare(b.produto.item, "pt-BR"));
  const cobs = linhas.map((l) => l.cobertura).filter((c): c is number => c != null);
  return {
    itens: linhas.length,
    valor: linhas.reduce((a, l) => a + l.valor, 0),
    criticos: linhas.filter((l) => l.status.tom === "bad").length,
    atencao: linhas.filter((l) => l.status.tom === "warn").length,
    coberturaMedia: cobs.length > 0 ? cobs.reduce((a, b) => a + b, 0) / cobs.length : null,
    linhas,
  };
}
