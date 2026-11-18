/**
 * Rede de lojas — filtros da tela (loja, mês, ano, intervalo), lidos da URL.
 * Tudo validado: valor inválido volta ao padrão, nunca quebra a página.
 */
import { listarMeses, mesDe, primeiroDiaDoMes, ultimoDiaDoMes } from "./calculo.ts";

export type ModoPeriodo = "mes" | "ano" | "intervalo";

export type FiltrosRede = {
  modo: ModoPeriodo;
  /** "YYYY-MM" (modo mês). */
  mes: string;
  /** "YYYY" (modo ano). */
  ano: string;
  de: string;
  ate: string;
  /** slug da loja, ou null = rede toda. */
  loja: string | null;
};

type Params = Record<string, string | string[] | undefined>;

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const RE_ANO = /^\d{4}$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function um(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function dataValida(s: string | undefined): s is string {
  if (!s || !RE_DATA.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * `mesPadrao`: mês do último lançamento de vendas (ou o mês corrente se não há nenhum).
 * Intervalos maiores que 5 anos são recortados, para nunca pedir dados demais.
 */
export function lerFiltros(params: Params, mesPadrao: string): FiltrosRede {
  const modoRaw = um(params.periodo);
  const modo: ModoPeriodo = modoRaw === "ano" || modoRaw === "intervalo" ? modoRaw : "mes";
  const mesRaw = um(params.mes);
  const mes = mesRaw && RE_MES.test(mesRaw) ? mesRaw : mesPadrao;
  const anoRaw = um(params.ano);
  const ano = anoRaw && RE_ANO.test(anoRaw) && Number(anoRaw) >= 2000 && Number(anoRaw) <= 2100 ? anoRaw : mesPadrao.slice(0, 4);
  const lojaRaw = um(params.loja);
  const loja = lojaRaw && /^[a-z0-9-]{1,60}$/.test(lojaRaw) ? lojaRaw : null;

  let de = primeiroDiaDoMes(mes);
  let ate = ultimoDiaDoMes(mes);
  if (modo === "ano") {
    de = `${ano}-01-01`;
    ate = `${ano}-12-31`;
  } else if (modo === "intervalo") {
    const d = um(params.de);
    const a = um(params.ate);
    de = dataValida(d) ? d : primeiroDiaDoMes(mes);
    ate = dataValida(a) ? a : ultimoDiaDoMes(mes);
    if (ate < de) [de, ate] = [ate, de];
    const limite = `${Number(de.slice(0, 4)) + 5}${de.slice(4)}`;
    if (ate > limite) ate = limite;
  }
  return { modo, mes, ano, de, ate, loja };
}

/** Meses cobertos pelo período (para buscar metas e lançamentos mensais). */
export const mesesDoPeriodo = (f: Pick<FiltrosRede, "de" | "ate">): string[] => listarMeses(f.de, f.ate);

export function rotuloPeriodo(f: Pick<FiltrosRede, "modo" | "mes" | "ano" | "de" | "ate">): string {
  const nomeMes = (m: string) => {
    const [a, n] = m.split("-").map(Number);
    return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][n - 1]}/${a}`;
  };
  if (f.modo === "ano") return f.ano;
  if (f.modo === "mes") return nomeMes(f.mes);
  const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  return `${br(f.de)} a ${br(f.ate)}`;
}

/**
 * Mês em que ranking e alertas são avaliados: o último mês do período que tem vendas
 * e que já começou; se nenhum tem, o último mês do período que já começou.
 */
export function mesDeReferencia(de: string, ate: string, hoje: string, datasComVenda: Iterable<string>): string {
  const limite = mesDe(hoje);
  const meses = listarMeses(de, ate).filter((m) => m <= limite);
  if (meses.length === 0) return mesDe(de);
  const comVenda = new Set<string>();
  for (const d of datasComVenda) if (d >= de && d <= ate) comVenda.add(mesDe(d));
  for (let i = meses.length - 1; i >= 0; i--) if (comVenda.has(meses[i])) return meses[i];
  return meses[meses.length - 1];
}

/** Monta a query string preservando só o que importa. */
export function paraQuery(f: Partial<FiltrosRede>): string {
  const p = new URLSearchParams();
  if (f.modo && f.modo !== "mes") p.set("periodo", f.modo);
  if (f.modo === "mes" || f.modo === undefined) {
    if (f.mes) p.set("mes", f.mes);
  }
  if (f.modo === "ano" && f.ano) p.set("ano", f.ano);
  if (f.modo === "intervalo") {
    if (f.de) p.set("de", f.de);
    if (f.ate) p.set("ate", f.ate);
  }
  if (f.loja) p.set("loja", f.loja);
  const s = p.toString();
  return s ? `?${s}` : "";
}
