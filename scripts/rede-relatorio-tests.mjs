#!/usr/bin/env node
/**
 * Testes dos relatórios da rede (sem banco, sem navegador): cabeçalho padrão (cliente, período, unidades, data de
 * geração, origem dos dados — COMANDO MESTRE §25) e as exportações CSV de Metas e indicadores e de CMV.
 * Cobre: data no horário de Brasília (inclusive virada do dia), lista de unidades, cabeçalho no CSV sem alterar a
 * tabela, CSV de Excel (separador, aspas, BOM), tabelas retangulares, status iguais aos da tela e as telas que
 * precisam trazer o cabeçalho.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { gerarCsv } from "../lib/rede/csv.ts";
import { calcularContagem } from "../lib/rede/financeiro.ts";
import {
  CSS_IMPRESSAO_RELATORIO,
  comCabecalhoCsv,
  descreverUnidades,
  formatarGeradoEm,
  linhasCabecalhoCsv,
  unidadesDaTela,
} from "../lib/rede/relatorio.ts";
import {
  ROTULO_STATUS,
  linhasCsvCmvItens,
  linhasCsvCmvSemanas,
  linhasCsvIndicadoresMes,
  linhasCsvMetasFaturamento,
  linhasCsvMetasVigentes,
} from "../lib/rede/relatorios-csv.ts";
import { INDICADORES } from "../lib/rede/tipos.ts";
import { lerPerfil, veRedeInteira } from "../lib/rede/permissoes.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FALHOU:", msg);
  }
}
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}
const retangular = (linhas) => linhas.every((l) => l.length === linhas[0].length);
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ data de geração (horário de Brasília) */
igual(formatarGeradoEm(new Date("2026-11-19T16:42:00Z")), "19/11/2026 13:42", "UTC 16:42 = 13:42 em Brasília");
igual(formatarGeradoEm(new Date("2026-11-20T02:59:00Z")), "19/11/2026 23:59", "um minuto antes da virada do dia");
igual(formatarGeradoEm(new Date("2026-11-20T03:00:00Z")), "20/11/2026 00:00", "meia-noite é 00:00 (nunca 24:00)");
igual(formatarGeradoEm(new Date("2026-01-05T11:05:00Z")), "05/01/2026 08:05", "dia, mês e hora com dois dígitos");
igual(formatarGeradoEm(new Date("2026-12-31T23:30:00Z")), "31/12/2026 20:30", "fim de ano");

/* ------------------------------------------------------------------ unidades incluídas */
igual(descreverUnidades([]), "Nenhuma unidade", "sem unidades");
igual(descreverUnidades(["  ", ""]), "Nenhuma unidade", "nomes em branco não contam");
igual(descreverUnidades(["Brooklyn"], true), "Brooklyn", "loja filtrada: só o nome");
igual(descreverUnidades(["Brooklyn"]), "Rede toda — 1 unidade: Brooklyn", "rede com uma loja: singular");
igual(descreverUnidades(["A", "B", "C"]), "Rede toda — 3 unidades: A, B, C", "rede toda lista os nomes");
igual(descreverUnidades(["A", "B"], true), "Seleção — 2 unidades: A, B", "seleção de mais de uma");
{
  const treze = Array.from({ length: 13 }, (_, i) => `L${i + 1}`);
  const t = descreverUnidades(treze);
  assert(t.startsWith("Rede toda — 13 unidades: L1, L2"), "lista longa: conta todas");
  assert(t.endsWith("L12 e mais 1"), `lista longa: abrevia depois de 12 (${t})`);
  assert(!t.includes("L13"), "lista longa: o 13º não aparece por nome");
}
igual(unidadesDaTela([{ nome: "A", status: "operando" }, { nome: "B", status: "inativa" }, { nome: "C", status: "inauguracao" }]), "Rede toda — 2 unidades: A, C", "loja inativa não entra");
igual(unidadesDaTela([{ nome: "A" }, { nome: "B" }], { nome: "B" }), "B", "loja filtrada vence a lista");
igual(unidadesDaTela([{ nome: "A" }, { nome: "B" }], null, true), "Lojas do seu acesso — 2 unidades: A, B", "quem só vê parte da rede não recebe o rótulo \"Rede toda\"");
igual(unidadesDaTela([{ nome: "A" }], null, true), "Lojas do seu acesso — 1 unidade: A", "acesso a uma loja: singular");
igual(unidadesDaTela([{ nome: "A" }], { nome: "A" }, true), "A", "loja filtrada: só o nome, mesmo com acesso parcial");
igual(descreverUnidades(["A", "B"], false, true), "Lojas do seu acesso — 2 unidades: A, B", "descreverUnidades com acesso parcial");
igual(descreverUnidades(["A", "B"], true, true), "Seleção — 2 unidades: A, B", "seleção explícita vence o acesso parcial");

