/**
 * Painel de empresas com receita recorrente (agências, consultórios, clínicas, assinaturas…).
 * Tudo é calculado ao vivo a partir da carteira de clientes e do resultado mensal (DRE) do portal.
 * Função pura: não acessa o banco; quem lê os dados é o `loader.ts`.
 */

export type ClienteRecorrente = {
  nome: string;
  ativo: boolean;
  /** AAAA-MM-DD */
  entrada: string | null;
  /** AAAA-MM-DD — só faz sentido quando `ativo` é falso. */
  saida: string | null;
  /** Valor mensal do contrato. */
  mrr: number | null;
  nicho: string | null;
  motivo: string | null;
};

/** Resultado de um mês, vindo da DRE do portal (competência). */
export type FinanceiroMes = {
  mes: string;
  receita: number;
  despesa: number;
  resultado: number;
  comerciais: number;
  pessoal: number;
};

export type PontoMes = {
  mes: string;
  /** O mês ainda está em andamento (é o mês de hoje). */
  parcial: boolean;
  ativosFim: number;
  novos: number;
  churn: number;
  mrrFim: number;
  mrrNovo: number;
  mrrPerdido: number;
  /** Clientes da base do início do mês que saíram ÷ clientes no início do mês. `null` se não havia base. */
  churnPct: number | null;
  ticketMedio: number | null;
  receita: number | null;
  despesa: number | null;
  resultado: number | null;
  margemPct: number | null;
  /** Despesas comerciais ÷ clientes novos (custo para trazer um cliente). */
  cac: number | null;
};

export type LinhaNicho = { nicho: string; ativos: number; mrr: number; churn: number };
export type LinhaMotivo = { motivo: string; clientes: number; mrr: number };
export type LinhaCliente = { nome: string; mrr: number; nicho: string | null; entrada: string | null };

export type PainelRecorrencia = {
  hoje: string;
  /** Do primeiro mês com dado até o mês de hoje. */
  serie: PontoMes[];
  atual: {
    ativos: number;
    mrr: number;
    ticketMedio: number | null;
    /** Último mês fechado. */
    mesFechado: string | null;
    churnPctUltimoMes: number | null;
    churnPctMedia3m: number | null;
    /** Quanto um cliente costuma pagar até sair: ticket ÷ churn mensal. */
    ltv: number | null;
    permanenciaMediaMeses: number | null;
    /** Quanto da receita mensal vem dos 5 maiores clientes. */
    concentracaoTop5Pct: number | null;
    novosUltimoMes: number;
    resultadoUltimoMes: number | null;
    margemUltimoMes: number | null;
    receitaUltimoMes: number | null;
    cacMedio3m: number | null;
  };
  nichos: LinhaNicho[];
  motivos: LinhaMotivo[];
  top: LinhaCliente[];
  /** Tendência simples (linha reta dos últimos meses). Não é meta nem promessa. */
  projecao: Array<{ mes: string; mrr: number }>;
  avisos: string[];
  temFinanceiro: boolean;
};

/* ------------------------------------------------------------------ datas */

const pad2 = (n: number) => String(n).padStart(2, "0");
export const mesDeData = (iso: string) => iso.slice(0, 7);

export function proximoMes(mes: string): string {
  const a = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return m === 12 ? `${a + 1}-01` : `${a}-${pad2(m + 1)}`;
}

export function mesAnterior(mes: string): string {
  const a = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return m === 1 ? `${a - 1}-12` : `${a}-${pad2(m - 1)}`;
}

function diferencaDeMeses(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + (d2 - d1) / 30;
}

export function ultimoDia(mes: string): string {
  const a = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return `${mes}-${pad2(new Date(Date.UTC(a, m, 0)).getUTCDate())}`;
}

function listaDeMeses(de: string, ate: string): string[] {
  const out: string[] = [];
  for (let m = de; m <= ate && out.length < 240; m = proximoMes(m)) out.push(m);
  return out;
}

const arredonda = (n: number) => Math.round(n * 100) / 100;
const dividir = (a: number, b: number) => (b > 0 ? a / b : null);

/* ------------------------------------------------------------------ cálculo */

