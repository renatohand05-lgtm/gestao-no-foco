/**
 * Acha a DRE dentro de uma aba. Entende dois jeitos de montar a planilha:
 *  - "meses em colunas": uma linha de cabeçalho com abr/26, mai/26… e uma linha por conta;
 *  - "blocos por mês": um bloco (Conta | Sem 1 … | Total Mês) para cada mês, um embaixo do outro.
 * Ignora subtotais, resultados, margens e indicadores, e confere o resultado calculado com o
 * resultado que a própria planilha mostra.
 */
import {
  arredonda2,
  celulaTexto,
  dataIso,
  letraDaColuna,
  mesChave,
  mesDe,
  mesNoTexto,
  numeroDe,
  sem,
  somaMeses,
} from "./texto.ts";
import type { Aba, ItemDre, LayoutDre, ResumoMesDre, TipoLancamento } from "./tipos.ts";

type LinhaLida = {
  /** Linha na planilha (1 = primeira). */
  linha: number;
  rotuloBruto: string;
  valores: Array<number | null>;
};

type Folha = {
  linha: number;
  rotulo: string;
  tipo: TipoLancamento;
  origemTipo: "secao" | "nome";
  valores: Array<number | null>;
};

const RE_TOTAL = /(^| )(total|subtotal|soma)( |$)/;
const RE_DERIVADA =
  /^(lucro|resultado|margem|ebitda|ebit|saldo|caixa da empresa|superavit|deficit)\b/;
const RE_RESULTADO_FINAL =
  /(resultado liquido|caixa da empresa|lucro liquido|resultado final|resultado do mes|resultado do periodo|lucro do mes)/;
const RE_INDICADOR =
  /^(ticket|cac|ltv|churn|clientes|novos clientes|leads|reunioes|propostas|conversao|taxa|retencao|indice|meta)/;
const RE_SEC_RECEITA = /(receita|faturamento|entradas)/;
const RE_SEC_DESPESA = /(custo|despesa|gasto|saidas)/;
const RE_FIM = /(indicador|premissa|kpi|metrica|vendas|funil|retencao|diagnostico|resumo)/;
const RE_RECEITA_NOME =
  /(receita|faturamento|mrr|mensalidade|honorario|venda|recebimento|consulta|procedimento|sessao)/;

const RE_NEGACAO = /^\s*\(\s*[-−–]\s*\)/;