/* ------------------------------------------------------------------ quem vê a rede inteira */
igual(veRedeInteira(lerPerfil({ papel: "administrador", todas_lojas: false, loja_ids: [], modulos: {} })), true, "administrador vê a rede inteira");
igual(veRedeInteira(lerPerfil({ papel: "consultor", todas_lojas: false, loja_ids: [], modulos: {} })), true, "consultor vê a rede inteira");
igual(veRedeInteira(lerPerfil({ papel: "diretoria", todas_lojas: true, loja_ids: [], modulos: {} })), true, "diretoria com todas as lojas");
igual(veRedeInteira(lerPerfil({ papel: "gerente_regional", todas_lojas: false, loja_ids: ["A"], modulos: {} })), false, "gerente regional de algumas lojas: acesso parcial");
igual(veRedeInteira(lerPerfil({ papel: "gerente_loja", todas_lojas: false, loja_ids: ["A"], modulos: {} })), false, "gerente de loja: acesso parcial");
igual(veRedeInteira(null), false, "sem perfil: não vê a rede inteira");

/* ------------------------------------------------------------------ cabeçalho no CSV */
const META = {
  titulo: "Vendas por loja",
  cliente: "Fat Buddha (Demonstração)",
  filtros: "Período out/2026; mês de referência out/2026",
  unidades: "Rede toda — 2 unidades: A, B",
  origemDados: "Vendas diárias lançadas ou importadas no Gestão no Foco",
};
{
  const cab = linhasCabecalhoCsv(META, "19/11/2026 13:42");
  igual(cab.map((l) => l[0]), ["Relatório", "Cliente", "Período e filtros", "Unidades", "Gerado em", "Origem dos dados", ""], "cabeçalho: seis informações e uma linha em branco");
  igual(cab[1], ["Cliente", "Fat Buddha (Demonstração)"], "cabeçalho: cliente");
  igual(cab[4], ["Gerado em", "19/11/2026 13:42"], "cabeçalho: data de geração informada");
  const tabela = [["Loja", "Valor"], ["A", 10]];
  const completo = comCabecalhoCsv(tabela, META, "19/11/2026 13:42");
  igual(completo.slice(-2), tabela, "a tabela vem inteira depois do cabeçalho");
  igual(completo.length, tabela.length + 7, "sete linhas a mais");
  igual(tabela, [["Loja", "Valor"], ["A", 10]], "a tabela original não é alterada");
  igual(comCabecalhoCsv(tabela, null, "x"), tabela, "sem metadados, a tabela segue como veio");
  igual(comCabecalhoCsv(tabela, undefined, "x"), tabela, "metadados indefinidos: idem");
  assert(comCabecalhoCsv(tabela, null, "x") !== tabela, "devolve cópia, não a mesma lista");

  const csv = gerarCsv(completo);
  assert(csv.startsWith("\uFEFFRelatório;Vendas por loja\r\n"), "CSV começa com BOM e o nome do relatório");
  assert(csv.split("\uFEFF").length === 2, "um único BOM");
  assert(csv.includes('Período e filtros;"Período out/2026; mês de referência out/2026"\r\n'), "texto com ponto e vírgula vai entre aspas");
  assert(csv.includes("Gerado em;19/11/2026 13:42\r\n"), "data de geração no CSV");
  assert(csv.includes("\r\n;\r\nLoja;Valor\r\nA;10\r\n") || csv.includes("\r\n\r\nLoja;Valor\r\nA;10\r\n") || csv.includes("\r\n\r\nLoja;Valor"), "linha em branco separa o cabeçalho da tabela");
  assert(csv.endsWith("A;10\r\n"), "termina na última linha da tabela");
  // texto que começa com = + - @ não vira fórmula no Excel
  const perigoso = gerarCsv(comCabecalhoCsv([["x"]], { ...META, titulo: "=SOMA(A1)", filtros: "-5%" }, "g"));
  assert(perigoso.includes("Relatório;'=SOMA(A1)") && perigoso.includes("Período e filtros;'-5%"), "cabeçalho também é protegido contra fórmula");
}