export function calcularPainelRecorrencia(args: {
  clientes: ClienteRecorrente[];
  financeiro: FinanceiroMes[];
  /** AAAA-MM-DD (hoje em São Paulo). */
  hoje: string;
}): PainelRecorrencia {
  const { hoje } = args;
  const mesHoje = mesDeData(hoje);
  const avisos: string[] = [];

  // Só entram clientes com data de entrada; os outros não dá para colocar no tempo.
  const semEntrada = args.clientes.filter((c) => !c.entrada).length;
  const semSaida = args.clientes.filter((c) => c.entrada && !c.ativo && !c.saida).length;
  const clientes = args.clientes.filter((c) => c.entrada && (c.ativo || c.saida));
  if (semEntrada) avisos.push(`${semEntrada} cliente(s) sem data de entrada ficaram fora dos gráficos.`);
  if (semSaida) {
    avisos.push(`${semSaida} cliente(s) em churn sem data de saída ficaram fora dos gráficos e da contagem de churn.`);
  }

  const financeiroPorMes = new Map(args.financeiro.map((f) => [f.mes, f]));
  const temFinanceiro = args.financeiro.some((f) => f.receita > 0 || f.despesa > 0);

  const entradas = clientes.map((c) => mesDeData(c.entrada as string));
  const mesesFin = args.financeiro.filter((f) => f.receita > 0 || f.despesa > 0).map((f) => f.mes);
  const primeiros = [...entradas, ...mesesFin].sort();
  const inicio = primeiros[0] ?? mesHoje;
  const meses = listaDeMeses(inicio > mesHoje ? mesHoje : inicio, mesHoje);

  const serie: PontoMes[] = meses.map((mes) => {
    const fim = ultimoDia(mes);
    const ativosFim = clientes.filter(
      (c) => (c.entrada as string) <= fim && !(c.saida && c.saida <= fim && !c.ativo),
    );
    const novos = clientes.filter((c) => mesDeData(c.entrada as string) === mes);
    const perdidos = clientes.filter((c) => !c.ativo && c.saida && mesDeData(c.saida) === mes);
    const inicioDoMes = clientes.filter(
      (c) =>
        (c.entrada as string) < `${mes}-01` && !(c.saida && c.saida < `${mes}-01` && !c.ativo),
    );
    // O churn % usa a base do 1º dia do mês: quem entrou e saiu no próprio mês não entra na conta
    // (mas continua contado em "perdidos" e no MRR perdido).
    const perdidosDaBase = perdidos.filter((c) => (c.entrada as string) < `${mes}-01`);
    const mrrFim = ativosFim.reduce((s, c) => s + (c.mrr ?? 0), 0);
    const fin = financeiroPorMes.get(mes);
    const finComDado = fin && (fin.receita > 0 || fin.despesa > 0) ? fin : null;
    const cac = finComDado && novos.length > 0 && finComDado.comerciais > 0 ? finComDado.comerciais / novos.length : null;

    return {
      mes,
      parcial: mes === mesHoje,
      ativosFim: ativosFim.length,
      novos: novos.length,
      churn: perdidos.length,
      mrrFim: arredonda(mrrFim),
      mrrNovo: arredonda(novos.reduce((s, c) => s + (c.mrr ?? 0), 0)),
      mrrPerdido: arredonda(perdidos.reduce((s, c) => s + (c.mrr ?? 0), 0)),
      churnPct: inicioDoMes.length > 0 ? (perdidosDaBase.length / inicioDoMes.length) * 100 : null,
      ticketMedio: dividir(mrrFim, ativosFim.length),
      receita: finComDado ? arredonda(finComDado.receita) : null,
      despesa: finComDado ? arredonda(finComDado.despesa) : null,
      resultado: finComDado ? arredonda(finComDado.resultado) : null,
      margemPct: finComDado && finComDado.receita > 0 ? (finComDado.resultado / finComDado.receita) * 100 : null,
      cac: cac == null ? null : arredonda(cac),
    };
  });

  /* ---- situação atual ---- */
  const ativosAgora = clientes.filter((c) => c.ativo && (c.entrada as string) <= hoje);
  const mrrAgora = ativosAgora.reduce((s, c) => s + (c.mrr ?? 0), 0);
  const fechados = serie.filter((p) => !p.parcial);
  const ultimoFechado = fechados[fechados.length - 1] ?? null;
  const ultimos3 = fechados.slice(-3);
  const churnsValidos = ultimos3.map((p) => p.churnPct).filter((v): v is number => v != null);
  const churnMedia3m = churnsValidos.length ? churnsValidos.reduce((s, v) => s + v, 0) / churnsValidos.length : null;
  const ticket = dividir(mrrAgora, ativosAgora.length);
  const ltv = ticket != null && churnMedia3m != null && churnMedia3m > 0 ? ticket / (churnMedia3m / 100) : null;

  const perdidosTodos = clientes.filter((c) => !c.ativo && c.saida);
  const permanencias = perdidosTodos
    .map((c) => diferencaDeMeses(c.entrada as string, c.saida as string))
    .filter((v) => v >= 0);
  const permanenciaMedia = permanencias.length
    ? permanencias.reduce((s, v) => s + v, 0) / permanencias.length
    : null;

  const maiores = [...ativosAgora].sort((a, b) => (b.mrr ?? 0) - (a.mrr ?? 0));
  const top5 = maiores.slice(0, 5).reduce((s, c) => s + (c.mrr ?? 0), 0);

  const cacs = ultimos3.map((p) => p.cac).filter((v): v is number => v != null);

  /* ---- nichos ---- */
  const porNicho = new Map<string, LinhaNicho>();
  for (const c of clientes) {
    const nicho = c.nicho?.trim() || "Sem nicho";
    const l = porNicho.get(nicho) ?? { nicho, ativos: 0, mrr: 0, churn: 0 };
    if (c.ativo) {
      l.ativos++;
      l.mrr += c.mrr ?? 0;
    } else {
      l.churn++;
    }
    porNicho.set(nicho, l);
  }
  const nichos = [...porNicho.values()]
    .map((l) => ({ ...l, mrr: arredonda(l.mrr) }))
    .sort((a, b) => b.mrr - a.mrr || b.churn - a.churn);

  /* ---- motivos de churn ---- */
  const porMotivo = new Map<string, LinhaMotivo>();
  for (const c of perdidosTodos) {
    const motivo = c.motivo?.trim() || "Não informado";
    const l = porMotivo.get(motivo) ?? { motivo, clientes: 0, mrr: 0 };
    l.clientes++;
    l.mrr += c.mrr ?? 0;
    porMotivo.set(motivo, l);
  }
  const motivos = [...porMotivo.values()]
    .map((l) => ({ ...l, mrr: arredonda(l.mrr) }))
    .sort((a, b) => b.clientes - a.clientes || b.mrr - a.mrr);

  /* ---- projeção (linha reta nos últimos meses) ---- */
  const base = serie.slice(-7);
  const projecao: PainelRecorrencia["projecao"] = [];
  if (base.length >= 3) {
    const n = base.length;
    const xs = base.map((_, i) => i);
    const ys = base.map((p) => p.mrrFim);
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const inclinacao = den > 0 ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : 0;
    const intercepto = my - inclinacao * mx;
    let mes = mesHoje;
    for (let k = 1; k <= 3; k++) {
      mes = proximoMes(mes);
      projecao.push({ mes, mrr: arredonda(Math.max(0, intercepto + inclinacao * (n - 1 + k))) });
    }
  }

  if (temFinanceiro) {
    const semDre = serie.filter((p) => p.receita == null && !p.parcial && p.mes >= (mesesFin[0] ?? "9999-99")).length;
    if (semDre) avisos.push(`${semDre} mês(es) no meio do período não têm lançamentos no Financeiro.`);
  }

  return {
    hoje,
    serie,
    atual: {
      ativos: ativosAgora.length,
      mrr: arredonda(mrrAgora),
      ticketMedio: ticket,
      mesFechado: ultimoFechado?.mes ?? null,
      churnPctUltimoMes: ultimoFechado?.churnPct ?? null,
      churnPctMedia3m: churnMedia3m,
      ltv,
      permanenciaMediaMeses: permanenciaMedia,
      concentracaoTop5Pct: mrrAgora > 0 ? (top5 / mrrAgora) * 100 : null,
      novosUltimoMes: ultimoFechado?.novos ?? 0,
      resultadoUltimoMes: ultimoFechado?.resultado ?? null,
      margemUltimoMes: ultimoFechado?.margemPct ?? null,
      receitaUltimoMes: ultimoFechado?.receita ?? null,
      cacMedio3m: cacs.length ? cacs.reduce((s, v) => s + v, 0) / cacs.length : null,
    },
    nichos,
    motivos,
    top: maiores.slice(0, 10).map((c) => ({
      nome: c.nome,
      mrr: c.mrr ?? 0,
      nicho: c.nicho,
      entrada: c.entrada,
    })),
    projecao,
    avisos,
    temFinanceiro,
  };
}