export function limparRotulo(bruto: string): string {
  let s = bruto.replace(RE_NEGACAO, "");
  s = s.replace(/\s*\([^)]*[%\d][^)]*\)?/g, "");
  s = s.replace(/\s+/g, " ").replace(/[\s:—–-]+$/, "").trim();
  if (!s) s = bruto.replace(/\s+/g, " ").trim();
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function classificar(
  linhas: LinhaLida[],
  colunasDeTeste: number[],
): { folhas: Folha[]; pais: string[]; resultado: Array<number | null> | null } {
  const folhas: Folha[] = [];
  let resultado: Array<number | null> | null = null;
  let secao: TipoLancamento | null = null;
  let viuSecao = false;
  let viuDerivada = false;

  for (const l of linhas) {
    const s = sem(l.rotuloBruto);
    if (!s) continue;
    const temNumero = l.valores.some((v) => v != null);

    if (!temNumero) {
      const rec = RE_SEC_RECEITA.test(s) && !RE_TOTAL.test(s);
      const des = RE_SEC_DESPESA.test(s) && !RE_TOTAL.test(s);
      if (rec && !des) {
        secao = "receita";
        viuSecao = true;
      } else if (des && !rec) {
        secao = "despesa";
        viuSecao = true;
      } else if (folhas.length && (RE_FIM.test(s) || viuDerivada)) {
        break; // começou outra parte da planilha (indicadores, premissas, vendas…)
      }
      continue;
    }

    if (s.includes("%")) continue;
    if (RE_TOTAL.test(s)) {
      viuDerivada = true;
      continue;
    }
    if (RE_DERIVADA.test(s)) {
      viuDerivada = true;
      if (RE_RESULTADO_FINAL.test(s)) resultado = l.valores;
      continue;
    }

    let tipo: TipoLancamento;
    let origemTipo: "secao" | "nome";
    if (RE_NEGACAO.test(l.rotuloBruto)) {
      tipo = "despesa";
      origemTipo = "secao";
    } else if (viuSecao) {
      if (!secao) continue;
      tipo = secao;
      origemTipo = "secao";
    } else {
      if (RE_INDICADOR.test(s)) continue;
      tipo = RE_RECEITA_NOME.test(s) ? "receita" : "despesa";
      origemTipo = "nome";
    }
    folhas.push({
      linha: l.linha,
      rotulo: limparRotulo(l.rotuloBruto),
      tipo,
      origemTipo,
      valores: l.valores,
    });
  }

  // Linha "pai": o valor dela é a soma das linhas seguintes (ex.: Folha = salários + comissões).
  // Só importamos as filhas para não contar duas vezes.
  const pais = new Set<number>();
  for (let i = 0; i < folhas.length; i++) {
    const alvo = colunasDeTeste.map((c) => folhas[i].valores[c] ?? 0);
    if (alvo.every((v) => Math.abs(v) < 0.005)) continue;
    const soma = colunasDeTeste.map(() => 0);
    for (let k = i + 1; k < folhas.length && k <= i + 14; k++) {
      if (folhas[k].tipo !== folhas[i].tipo) break;
      colunasDeTeste.forEach((c, idx) => {
        soma[idx] += folhas[k].valores[c] ?? 0;
      });
      if (k >= i + 2 && alvo.every((v, idx) => Math.abs(v - soma[idx]) < 0.02)) {
        pais.add(i);
        break;
      }
    }
  }

  return {
    folhas: folhas.filter((_, i) => !pais.has(i)),
    pais: [...pais].map((i) => folhas[i].rotulo),
    resultado,
  };
}

/** Soma linhas com o mesmo nome e tipo no mesmo mês (e bloco). */
function consolidar(itens: ItemDre[]): ItemDre[] {
  const mapa = new Map<string, ItemDre>();
  for (const it of itens) {
    const k = `${it.blocoId ?? ""}|${it.mes}|${it.tipo}|${sem(it.rotulo)}`;
    const atual = mapa.get(k);
    if (atual) atual.valor = arredonda2(atual.valor + it.valor);
    else mapa.set(k, { ...it });
  }
  return [...mapa.values()];
}