/* ------------------------------------------------------------------ CSS de impressão */
for (const trecho of ['[data-slot="sidebar"]', "[data-app-header-premium]", "[data-mobile-bottom-nav]", "[data-brand-footer]", ".fixed", "@page { size: A4 landscape", "print-color-adjust: exact", "overflow: visible !important"]) {
  assert(CSS_IMPRESSAO_RELATORIO.includes(trecho), `CSS de impressão cobre ${trecho}`);
}
assert(CSS_IMPRESSAO_RELATORIO.trim().startsWith("@media print {") && CSS_IMPRESSAO_RELATORIO.trim().endsWith("}"), "todo o CSS fica dentro de @media print (a tela não muda)");
{
  const aberto = (CSS_IMPRESSAO_RELATORIO.match(/{/g) ?? []).length;
  const fechado = (CSS_IMPRESSAO_RELATORIO.match(/}/g) ?? []).length;
  assert(aberto === fechado, "chaves do CSS balanceadas");
}

/* ------------------------------------------------------------------ metas vigentes */
const LOJAS = [{ id: "A", nome: "Loja A" }, { id: "B", nome: "Loja B" }];
const M = (id, lojaId, indicador, meta, direcao, validoDe, validoAte = null) => ({ id, lojaId, indicador, meta, direcao, validoDe, validoAte });
const METAS = [
  M("1", null, "cmv", 30, "max", "2026-01-01"),
  M("2", "B", "cmv", 28, "max", "2026-03-01"),
  M("3", null, "cmv", 32, "max", "2025-01-01", "2025-12-31"), // histórico: fora
  M("4", null, "ifood", 4.5, "min", "2026-01-01"),
  M("5", null, "turnover", null, null, "2026-01-01"), // só acompanhar
];
{
  const l = linhasCsvMetasVigentes(LOJAS, METAS);
  igual(l[0], ["Escopo", "Indicador", "Grupo", "Regra", "Meta", "Vale desde"], "metas vigentes: colunas");
  assert(retangular(l), "metas vigentes: tabela retangular");
  igual(l.length - 1, 4, "metas vigentes: só as vigentes (a vencida fica de fora)");
  const nomeCmv = INDICADORES.find((i) => i.k === "cmv").nome;
  igual(l.find((x) => x[0] === "Padrão da rede" && x[1] === nomeCmv), ["Padrão da rede", nomeCmv, INDICADORES.find((i) => i.k === "cmv").grupo, "no máximo", 30, "01/01/2026"], "meta da rede com regra, número e data");
  igual(l.find((x) => x[0] === "Loja B")?.slice(3), ["no máximo", 28, "01/03/2026"], "meta própria da loja B");
  assert(!l.some((x) => x[0] === "Loja A"), "loja sem meta própria não ganha linha (usa a da rede)");
  const acomp = l.find((x) => x[1] === INDICADORES.find((i) => i.k === "turnover").nome);
  igual(acomp.slice(3), ["só acompanhar", null, "01/01/2026"], "só acompanhar: sem número de meta");
  igual(linhasCsvMetasVigentes(LOJAS, []), [["Escopo", "Indicador", "Grupo", "Regra", "Meta", "Vale desde"]], "sem metas: só o cabeçalho da tabela");
}

/* ------------------------------------------------------------------ indicadores do mês */
const IND = (lojaId, indicador, valor, origem = "manual", mes = "2026-10-01") => ({ lojaId, mes, indicador, valor, origem });
{
  const entrada = {
    lojas: LOJAS,
    metas: METAS,
    indicadores: [IND("A", "cmv", 99), IND("A", "ifood", 4.8), IND("B", "ifood", 4.0, "exemplo"), IND("A", "ifood", 1, "manual", "2026-09-01")],
    calculados: [IND("A", "cmv", 29, "calculado"), IND("B", "cmv", 33, "calculado")],
    mes: "2026-10",
    tolPct: 10,
  };
  const l = linhasCsvIndicadoresMes(entrada);
  igual(l[0], ["Loja", "Indicador", "Grupo", "Regra da meta", "Meta", "Valor", "Situação", "Origem do valor"], "indicadores: colunas");
  assert(retangular(l), "indicadores: tabela retangular");
  const manuais = INDICADORES.filter((i) => !i.calculado);
  igual(l.length - 1, LOJAS.length * manuais.length, "indicadores: uma linha por loja e indicador lançável");
  assert(!l.some((x) => x[1] === INDICADORES.find((i) => i.k === "fat").nome), "faturamento (calculado das vendas) não entra aqui, como na tela");
  const linha = (loja, k) => l.find((x) => x[0] === loja && x[1] === INDICADORES.find((i) => i.k === k).nome);
  // CMV da loja A: calculado (29) vale mais que o lançado à mão (99); meta 30 "no máximo" → na meta
  igual([linha("Loja A", "cmv")[5], linha("Loja A", "cmv")[6]], [29, ROTULO_STATUS.ok], "valor calculado sobrepõe o lançado e fica na meta");
  assert(linha("Loja A", "cmv")[7].startsWith("Calculado das contagens de CMV"), "origem: calculado das contagens");
  // CMV da loja B: meta própria 28; 33 → desvio 17,9% > 10% → fora
  igual([linha("Loja B", "cmv")[4], linha("Loja B", "cmv")[5], linha("Loja B", "cmv")[6]], [28, 33, ROTULO_STATUS.bad], "meta própria da loja e situação fora da meta");
  // iFood: mínimo 4,5; A lança 4,8 (na meta); B 4,0 exemplo → 11,1% abaixo → fora; origem exemplo
  igual([linha("Loja A", "ifood")[5], linha("Loja A", "ifood")[6], linha("Loja A", "ifood")[7]], [4.8, ROTULO_STATUS.ok, "Lançado"], "lançado dentro da meta mínima");
  igual([linha("Loja B", "ifood")[6], linha("Loja B", "ifood")[7]], [ROTULO_STATUS.bad, "Exemplo (demonstração)"], "valor de exemplo vem identificado");
  // sem lançamento: valor vazio, situação neutra, origem "Sem lançamento"
  const semLanc = linha("Loja A", "turnover");
  igual([semLanc[5], semLanc[6], semLanc[7]], [null, ROTULO_STATUS.neu, "Sem lançamento"], "sem lançamento: nada inventado");
  // mês é filtrado: o valor de setembro (1) não aparece em outubro
  assert(linha("Loja A", "ifood")[5] !== 1, "lançamento de outro mês não entra");
  // meta só acompanhar → situação neutra mesmo com valor
  const comValor = linhasCsvIndicadoresMes({ ...entrada, indicadores: [...entrada.indicadores, IND("A", "turnover", 7)] });
  const t = comValor.find((x) => x[0] === "Loja A" && x[1] === INDICADORES.find((i) => i.k === "turnover").nome);
  igual([t[3], t[4], t[5], t[6]], ["só acompanhar", null, 7, ROTULO_STATUS.neu], "só acompanhar: mostra o valor e não julga");
  // exatamente 10% fora = atenção (divergência documentada do HTML)
  const dez = linhasCsvIndicadoresMes({ ...entrada, metas: [M("x", null, "ifood", 5, "min", "2026-01-01")], indicadores: [IND("A", "ifood", 4.5)], calculados: [] });
  igual(dez.find((x) => x[0] === "Loja A" && x[1] === INDICADORES.find((i) => i.k === "ifood").nome)[6], ROTULO_STATUS.warn, "exatamente 10% fora da meta é atenção");
}