function resumir(
  itens: ItemDre[],
  resultadoPorMes: Map<string, number>,
): ResumoMesDre[] {
  const porMes = new Map<string, ResumoMesDre>();
  for (const it of itens) {
    const r =
      porMes.get(it.mes) ??
      {
        mes: it.mes,
        receita: 0,
        despesa: 0,
        resultado: 0,
        resultadoPlanilha: null,
        confere: null,
        itens: 0,
      };
    if (it.tipo === "receita") r.receita = arredonda2(r.receita + it.valor);
    else r.despesa = arredonda2(r.despesa + it.valor);
    r.itens++;
    porMes.set(it.mes, r);
  }
  for (const r of porMes.values()) {
    r.resultado = arredonda2(r.receita - r.despesa);
    const planilha = resultadoPorMes.get(r.mes);
    if (planilha != null) {
      r.resultadoPlanilha = arredonda2(planilha);
      r.confere = Math.abs(r.resultado - planilha) <= 1;
    }
  }
  return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Se a maior parte das despesas vem negativa (DRE com custos em negativo), inverte o sinal. */
function normalizarSinal(folhas: Folha[], colunas: number[]): { invertido: boolean } {
  let neg = 0;
  let pos = 0;
  for (const f of folhas) {
    if (f.tipo !== "despesa") continue;
    for (const c of colunas) {
      const v = f.valores[c];
      if (v == null || v === 0) continue;
      if (v < 0) neg++;
      else pos++;
    }
  }
  if (neg >= 3 && neg > pos * 2) {
    for (const f of folhas) {
      if (f.tipo === "despesa") f.valores = f.valores.map((v) => (v == null ? v : -v));
    }
    return { invertido: true };
  }
  return { invertido: false };
}

function pontuarLayout(l: LayoutDre): number {
  const conferem = l.meses.filter((m) => m.confere === true).length;
  const divergem = l.meses.filter((m) => m.confere === false).length;
  return conferem * 1000 - divergem * 200 + l.meses.length * 10 + Math.min(l.itens.length, 500) / 50;
}

/* ===================================================================== meses em colunas */

function colunaDeMesPlausivel(celula: unknown): boolean {
  if (typeof celula === "number") {
    const iso = dataIso(celula);
    if (!iso) return false;
    const dia = Number(iso.slice(8, 10));
    const ultimo = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();
    return dia === 1 || dia === ultimo;
  }
  return typeof celula === "string";
}

function detectarMeses(aba: Aba, anoPadrao: number): LayoutDre[] {
  const resultado: LayoutDre[] = [];
  const { linhas } = aba;
  const limite = Math.min(linhas.length, 400);

  for (let r = 0; r < limite; r++) {
    const linha = linhas[r];
    if (!linha) continue;
    const cols: Array<{ c: number; mes: string }> = [];
    let anoCorrente = anoPadrao;
    let mesAnterior = 0;
    for (let c = 0; c < linha.length; c++) {
      const cel = linha[c];
      if (!colunaDeMesPlausivel(cel)) continue;
      const m = mesDe(cel);
      if (!m) continue;
      let ano = m.ano;
      if (ano == null) {
        // Rótulo sem ano ("ABR", "MAI"): segue o calendário a partir do ano padrão.
        if (mesAnterior && m.mes < mesAnterior) anoCorrente++;
        ano = anoCorrente;
      } else {
        anoCorrente = ano;
      }
      mesAnterior = m.mes;
      cols.push({ c, mes: mesChave(ano, m.mes) });
    }
    if (cols.length < 3) continue;
    // Os meses precisam crescer da esquerda para a direita.
    if (!cols.every((x, i) => i === 0 || x.mes > cols[i - 1].mes)) continue;

    // Coluna dos nomes das contas: a que tem texto logo à esquerda dos meses.
    const primeira = cols[0].c;
    let colRotulo = -1;
    for (let c = primeira - 1; c >= Math.max(0, primeira - 3); c--) {
      let textos = 0;
      for (let k = r + 1; k < Math.min(linhas.length, r + 30); k++) {
        if (typeof linhas[k]?.[c] === "string" && sem(linhas[k][c])) textos++;
      }
      if (textos >= 3) {
        colRotulo = c;
        break;
      }
    }
    if (colRotulo < 0) continue;

    // Fim da tabela: o próximo cabeçalho de meses (se houver) ou o fim da aba.
    let fim = linhas.length;
    for (let k = r + 1; k < Math.min(linhas.length, r + 400); k++) {
      const outras = (linhas[k] ?? []).filter((x) => colunaDeMesPlausivel(x) && mesDe(x)).length;
      if (outras >= 3) {
        fim = k;
        break;
      }
    }

    const lidas: LinhaLida[] = [];
    for (let k = r + 1; k < fim; k++) {
      const row = linhas[k] ?? [];
      lidas.push({
        linha: aba.linhaInicial + k,
        rotuloBruto: celulaTexto(row[colRotulo]),
        valores: cols.map(({ c }) => (typeof row[c] === "number" ? (row[c] as number) : numeroDe(row[c]))),
      });
    }
    const todas = cols.map((_, i) => i);
    const { folhas, pais, resultado: linhaResultado } = classificar(lidas, todas);
    const { invertido } = normalizarSinal(folhas, todas);

    const avisos: string[] = [];
    if (pais.length) avisos.push(`Linhas de subtotal ignoradas (já somadas nas linhas de baixo): ${pais.join(", ")}.`);
    if (invertido) avisos.push("As despesas vinham com sinal negativo; inverti para positivo.");
    let negativosIgnorados = 0;

    const itens: ItemDre[] = [];
    for (const f of folhas) {
      cols.forEach((col, idx) => {
        const v = f.valores[idx];
        if (v == null || Math.abs(v) < 0.005) return;
        if (v < 0) {
          negativosIgnorados++;
          return;
        }
        itens.push({
          mes: col.mes,
          tipo: f.tipo,
          rotulo: f.rotulo,
          valor: arredonda2(v),
          linha: f.linha,
          origemTipo: f.origemTipo,
        });
      });
    }
    if (negativosIgnorados) {
      avisos.push(`${negativosIgnorados} valor(es) negativo(s) em linhas de receita/despesa foram ignorados.`);
    }

    const resultadoPorMes = new Map<string, number>();
    if (linhaResultado) {
      cols.forEach((col, idx) => {
        const v = linhaResultado[idx];
        if (v != null) resultadoPorMes.set(col.mes, v);
      });
    }
    const consolidados = consolidar(itens);
    const meses = resumir(consolidados, resultadoPorMes);
    if (meses.length < 2 || !consolidados.some((i) => i.tipo === "receita") || !consolidados.some((i) => i.tipo === "despesa")) {
      continue;
    }

    resultado.push({
      id: `${aba.nome}#colunas@${aba.linhaInicial + r}`,
      aba: aba.nome,
      formato: "meses-em-colunas",
      descricao: `Meses nas colunas ${letraDaColuna(aba.colunaInicial + cols[0].c)}–${letraDaColuna(
        aba.colunaInicial + cols[cols.length - 1].c,
      )}, cabeçalho na linha ${aba.linhaInicial + r}`,
      blocos: [],
      meses,
      itens: consolidados,
      avisos,
    });
  }
  return resultado;
}

/* ====================================================================== blocos por mês */

const CABECALHOS_DE_CONTA = new Set([
  "conta",
  "contas",
  "descricao",
  "discriminacao",
  "item",
  "linha",
  "rubrica",
  "categoria",
]);

type Cabecalho = { r: number; colRotulo: number; colTotal: number; colunas: number[] };

function acharCabecalhosDeBloco(aba: Aba): Cabecalho[] {
  const out: Cabecalho[] = [];
  aba.linhas.forEach((linha, r) => {
    if (!linha) return;
    const c0 = linha.findIndex((c) => c != null && c !== "");
    if (c0 < 0 || typeof linha[c0] !== "string") return;
    if (!CABECALHOS_DE_CONTA.has(sem(linha[c0]))) return;
    const demais = linha.slice(c0 + 1).map((c) => (typeof c === "string" ? sem(c) : ""));
    if (demais.filter(Boolean).length < 2) return;
    // Se o cabeçalho já traz vários meses, é a tabela "meses em colunas" (outro formato).
    if (linha.filter((c) => colunaDeMesPlausivel(c) && mesDe(c)).length >= 3) return;
    const colTotal = demais.findIndex((t) => /\btotal\b/.test(t));
    if (colTotal < 0) return;
    const colunas: number[] = [];
    for (let c = c0 + 1; c <= c0 + 1 + colTotal; c++) colunas.push(c);
    out.push({ r, colRotulo: c0, colTotal: c0 + 1 + colTotal, colunas });
  });
  return out;
}

export type Dica = { mes: number | null; ano: number | null; fonte: string; titulo: string };

const RE_TITULO =
  /(dashboard|\bdre\b|executivo|relatorio|fechamento|resultado|financeiro|mensal|demonstrativo|painel)/;

function dicaDoBloco(aba: Aba, inicio: number, fim: number, hoje: { ano: number; mes: number }): Dica {
  type Achado = { mes: number | null; ano: number | null; fonte: string; titulo: string };
  let reserva: Achado | null = null;
  for (let r = fim - 1; r >= Math.max(inicio, fim - 30); r--) {
    const linha = aba.linhas[r] ?? [];
    let mesNome: number | null = null;
    let tituloMes = "";
    let maiorTexto = "";
    let ehTitulo = false;
    let data: { ano: number | null; mes: number } | null = null;
    for (const cel of linha) {
      if (typeof cel === "string") {
        if (cel.length > maiorTexto.length) maiorTexto = cel;
        if (RE_TITULO.test(sem(cel))) ehTitulo = true;
        const n = mesNoTexto(cel);
        if (n && !mesNome) {
          mesNome = n;
          tituloMes = celulaTexto(cel);
        }
      } else if (typeof cel === "number" && colunaDeMesPlausivel(cel)) {
        const m = mesDe(cel);
        if (m && m.ano != null && m.ano >= hoje.ano - 6 && m.ano <= hoje.ano + 1 && !data) data = m;
      }
    }
    if (!mesNome && !data) continue;
    const achado: Achado = {
      mes: mesNome ?? data?.mes ?? null,
      ano: data?.ano ?? null,
      fonte: mesNome ? "o nome do mês no título" : "a data do bloco",
      titulo: celulaTexto(tituloMes || maiorTexto) || (data ? `Bloco de ${mesChave(data.ano ?? 0, data.mes)}` : ""),
    };
    if (ehTitulo) return achado;
    if (!reserva) reserva = achado;
  }
  return reserva ?? { mes: null, ano: null, fonte: "", titulo: "" };
}

/** Decide o mês de cada bloco a partir dos títulos/datas, corrigindo datas copiadas por engano. */
export function resolverMesesDosBlocos(
  dicas: Dica[],
  hoje: { ano: number; mes: number },
): Array<{ mes: string; deduzidoPor: string }> {
  // Sentido dos blocos: do mais novo para o mais antigo, ou o contrário.
  let desc = 0;
  let asc = 0;
  for (let i = 1; i < dicas.length; i++) {
    const a = dicas[i - 1].mes;
    const b = dicas[i].mes;
    if (a == null || b == null) continue;
    const d = (b - a + 12) % 12;
    if (d === 11) desc++;
    else if (d === 1) asc++;
  }
  const passo = desc > asc ? -1 : 1;

  const resolvidos: Array<{ mes: string; deduzidoPor: string }> = [];
  dicas.forEach((d, i) => {
    if (i === 0) {
      const mes = d.mes ?? hoje.mes;
      let ano = d.ano;
      const plausivel = ano != null && ano >= hoje.ano - 6 && ano <= hoje.ano + 1;
      if (!plausivel) ano = mes <= hoje.mes ? hoje.ano : hoje.ano - 1;
      resolvidos.push({
        mes: mesChave(ano as number, mes),
        deduzidoPor: d.mes ? `${d.fonte}` : "o mês atual (o bloco não diz o mês)",
      });
      return;
    }
    const anterior = resolvidos[i - 1].mes;
    const esperado = somaMeses(anterior, passo);
    if (d.mes != null) {
      for (let s = 1; s <= 6; s++) {
        const cand = somaMeses(anterior, passo * s);
        if (Number(cand.slice(5, 7)) === d.mes) {
          resolvidos.push({
            mes: cand,
            deduzidoPor: s === 1 ? d.fonte : `${d.fonte} (pulou ${s - 1} mês(es))`,
          });
          return;
        }
      }
    }
    resolvidos.push({
      mes: esperado,
      deduzidoPor: d.mes
        ? "a sequência dos blocos (a data do título se repete ou está fora de ordem)"
        : "a sequência dos blocos",
    });
  });
  return resolvidos;
}

function detectarBlocos(aba: Aba, hoje: { ano: number; mes: number }): LayoutDre[] {
  const cabecalhos = acharCabecalhosDeBloco(aba);
  if (!cabecalhos.length) return [];

  const dicas = cabecalhos.map((c, i) =>
    dicaDoBloco(aba, i === 0 ? 0 : cabecalhos[i - 1].r + 1, c.r, hoje),
  );
  const meses = resolverMesesDosBlocos(dicas, hoje);

  const itens: ItemDre[] = [];
  const resultadoPorMes = new Map<string, number>();
  const blocos: LayoutDre["blocos"] = [];
  const avisos: string[] = [];
  const todosPais: string[] = [];

  cabecalhos.forEach((cab, i) => {
    const fimLinhas = i + 1 < cabecalhos.length ? cabecalhos[i + 1].r : aba.linhas.length;
    const blocoId = `${aba.nome}#bloco@${aba.linhaInicial + cab.r}`;
    const idxTotal = cab.colunas.length - 1;
    const lidas: LinhaLida[] = [];
    for (let k = cab.r + 1; k < fimLinhas; k++) {
      const row = aba.linhas[k] ?? [];
      lidas.push({
        linha: aba.linhaInicial + k,
        rotuloBruto: celulaTexto(row[cab.colRotulo]),
        valores: cab.colunas.map((c) => (typeof row[c] === "number" ? (row[c] as number) : numeroDe(row[c]))),
      });
    }
    const teste = cab.colunas.map((_, idx) => idx);
    const { folhas, pais, resultado } = classificar(lidas, teste);
    normalizarSinal(folhas, [idxTotal]);
    todosPais.push(...pais);

    const mes = meses[i].mes;
    blocos.push({
      id: blocoId,
      linha: aba.linhaInicial + cab.r,
      titulo: dicas[i].titulo || `Bloco da linha ${aba.linhaInicial + cab.r}`,
      mes,
      deduzidoPor: meses[i].deduzidoPor,
    });
    if (resultado && resultado[idxTotal] != null) resultadoPorMes.set(blocoId, resultado[idxTotal] as number);

    for (const f of folhas) {
      const v = f.valores[idxTotal];
      if (v == null || Math.abs(v) < 0.005 || v < 0) continue;
      itens.push({
        mes,
        tipo: f.tipo,
        rotulo: f.rotulo,
        valor: arredonda2(v),
        linha: f.linha,
        origemTipo: f.origemTipo,
        blocoId,
      });
    }
  });

  if (todosPais.length) {
    const unicos = [...new Set(todosPais)];
    avisos.push(`Linhas de subtotal ignoradas (já somadas nas linhas de baixo): ${unicos.join(", ")}.`);
  }

  const consolidados = consolidar(itens);
  // O resultado da planilha vem por bloco; converte para mês.
  const resultadoMes = new Map<string, number>();
  blocos.forEach((b) => {
    const v = resultadoPorMes.get(b.id);
    if (v != null) resultadoMes.set(b.mes, v);
  });
  const resumo = resumir(consolidados, resultadoMes);
  if (!resumo.length || !consolidados.some((i) => i.tipo === "receita") || !consolidados.some((i) => i.tipo === "despesa")) {
    return [];
  }
  const repetidos = blocos.filter((b, i) => blocos.findIndex((x) => x.mes === b.mes) !== i);
  if (repetidos.length) avisos.push("Dois blocos ficaram no mesmo mês — confira os meses abaixo antes de importar.");

  return [
    {
      id: `${aba.nome}#blocos`,
      aba: aba.nome,
      formato: "blocos-por-mes",
      descricao: `${blocos.length} bloco(s), um por mês (colunas por semana e "Total")`,
      blocos,
      meses: resumo,
      itens: consolidados,
      avisos,
    },
  ];
}

/** Todas as DREs que dá para ler na aba, da mais confiável para a menos. */
export function lerDreDaAba(aba: Aba, hoje: { ano: number; mes: number }): LayoutDre[] {
  const todas = [...detectarMeses(aba, hoje.ano), ...detectarBlocos(aba, hoje)];
  return todas.sort((a, b) => pontuarLayout(b) - pontuarLayout(a));
}

export function pontuarLayoutDre(l: LayoutDre): number {
  return pontuarLayout(l);
}