/* ------------------------------------------------------------------ metas de faturamento */
{
  const MF = [
    { lojaId: "B", mes: "2026-02-01", valor: 90000 },
    { lojaId: "A", mes: "2026-11-01", valor: 120000.5 },
    { lojaId: "A", mes: "2026-10-01", valor: 100000 },
    { lojaId: "A", mes: "2025-12-01", valor: 1 },
    { lojaId: "Z", mes: "2026-10-01", valor: 5 },
  ];
  const l = linhasCsvMetasFaturamento(LOJAS, MF, "2026");
  igual(l[0], ["Loja", "Mês", "Meta de faturamento (R$)"], "faturamento: colunas");
  igual(l.slice(1), [["Loja A", "10/2026", 100000], ["Loja A", "11/2026", 120000.5], ["Loja B", "02/2026", 90000]], "faturamento: só o ano, ordenado por loja e mês, sem loja desconhecida");
  igual(linhasCsvMetasFaturamento(LOJAS, [], "2026"), [["Loja", "Mês", "Meta de faturamento (R$)"]], "faturamento sem metas: só o cabeçalho da tabela");
}

/* ------------------------------------------------------------------ CMV */
const CONTAGEM = (lojaId, semana, o = {}) => ({ id: `${lojaId}${semana}`, lojaId, semana, vendas: 10000, cmvTeorico: 30, estoqueInicial: 1000, compras: 3000, transferenciasEntrada: 0, transferenciasSaida: 0, devolucoes: 0, estoqueFinal: 1000, responsavel: "Rita", observacoes: null, origem: "manual", ...o });
{
  // A: 3000 de CMV real em 10000 = 30% (na meta 30 máx.). B: 3300 em 10000 = 33% (meta própria 28 → fora).
  const calc = [
    calcularContagem(CONTAGEM("A", "2026-11-09"), null),
    calcularContagem(CONTAGEM("B", "2026-11-09", { compras: 3300 }), null),
    calcularContagem(CONTAGEM("A", "2026-11-02", { vendas: null }), 12000), // vendas do módulo: 3000/12000 = 25%
    calcularContagem(CONTAGEM("B", "2026-11-02", { vendas: null }), null), // sem vendas na base
  ];
  const metas = [M("1", null, "cmv", 30, "max", "2026-01-01"), M("2", "B", "cmv", 28, "max", "2026-03-01")];
  const l = linhasCsvCmvSemanas({ lojas: LOJAS, calc, metas, tolPct: 10, tolDispersao: 2 });
  igual(l[0].length, 17, "CMV semanas: 17 colunas");
  assert(retangular(l), "CMV semanas: tabela retangular");
  igual(l.length - 1, 4, "CMV semanas: uma linha por contagem");
  igual(l.slice(1).map((x) => [x[0], x[1]]), [["09/11/2026", "Loja A"], ["09/11/2026", "Loja B"], ["02/11/2026", "Loja A"], ["02/11/2026", "Loja B"]], "CMV semanas: mais recente primeiro, depois por loja");
  const [a, b, a2, b2] = l.slice(1);
  igual([a[8], a[9], a[10], a[11], a[12], a[13]], [3000, 10000, "Informada na contagem", 30, 30, 0], "A: CMV real, vendas, base, %, teórico e dispersão");
  igual([a[14], a[15]], [ROTULO_STATUS.ok, ROTULO_STATUS.ok], "A: na meta e sem dispersão");
  igual([b[8], b[11], b[13]], [3300, 33, 3], "B: CMV real 3.300 = 33%, dispersão +3 p.p.");
  igual([b[14], b[15]], [ROTULO_STATUS.bad, ROTULO_STATUS.warn], "B: fora da meta própria (28) e dispersão em atenção (3 > 2 e ≤ 4)");
  igual([a2[9], a2[10], a2[11]], [12000, "Soma do módulo Vendas", 25], "A semana anterior: vendas vêm do módulo Vendas");
  igual([b2[9], b2[10], b2[11], b2[13], b2[14], b2[15]], [null, "Sem vendas na base", null, null, ROTULO_STATUS.neu, ROTULO_STATUS.neu], "sem vendas na base: nada de percentual inventado");
  igual(a[16], "Rita", "responsável");
  igual(linhasCsvCmvSemanas({ lojas: [LOJAS[0]], calc, metas, tolPct: 10, tolDispersao: 2 }).length - 1, 2, "loja fora da lista (filtro) não aparece");
}
{
  const itens = [
    { lojaId: "B", semana: "2026-11-09", item: "Frango", consumoTeorico: 100, consumoReal: 103 },
    { lojaId: "A", semana: "2026-11-09", item: "Arroz", consumoTeorico: 50, consumoReal: 50 },
    { lojaId: "A", semana: "2026-11-09", item: "Batata", consumoTeorico: 80, consumoReal: 100 },
    { lojaId: "A", semana: "2026-11-09", item: "Molho", consumoTeorico: 0, consumoReal: 5 },
    { lojaId: "Z", semana: "2026-11-09", item: "Fantasma", consumoTeorico: 1, consumoReal: 1 },
  ];
  const l = linhasCsvCmvItens(LOJAS, itens, "2026-11-09");
  igual(l[0], ["Semana (segunda)", "Loja", "Item", "Consumo teórico", "Consumo real", "Diferença (%)", "Situação"], "itens: colunas");
  assert(retangular(l), "itens: tabela retangular");
  igual(l.slice(1).map((x) => [x[1], x[2]]), [["Loja A", "Arroz"], ["Loja A", "Batata"], ["Loja A", "Molho"], ["Loja B", "Frango"]], "itens: por loja e item, sem loja desconhecida");
  igual(l[1].slice(3), [50, 50, 0, "Dentro do esperado"], "item no teórico");
  igual(l[2].slice(3), [80, 100, 25, "Crítico"], "item 25% acima do teórico: crítico");
  igual(l[3].slice(3), [0, 5, null, "Sem teórico"], "teórico zero: sem percentual");
  igual(l[4].slice(3), [100, 103, 3, "Atenção"], "regra da tela: até +2% verde, até +5% amarelo — +3% é atenção");
}

/* ------------------------------------------------------------------ telas: todas trazem o cabeçalho do relatório */
{
  const TELAS = {
    "app/(app)/[tenant]/rede/page.tsx": "Visão geral da rede",
    "app/(app)/[tenant]/rede/vendas/page.tsx": "Vendas por loja",
    "app/(app)/[tenant]/rede/metas/page.tsx": "Metas e indicadores",
    "app/(app)/[tenant]/rede/cmv/page.tsx": "CMV semanal",
    "app/(app)/[tenant]/rede/dre/page.tsx": "DRE orçado × realizado",
    "app/(app)/[tenant]/rede/cozinha/page.tsx": "Cozinha central",
    "app/(app)/[tenant]/rede/delivery/page.tsx": "Checklist de delivery",
    "app/(app)/[tenant]/rede/orcamento/page.tsx": "Orçamento e expansão",
    "app/(app)/[tenant]/rede/qualidade/page.tsx": "Checklist de qualidade",
    "app/(app)/[tenant]/rede/rh/page.tsx": "RH",
    "app/(app)/[tenant]/rede/planos/page.tsx": "Planos de ação",
  };
  for (const [arq, titulo] of Object.entries(TELAS)) {
    const src = readFileSync(join(raiz, arq), "utf8");
    assert(src.includes("<RelatorioProvider"), `${arq}: envolve a tela com o relatório`);
    assert(src.includes("formatarGeradoEm(new Date())"), `${arq}: informa a data de geração`);
    assert(src.includes(titulo), `${arq}: título do relatório "${titulo}"`);
    for (const campo of ["cliente:", "filtros:", "unidades:", "origemDados:"]) assert(src.includes(campo), `${arq}: informa ${campo.replace(":", "")}`);
    assert(src.includes("ctx.tenant.name"), `${arq}: o cliente é o nome da empresa`);
    assert(!src.includes("CabecalhoImpressao"), `${arq}: não monta cabeçalho solto (usa o provider)`);
  }
  const layout = readFileSync(join(raiz, "app/(app)/[tenant]/rede/layout.tsx"), "utf8");
  assert((layout.match(/print:hidden/g) ?? []).length >= 2, "layout da rede: cabeçalho do módulo e navegação não saem na impressão");
  assert(layout.includes("Ambiente de demonstração"), "layout da rede: o aviso de demonstração continua (e imprime)");
  const acoes = readFileSync(join(raiz, "components/rede/acoes-exportar.tsx"), "utf8");
  assert(acoes.includes("comCabecalhoCsv") && acoes.includes("useRelatorio"), "exportar CSV usa o cabeçalho do relatório");
  assert(acoes.includes("print:hidden"), "botões de exportar não saem na impressão");
}

console.log(`rede-relatorio-tests: ${pass} ok${fail ? `, ${fail} FALHARAM` : ""}`);
process.exit(fail ? 1 : 0);
