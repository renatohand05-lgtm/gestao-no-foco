#!/usr/bin/env node
/**
 * Testes do financeiro da rede de lojas (CMV, DRE, orçamento/expansão).
 * 1) Paridade número a número com o painel original: o gabarito
 *    scripts/fixtures/rede-html-financeiro.json foi gerado rodando as funções do próprio HTML
 *    (dreCalc, orcDre, cmvReal) sobre os dados dele.
 * 2) Regras novas do sistema: sinais do CMV, tolerância, mês, prioridade do lançamento real
 *    sobre a estimativa, sem dupla contagem, orçado × realizado, cenários, calendário.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHAVE_DRE,
  CURVA_PADRAO,
  DRE_LINHAS,
  ORCAMENTO_PADRAO,
  PREMISSAS_DRE_PADRAO,
  alertasCmv,
  calcularContagem,
  calcularContagens,
  calcularDreRede,
  calcularUnidades,
  cmvDoMes,
  cmvPercentual,
  cmvReais,
  compararDre,
  consolidarDre,
  descreverNovas,
  dispersaoPP,
  distribuicaoDeCem,
  dreCalc,
  dreOrcadoLoja,
  dreRealizadoLoja,
  ehSegunda,
  excecoesDaLoja,
  impactoMensal,
  indicadoresCmv,
  linhasCsvComparativo,
  linhasCsvDre,
  mesclarIndicadores,
  mesesEntre,
  montarDre,
  orcDre,
  premissasDaLoja,
  premissasPadrao,
  projecaoRede,
  projetarCurva,
  resultadoPrimeiroAno,
  resumirCenario,
  resumirSemana,
  segundaDaSemana,
  simularRede,
  somarMeses,
  statusDispersao,
  desvioItemPct,
  statusItem,
  vendasPorSemana,
} from "../lib/rede/financeiro.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FALHOU:", msg);
  }
}
const perto = (a, b, tol = 1e-6) => a != null && b != null && Math.abs(a - b) <= tol;
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}
/** Compara com tolerância relativa de 1e-9 (mesma aritmética: deve ser praticamente idêntico). */
function colado(a, b, msg) {
  const tol = Math.max(1e-6, Math.abs(b) * 1e-9);
  assert(perto(a, b, tol), `${msg} — obtido ${a}, esperado ${b}`);
}

const aqui = dirname(fileURLToPath(import.meta.url));
const G = JSON.parse(readFileSync(join(aqui, "fixtures", "rede-html-financeiro.json"), "utf8"));
const CHAVES_DRE = ["fat", "sal", "del", "imp", "rl", "cmv", "folha", "cdel", "man", "mkt", "cto", "agua", "energia", "res", "mg", "pe", "varPct"];

function confereDre(obtido, esperado, rotulo) {
  for (const k of CHAVES_DRE) colado(obtido[k], esperado[k], `${rotulo}: ${k}`);
}

/* ================================================================== paridade com o HTML */

// DRE das 4 lojas em operação (premissas, CMV e folha do mês, exceção da Vila Mariana)
for (const x of G.lojas) confereDre(dreCalc(x.entrada), x.saida, `DRE ${x.id}`);
assert(G.lojas.length === 4, "gabarito tem 4 lojas");
colado(G.lojas.find((x) => x.id === "vilamariana").entrada.delivery, 27, "exceção da Vila Mariana (delivery 27%) está no gabarito");

// consolidado da rede
{
  const rede = consolidarDre(G.lojas.map((x) => dreCalc(x.entrada)));
  for (const k of ["fat", "sal", "del", "imp", "rl", "cmv", "folha", "cdel", "man", "mkt", "cto", "agua", "energia", "res", "mg", "pe"]) colado(rede[k], G.rede[k], `rede: ${k}`);
}

// casos de variação de premissa (base total, folha em R$, sem delivery, números quebrados)
G.dreCasos.forEach((c, i) => confereDre(dreCalc(c.entrada), c.saida, `DRE caso ${i + 1}`));

// montarDre (a partir das linhas em R$) devolve exatamente o mesmo resultado de dreCalc
for (const c of G.dreCasos) {
  const d = dreCalc(c.entrada);
  const m = montarDre({ fat: d.fat, fatDel: d.del, imp: d.imp, cmv: d.cmv, folha: d.folha, cdel: d.cdel, man: d.man, mkt: d.mkt, cto: d.cto, agua: d.agua, energia: d.energia });
  confereDre(m, d, "montarDre == dreCalc");
}

// orçamento de nova loja: DRE maduro, curva, acumulado, 1º ano
{
  const o = G.orcamento.premissas;
  const P = {
    faturamento: o.faturamento,
    mixDelivery: o.mixDelivery,
    cmv: o.cmv,
    folha: o.folha,
    impostos: o.impostos,
    custoDelivery: o.delivery,
    baseDelivery: o.deliveryBase,
    manutencao: o.manutencao,
    marketing: o.marketing,
    cto: o.cto,
    agua: o.agua,
    energia: o.energia,
  };
  igual(P, ORCAMENTO_PADRAO, "premissas padrão do orçamento = as do HTML");
  igual([...CURVA_PADRAO], G.orcamento.curva, "curva padrão 70/80/90/95/100/100");
  confereDre(orcDre(P), G.orcamento.dre, "orçamento maduro");
  const { linhas, acumulado } = projetarCurva(P, G.orcamento.curva);
  linhas.forEach((l, i) => confereDre(l.d, G.orcamento.mensal[i], `curva mês ${i + 1}`));
  acumulado.forEach((a, i) => colado(a, G.orcamento.acumulado[i], `acumulado mês ${i + 1}`));
  colado(resultadoPrimeiroAno(P, G.orcamento.curva), G.orcamento.primeiroAno, "resultado do 1º ano");
  colado(orcDre(P).res, 49500, "resultado maduro de R$ 49.500 por mês");

  // rede com 10 lojas: Brooklyn e Perdizes (DRE atual) + 8 pelo orçamento
  const base = G.lojas.filter((x) => G.orcamento.basesIds.includes(x.id)).map((x) => dreCalc(x.entrada));
  const rede = simularRede({ base, qtdNovas: G.orcamento.novas, orcado: orcDre(P) });
  for (const k of ["fat", "sal", "del", "imp", "rl", "cmv", "folha", "cdel", "man", "mkt", "cto", "agua", "energia", "res", "pe"]) colado(rede.consolidado[k], G.orcamento.rede10[k], `rede 10 lojas: ${k}`);
  colado(rede.novas.res, G.orcamento.dre.res * 8, "8 lojas no orçamento: resultado");
}

// cenários: mesmas funções do HTML com outras premissas
G.orcamentoCenarios.forEach((c, i) => {
  const o = c.premissas;
  const P = { faturamento: o.faturamento, mixDelivery: o.mixDelivery, cmv: o.cmv, folha: o.folha, impostos: o.impostos, custoDelivery: o.delivery, baseDelivery: o.deliveryBase, manutencao: o.manutencao, marketing: o.marketing, cto: o.cto, agua: o.agua, energia: o.energia };
  confereDre(orcDre(P), c.dre, `cenário ${i + 1} maduro`);
  const { linhas, acumulado } = projetarCurva(P, o.curva);
  linhas.forEach((l, j) => confereDre(l.d, c.mensal[j], `cenário ${i + 1} mês ${j + 1}`));
  colado(acumulado[acumulado.length - 1], c.acumulado[c.acumulado.length - 1], `cenário ${i + 1} acumulado final`);
  colado(resultadoPrimeiroAno(P, o.curva), c.primeiroAno, `cenário ${i + 1} 1º ano`);
});

// CMV: cada contagem do painel original e os KPIs da última semana
{
  const cs = G.cmv.contagens.map((r, i) => ({
    id: `c${i}`,
    lojaId: r.loja,
    semana: r.semana,
    vendas: r.vendas,
    cmvTeorico: r.cmvTeorico,
    estoqueInicial: r.estoqueInicial,
    compras: r.compras,
    transferenciasEntrada: 0,
    transferenciasSaida: 0,
    devolucoes: 0,
    estoqueFinal: r.estoqueFinal,
    responsavel: null,
    observacoes: null,
    origem: "exemplo",
  }));
  const calc = calcularContagens(cs, new Map());
  calc.forEach((c, i) => {
    colado(c.pct, G.cmv.contagens[i].real, `CMV real ${c.contagem.lojaId} ${c.contagem.semana}`);
    colado(c.dispersao, G.cmv.contagens[i].disp, `dispersão ${c.contagem.lojaId} ${c.contagem.semana}`);
  });
  const k = resumirSemana(calc, G.cmv.ultimaSemana, 21, 1);
  const e = G.cmv.kpis;
  colado(k.vendas, e.V, "vendas da última semana");
  colado(k.reais, e.Rr, "CMV real da rede (R$)");
  colado(k.teoricoReais, e.Tt, "CMV teórico da rede (R$)");
  colado(k.pctReal, e.pctReal, "CMV real da rede (%)");
  colado(k.pctTeorico, e.pctTeorico, "CMV teórico da rede (%)");
  colado(k.dispersao, e.disp, "dispersão da rede (p.p.)");
  colado(k.perda, e.perda, "perda estimada (R$)");
  assert(k.acimaMeta === e.acima, `lojas acima de 21%: ${k.acimaMeta} vs ${e.acima}`);
  assert(k.foraTolerancia === e.fora, `lojas fora da tolerância: ${k.foraTolerancia} vs ${e.fora}`);
  assert(calc.length === 32, "32 contagens");
}

/* ================================================================== CMV: regras do sistema */

const base0 = { estoqueInicial: 1000, compras: 500, transferenciasEntrada: 0, transferenciasSaida: 0, devolucoes: 0, estoqueFinal: 800 };
colado(cmvReais(base0), 700, "CMV = EI + compras − EF");
colado(cmvReais({ ...base0, transferenciasEntrada: 200 }), 900, "transferência de ENTRADA soma ao CMV");
colado(cmvReais({ ...base0, transferenciasSaida: 150 }), 550, "transferência de SAÍDA subtrai do CMV");
colado(cmvReais({ ...base0, devolucoes: 50 }), 650, "devolução a fornecedor subtrai do CMV");
colado(cmvReais({ ...base0, transferenciasEntrada: 200, transferenciasSaida: 150, devolucoes: 50 }), 700, "todos os movimentos juntos");
colado(cmvReais({ ...base0, estoqueFinal: 1700 }), -200, "estoque final maior que o disponível gera CMV negativo (contagem a conferir)");
colado(cmvPercentual(700, 3500), 20, "CMV % = reais / vendas × 100");
assert(cmvPercentual(700, 0) === null && cmvPercentual(700, null) === null, "sem vendas não há percentual");
colado(dispersaoPP(20.9, 19.9), 1, "dispersão = real − teórico");
igual([0.5, 1, 1.0000000001, 1.5, 2, 2.1, null].map((d) => statusDispersao(d, 1)), ["ok", "ok", "ok", "warn", "warn", "bad", "neu"], "régua da dispersão (≤ tol ok, ≤ 2×tol atenção, acima crítico)");

{
  // Dispersão por item: mesma régua do painel original (≤ 2% ok, ≤ 5% atenção, acima crítico)
  const itens = [["Salmão", 8, 9.4], ["Karaage empanado", 41, 44.5], ["Arroz japonês", 86, 89], ["Carne bovina (acém)", 22, 24.1], ["Frango (sobrecoxa)", 55, 56.2], ["Molho teriyaki (base)", 14, 15.3], ["Óleo de soja", 30, 33.5], ["Embalagem bowl 750 ml", 1480, 1530]];
  const desvios = itens.map(([, t, r]) => Math.round(desvioItemPct(t, r) * 10) / 10);
  igual(desvios, [17.5, 8.5, 3.5, 9.5, 2.2, 9.3, 11.7, 3.4], "desvio % por item do painel original");
  igual(itens.map(([, t, r]) => statusItem(desvioItemPct(t, r))), ["bad", "bad", "warn", "bad", "warn", "bad", "bad", "warn"], "status por item do painel original");
  igual([-3, 0, 2, 2.0000000001, 2.1, 5, 5.1, null, NaN].map(statusItem), ["ok", "ok", "ok", "ok", "warn", "warn", "bad", "neu", "neu"], "limites da régua de itens");
  igual(desvioItemPct(0, 5), null, "teórico zerado não tem desvio");
}

// semana (segunda a domingo) e vendas do módulo Vendas
igual(segundaDaSemana("2026-10-07"), "2026-10-05", "quarta 7/out → segunda 5/out");
igual(segundaDaSemana("2026-10-05"), "2026-10-05", "segunda continua segunda");
igual(segundaDaSemana("2026-10-11"), "2026-10-05", "domingo 11/out → segunda 5/out");
assert(ehSegunda("2026-10-26") && !ehSegunda("2026-10-27"), "ehSegunda");
{
  const vendas = [
    { lojaId: "a", data: "2026-10-05", salao: 100, delivery: 400, pedidosSalao: 1, pedidosDelivery: 1 },
    { lojaId: "a", data: "2026-10-11", salao: 0, delivery: 500, pedidosSalao: 0, pedidosDelivery: 1 },
    { lojaId: "a", data: "2026-10-12", salao: 0, delivery: 999, pedidosSalao: 0, pedidosDelivery: 1 },
    { lojaId: "b", data: "2026-10-06", salao: 50, delivery: 50, pedidosSalao: 1, pedidosDelivery: 1 },
  ];
  const m = vendasPorSemana(vendas);
  assert(m.get("a|2026-10-05") === 1000 && m.get("a|2026-10-12") === 999 && m.get("b|2026-10-05") === 100, "vendas somadas por loja e semana (domingo fica na semana da segunda anterior)");
  const c = { id: "x", lojaId: "a", semana: "2026-10-05", vendas: null, cmvTeorico: 19, ...base0, responsavel: null, observacoes: null, origem: "manual" };
  const semInformar = calcularContagem(c, m.get("a|2026-10-05"));
  assert(semInformar.vendas === 1000 && semInformar.vendasOrigem === "modulo_vendas", "sem vendas na contagem usa as do módulo Vendas (sem digitar duas vezes)");
  colado(semInformar.pct, 70, "CMV % com as vendas do módulo (700 / 1000)");
  const informada = calcularContagem({ ...c, vendas: 2000 }, 1000);
  assert(informada.vendas === 2000 && informada.vendasOrigem === "informada", "vendas informadas na contagem têm prioridade");
  const nada = calcularContagem(c, undefined);
  assert(nada.vendas === null && nada.pct === null && nada.dispersao === null, "sem nenhuma base de vendas: sem percentual");
}

// CMV do mês: semanas que COMEÇAM no mês; vira indicador calculado e vence o lançado à mão
{
  const mk = (loja, semana, vendas, ef) => ({ id: `${loja}${semana}`, lojaId: loja, semana, vendas, cmvTeorico: 20, estoqueInicial: 1000, compras: 1000, transferenciasEntrada: 0, transferenciasSaida: 0, devolucoes: 0, estoqueFinal: ef, responsavel: null, observacoes: null, origem: "manual" });
  const calc = calcularContagens([mk("a", "2026-10-26", 5000, 1000), mk("a", "2026-11-02", 5000, 1500), mk("a", "2026-11-09", 5000, 1700), mk("b", "2026-11-02", 4000, 1000)], new Map());
  const meses = cmvDoMes(calc);
  const a11 = meses.find((m) => m.lojaId === "a" && m.mes === "2026-11");
  assert(a11.semanas === 2 && a11.vendas === 10000, "novembro/a: 2 semanas e 10.000 de vendas");
  colado(a11.reais, 500 + 300, "novembro/a: CMV em R$ (Σ das semanas)");
  colado(a11.pct, 8, "novembro/a: CMV % do mês = Σ reais / Σ vendas");
  assert(meses.find((m) => m.lojaId === "a" && m.mes === "2026-10").semanas === 1, "semana de 26/10 pertence a outubro (começa lá)");
  const ind = indicadoresCmv(calc);
  assert(ind.every((i) => i.indicador === "cmv" && i.origem === "calculado" && i.mes.endsWith("-01")), "indicadores calculados com origem 'calculado' e mês YYYY-MM-01");
  const manual = [
    { lojaId: "a", mes: "2026-11-01", indicador: "cmv", valor: 99, origem: "manual" },
    { lojaId: "a", mes: "2026-11-01", indicador: "pessoal", valor: 18, origem: "manual" },
    { lojaId: "c", mes: "2026-11-01", indicador: "cmv", valor: 22, origem: "manual" },
  ];
  const mesclado = mesclarIndicadores(manual, ind);
  colado(mesclado.find((i) => i.lojaId === "a" && i.mes === "2026-11-01" && i.indicador === "cmv").valor, 8, "valor calculado vence o lançado à mão");
  assert(mesclado.find((i) => i.lojaId === "c" && i.indicador === "cmv").valor === 22, "loja sem contagem mantém o lançado à mão");
  assert(mesclado.find((i) => i.indicador === "pessoal").valor === 18, "outros indicadores intactos");
  assert(mesclado.filter((i) => i.lojaId === "a" && i.mes === "2026-11-01" && i.indicador === "cmv").length === 1, "sem duplicar o indicador");
}

// alertas do CMV
{
  const lojas = [{ id: "a", nome: "A" }, { id: "b", nome: "B" }, { id: "c", nome: "C" }, { id: "d", nome: "D" }];
  const metas = [{ id: "m", lojaId: null, indicador: "cmv", meta: 21, direcao: "max", validoDe: "2026-01-01", validoAte: null }];
  const mk = (loja, vendas, ef, teo) => ({ id: loja, lojaId: loja, semana: "2026-10-26", vendas, cmvTeorico: teo, estoqueInicial: 0, compras: ef + (vendas * 0.2), transferenciasEntrada: 0, transferenciasSaida: 0, devolucoes: 0, estoqueFinal: ef, responsavel: null, observacoes: null, origem: "manual" });
  // a: 20% (ok, disp 0); b: 25% com teórico 20 (bad e disp 5); c sem contagem; d sem vendas
  const calc = calcularContagens([mk("a", 1000, 100, 20), { ...mk("b", 1000, 100, 20), compras: 100 + 250 }, { ...mk("d", 0, 0, 20), vendas: null }], new Map());
  const al = alertasCmv({ calc, semana: "2026-10-26", lojas, metas, tolPct: 10, tolDispersao: 1 });
  assert(!al.some((x) => x.lojaId === "a"), "loja dentro da meta e da tolerância não gera alerta");
  assert(al.some((x) => x.lojaId === "b" && x.tipo === "acima_meta" && x.status === "bad"), "25% contra meta de 21% é crítico");
  assert(al.some((x) => x.lojaId === "b" && x.tipo === "dispersao" && x.status === "bad"), "dispersão de 5 p.p. é crítica");
  assert(al.some((x) => x.lojaId === "c" && x.tipo === "sem_contagem"), "loja sem contagem na semana é sinalizada");
  assert(al.some((x) => x.lojaId === "d" && x.tipo === "sem_contagem"), "contagem sem base de vendas é sinalizada");
  assert(alertasCmv({ calc, semana: null, lojas, metas, tolPct: 10, tolDispersao: 1 }).length === 0, "sem semana, sem alertas");
}

/* ================================================================== DRE: premissas, realizado × orçado */

// premissas: padrão + exceção da loja
{
  const rows = [
    { lojaId: null, ...PREMISSAS_DRE_PADRAO, custoDelivery: 28 },
    { lojaId: "vm", custoDelivery: 27 },
    { lojaId: "bk", mixDelivery: 78 },
  ];
  igual(premissasDaLoja(rows, "vm").custoDelivery, 27, "exceção da Vila Mariana vale");
  igual(premissasDaLoja(rows, "vm").impostos, 10, "demais campos seguem o padrão");
  igual(premissasDaLoja(rows, "bk").mixDelivery, 78, "mix do Brooklyn");
  igual(premissasDaLoja(rows, "outra").custoDelivery, 28, "loja sem exceção usa o padrão");
  igual(excecoesDaLoja(rows, "vm"), ["custoDelivery"], "lista de exceções");
  igual(excecoesDaLoja(rows, "outra"), [], "sem exceções");
  igual(premissasPadrao([]), PREMISSAS_DRE_PADRAO, "sem nada cadastrado vale o modelo original");
  igual(premissasPadrao([{ lojaId: null, cmv: 22 }]).cmv, 22, "padrão parcial: campo informado vale, o resto é do modelo original");
  igual(
    { cmv: PREMISSAS_DRE_PADRAO.cmv, pessoal: PREMISSAS_DRE_PADRAO.pessoal, impostos: PREMISSAS_DRE_PADRAO.impostos, delivery: PREMISSAS_DRE_PADRAO.custoDelivery, man: PREMISSAS_DRE_PADRAO.manutencao, mkt: PREMISSAS_DRE_PADRAO.marketing, cto: PREMISSAS_DRE_PADRAO.cto, agua: PREMISSAS_DRE_PADRAO.agua, energia: PREMISSAS_DRE_PADRAO.energia },
    { cmv: 21, pessoal: 19, impostos: 10, delivery: 28, man: 1.5, mkt: 7, cto: 12000, agua: 1500, energia: 4500 },
    "premissas iniciais do comando mestre",
  );
}

// realizado: lançamento real substitui a estimativa; nada soma duas vezes
{
  const p = { ...PREMISSAS_DRE_PADRAO };
  const sem = dreRealizadoLoja({ premissas: p, fat: 1000000, fatDel: 770000, cmvContagens: null, cmvIndicador: null, pessoalIndicador: null, lancamentos: {} });
  assert(sem.estimadas.length === 9, "sem nenhum dado, as 9 linhas são estimativa pela premissa");
  confereDre(sem.d, dreCalc({ fat: 1000000, fatDel: 770000, impostos: 10, cmv: 21, folha: 19, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 }), "realizado sem dados = DRE da premissa");

  const med = dreRealizadoLoja({ premissas: p, fat: 1000000, fatDel: 770000, cmvContagens: 20.66, cmvIndicador: 20.6, pessoalIndicador: 18.4, lancamentos: {} });
  assert(med.fontes.cmv === "contagens" && med.fontes.folha === "indicador" && med.fontes.impostos === "premissa", "fontes: CMV das contagens, folha do indicador, resto premissa");
  colado(med.d.cmv, 206600, "CMV do DRE = % das contagens × faturamento");
  colado(med.d.folha, 184000, "folha do DRE = % do indicador × faturamento");
  assert(med.estimadas.length === 7 && !med.estimadas.includes("cmv") && !med.estimadas.includes("folha"), "CMV e folha deixam de ser estimativa");

  const ind = dreRealizadoLoja({ premissas: p, fat: 1000000, fatDel: 770000, cmvContagens: null, cmvIndicador: 20.6, pessoalIndicador: null, lancamentos: {} });
  assert(ind.fontes.cmv === "indicador" && ind.d.cmv === 206000, "sem contagens, o indicador do mês");

  const lanc = dreRealizadoLoja({ premissas: p, fat: 1000000, fatDel: 770000, cmvContagens: 20.66, cmvIndicador: null, pessoalIndicador: 18.4, lancamentos: { impostos: 95000, cto: 13500.5, cmv: 215000 } });
  assert(lanc.fontes.impostos === "lancado" && lanc.fontes.cto === "lancado" && lanc.fontes.cmv === "lancado", "linhas lançadas são marcadas como lançadas");
  colado(lanc.d.imp, 95000, "imposto lançado substitui a estimativa de 10%");
  colado(lanc.d.cto, 13500.5, "CTO lançado substitui o fixo de 12.000");
  colado(lanc.d.cmv, 215000, "CMV lançado em R$ vence as contagens");
  colado(lanc.d.rl, 1000000 - 95000, "receita líquida usa o imposto lançado");
  const soma = lanc.d.imp + lanc.d.cmv + lanc.d.folha + lanc.d.cdel + lanc.d.man + lanc.d.mkt + lanc.d.cto + lanc.d.agua + lanc.d.energia;
  colado(lanc.d.res, 1000000 - soma, "resultado = faturamento − cada linha UMA vez (sem dupla contagem)");
  igual([...lanc.estimadas].sort(), ["agua", "delivery", "energia", "manutencao", "marketing"], "linhas ainda estimadas após os lançamentos");
  assert(lanc.d.pe != null && lanc.d.pe > 0, "ponto de equilíbrio calculado com os valores reais");

  const zero = dreRealizadoLoja({ premissas: p, fat: 0, fatDel: 0, cmvContagens: null, cmvIndicador: null, pessoalIndicador: null, lancamentos: {} });
  assert(zero.semVendas === true && Number.isFinite(zero.d.mg) && Number.isFinite(zero.d.varPct), "sem vendas: marcado e sem NaN/Infinity");
  assert(zero.d.res < 0, "sem vendas o resultado é só os custos fixos (negativo)");
}

// orçado
{
  const p = { ...PREMISSAS_DRE_PADRAO, mixDelivery: 77 };
  assert(dreOrcadoLoja(p, null) === null && dreOrcadoLoja(p, 0) === null, "sem meta de faturamento não há orçado");
  const o = dreOrcadoLoja(p, 1000000);
  colado(o.fat, 1000000, "orçado: faturamento = meta do mês");
  colado(o.del, 770000, "orçado: delivery = meta × participação do delivery");
  colado(o.cmv, 210000, "orçado: CMV pela premissa (21%)");
  colado(o.folha, 190000, "orçado: folha pela premissa (19%)");
  confereDre(o, dreCalc({ fat: 1000000, fatDel: 770000, impostos: 10, cmv: 21, folha: 19, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 }), "orçado = dreCalc com as premissas");
}

// comparativo orçado × realizado
{
  const orc = dreCalc({ fat: 1000000, fatDel: 1000000, impostos: 10, cmv: 21, folha: 19, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 });
  const real = dreCalc({ fat: 900000, fatDel: 900000, impostos: 10, cmv: 23, folha: 17, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 });
  const c = compararDre(orc, real);
  assert(c.length === DRE_LINHAS.length, "todas as linhas do DRE no comparativo");
  const f = c.find((x) => x.k === "fat");
  colado(f.variacao, -100000, "faturamento: realizado − orçado");
  colado(f.variacaoPct, -10, "faturamento: −10%");
  assert(f.favoravel === false, "faturamento abaixo do orçado é desfavorável");
  const cmv = c.find((x) => x.k === "cmv");
  assert(cmv.variacao < 0 && cmv.favoravel === true, "CMV de 23% sobre 900k (207k) contra 21% sobre 1M (210k): abaixo do orçado em R$ = favorável");
  const folha = c.find((x) => x.k === "folha");
  assert(folha.variacao < 0 && folha.favoravel === true, "custo abaixo do orçado é favorável");
  const semOrc = compararDre(null, real);
  assert(semOrc.every((x) => x.orcado === null && x.variacao === null && x.favoravel === null), "sem orçado, sem variação");
  const csv = linhasCsvComparativo("Teste", c);
  assert(csv[1][0] === "Linha" && csv.length === 2 + DRE_LINHAS.length, "CSV do comparativo");
}

// distribuição de cada R$ 100
{
  const d = dreCalc({ fat: 1000000, fatDel: 770000, impostos: 10, cmv: 20.6, folha: 18.4, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 });
  const partes = distribuicaoDeCem(d);
  colado(partes.reduce((a, x) => a + x.valor, 0), 100, "R$ 100 vendidos: custos + resultado somam 100");
  igual(partes.map((x) => x.nome), ["CMV", "Folha", "Custos de delivery", "Impostos", "Marketing e outros", "CTO, água e energia", "Manutenção", "Resultado"], "mesma ordem do painel original");
  assert(distribuicaoDeCem(dreCalc({ ...{ fat: 0, fatDel: 0, impostos: 0, cmv: 0, folha: 0, delivery: 0, deliveryBase: "delivery", manutencao: 0, marketing: 0, cto: 0, agua: 0, energia: 0 } })).length === 0, "sem faturamento, sem distribuição");
}

// DRE da rede num mês (vendas + premissas + lançamentos + contagens + metas)
{
  const lojas = [
    { id: "a", slug: "a", nome: "A", status: "operando", canais: "salao+delivery", dataInauguracao: null, inauguracaoPrevista: null, ordem: 1 },
    { id: "b", slug: "b", nome: "B", status: "operando", canais: "delivery", dataInauguracao: null, inauguracaoPrevista: null, ordem: 2 },
    { id: "c", slug: "c", nome: "C", status: "operando", canais: "delivery", dataInauguracao: null, inauguracaoPrevista: null, ordem: 3 },
    { id: "n", slug: "n", nome: "N", status: "inauguracao", canais: "delivery", dataInauguracao: null, inauguracaoPrevista: null, ordem: 4 },
  ];
  const vendas = [
    { lojaId: "a", data: "2026-10-10", salao: 100000, delivery: 300000, pedidosSalao: 1, pedidosDelivery: 1 },
    { lojaId: "a", data: "2026-10-11", salao: 100000, delivery: 500000, pedidosSalao: 1, pedidosDelivery: 1 },
    { lojaId: "b", data: "2026-10-10", salao: 0, delivery: 400000, pedidosSalao: 0, pedidosDelivery: 1 },
    { lojaId: "b", data: "2026-09-30", salao: 0, delivery: 999999, pedidosSalao: 0, pedidosDelivery: 1 },
  ];
  const r = calcularDreRede({
    lojas,
    mes: "2026-10",
    vendas,
    premissas: [{ lojaId: null, ...PREMISSAS_DRE_PADRAO }, { lojaId: "a", mixDelivery: 80 }],
    lancamentos: [
      { id: "1", lojaId: "a", mes: "2026-10-01", linha: "cto", valor: 14000, observacao: null, origem: "manual" },
      { id: "2", lojaId: "a", mes: "2026-09-01", linha: "agua", valor: 1, observacao: null, origem: "manual" },
    ],
    metasFat: [{ lojaId: "a", mes: "2026-10-01", valor: 1000000 }, { lojaId: "b", mes: "2026-10-01", valor: 500000 }],
    indicadores: [{ lojaId: "a", mes: "2026-10-01", indicador: "pessoal", valor: 20, origem: "manual" }, { lojaId: "a", mes: "2026-10-01", indicador: "cmv", valor: 50, origem: "manual" }],
    cmvMes: [{ lojaId: "a", mes: "2026-10", pct: 20.5, reais: 0, vendas: 0, semanas: 4 }],
  });
  assert(r.porLoja.length === 3, "só lojas em operação entram no DRE (inauguração fica de fora)");
  const a = r.porLoja.find((x) => x.loja.id === "a");
  const b = r.porLoja.find((x) => x.loja.id === "b");
  const c = r.porLoja.find((x) => x.loja.id === "c");
  colado(a.realizado.d.fat, 1000000, "A: faturamento = vendas do mês");
  colado(a.realizado.d.del, 800000, "A: delivery do mês");
  colado(a.realizado.d.cmv, 205000, "A: CMV pelas contagens (20,5%) e não pelo indicador de 50%");
  colado(a.realizado.d.folha, 200000, "A: folha pelo indicador (20%)");
  colado(a.realizado.d.cto, 14000, "A: CTO lançado em outubro");
  colado(a.realizado.d.agua, 1500, "A: lançamento de setembro não vaza para outubro");
  colado(a.orcado.fat, 1000000, "A: orçado pela meta do mês");
  colado(a.orcado.del, 800000, "A: orçado com participação do delivery de 80% (exceção da loja)");
  assert(a.excecoes.includes("mixDelivery"), "A: exceção listada");
  colado(b.realizado.d.fat, 400000, "B: venda de setembro não entra em outubro");
  assert(b.orcado && b.orcado.fat === 500000, "B: orçado");
  assert(c.realizado.semVendas === true && c.orcado === null, "C: sem vendas e sem meta");
  assert(r.lojasComVendas === 2, "2 lojas com vendas");
  colado(r.realizadoRede.fat, 1400000, "rede: faturamento das lojas com vendas");
  colado(r.orcadoRede.fat, 1500000, "rede: orçado das lojas com meta");
  assert(r.linhasTotal === 18, "18 linhas (2 lojas × 9)");
  assert(r.linhasEstimadas === a.realizado.estimadas.length + b.realizado.estimadas.length, "linhas estimadas somadas");
  const partes = distribuicaoDeCem(r.realizadoRede);
  colado(partes.reduce((x, y) => x + y.valor, 0), 100, "distribuição da rede soma 100");
  const csv = linhasCsvDre("DRE", [{ nome: "A", d: a.realizado.d }, { nome: "Rede", d: r.realizadoRede }]);
  assert(csv[1].length === 5 && csv.length === DRE_LINHAS.length + 3, "CSV do DRE: título, cabeçalho, linhas e PE");
}
assert(Object.keys(CHAVE_DRE).length === 9, "9 linhas lançáveis");

/* ================================================================== orçamento e expansão */

{
  const P = ORCAMENTO_PADRAO;
  const cen = (over = {}) => ({ id: "c1", nome: "Base", descricao: null, ...P, curva: [...CURVA_PADRAO], padrao: true, origem: "manual", ...over });
  const r = resumirCenario(cen());
  colado(r.resultadoMensal, 49500, "cenário base: resultado mensal maduro");
  colado(r.resultadoAnual, 594000, "cenário base: resultado anual (12 meses)");
  colado(r.margem, 9.9, "cenário base: margem de 9,9%");
  colado(r.pePct, (orcDre(P).pe / 500000) * 100, "ponto de equilíbrio em % do faturamento-alvo");
  assert(r.mesPositivo === 1, "cenário base já fecha positivo no mês 1 (70% do faturamento-alvo, com folha fixa)");
  const lento = resumirCenario(cen({ id: "c2", nome: "Lento", faturamento: 420000, cmv: 22, folha: 21, curva: [60, 70, 80, 90, 95, 100] }));
  assert(lento.resultadoMensal < r.resultadoMensal, "cenário conservador rende menos que o base");
  const curto = projetarCurva(P, [50, 100]);
  assert(curto.linhas.length === 2 && curto.acumulado.length === 2, "curva de 2 meses");
  assert(curto.linhas[0].d.res < curto.linhas[1].d.res, "no mês 1 (50%) a folha fixa pesa mais: resultado menor");
  colado(curto.linhas[0].d.folha, 95000, "folha fixa em R$ (19% do faturamento-alvo) mesmo com 50% do faturamento");
  // loja que nunca fica positiva dentro da curva
  const ruim = resumirCenario(cen({ faturamento: 100000, curva: [50, 60] }));
  assert(ruim.mesPositivo === null && ruim.resultadoMensal < 0, "cenário inviável: sem mês positivo");
}

// rede simulada e descrição das vagas
{
  const maduro = orcDre(ORCAMENTO_PADRAO);
  const base = [dreCalc({ fat: 1000000, fatDel: 770000, impostos: 10, cmv: 20.6, folha: 18.4, delivery: 28, deliveryBase: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500 })];
  const s = simularRede({ base, qtdNovas: 3, orcado: maduro });
  colado(s.consolidado.fat, 1000000 + 3 * 500000, "rede simulada: faturamento");
  colado(s.consolidado.res, base[0].res + 3 * maduro.res, "rede simulada: resultado");
  colado(s.consolidado.pe, base[0].pe + 3 * maduro.pe, "rede simulada: PE = soma dos PEs");
  const zero = simularRede({ base, qtdNovas: -2, orcado: maduro });
  assert(zero.qtdNovas === 0 && zero.consolidado.fat === 1000000, "quantidade negativa de lojas novas vira zero");
  igual(descreverNovas(["Vila Mariana", "Tatuapé", "Butantã"], 8), "Vila Mariana, Tatuapé, Butantã e 5 novas", "texto do painel original");
  igual(descreverNovas(["A", "B"], 2), "A e B", "sem sobra");
  igual(descreverNovas(["A", "B", "C"], 2), "A e B", "mais nomes que vagas: só as vagas");
  igual(descreverNovas([], 1), "1 nova", "só genéricas");
  igual(descreverNovas([], 0), "nenhuma loja nova", "sem vagas");
  const p = projecaoRede({ fatBase: 1897000, qtdNovas: 8, faturamentoMinimo: 500000, fatRede: 3097000 });
  colado(p.projecao, 1897000 + 4000000, "projeção com 10 lojas");
  colado(p.vezes, 5897000 / 3097000, "múltiplo do faturamento de hoje");
  assert(projecaoRede({ fatBase: 0, qtdNovas: 8, faturamentoMinimo: 500000, fatRede: 0 }).vezes === null, "sem faturamento hoje, sem múltiplo");
}

// meses e calendário de inaugurações
{
  igual(somarMeses("2026-11", 1), "2026-12", "novembro + 1");
  igual(somarMeses("2026-11", 2), "2027-01", "vira o ano");
  igual(somarMeses("2027-01", -1), "2026-12", "volta o ano");
  assert(mesesEntre("2026-11", "2027-03") === 4 && mesesEntre("2027-03", "2026-11") === -4, "meses entre datas");
  const cenarioPadrao = { id: "c1", nome: "Base", descricao: null, ...ORCAMENTO_PADRAO, curva: [...CURVA_PADRAO], padrao: true, origem: "manual" };
  const rapido = { ...cenarioPadrao, id: "c2", nome: "Rápido", curva: [100, 100] };
  const us = [
    { id: "u1", nome: "Loja A", aberturaPrevista: "2026-11-01", status: "planejada", cenarioId: null, lojaId: null, faturamentoAlvo: null, observacao: null, origem: "manual" },
    { id: "u2", nome: "Loja B", aberturaPrevista: "2027-01-01", status: "planejada", cenarioId: "c2", lojaId: null, faturamentoAlvo: 600000, observacao: null, origem: "manual" },
    { id: "u3", nome: "Loja C", aberturaPrevista: null, status: "planejada", cenarioId: null, lojaId: null, faturamentoAlvo: null, observacao: null, origem: "manual" },
    { id: "u4", nome: "Cancelada", aberturaPrevista: "2026-12-01", status: "cancelada", cenarioId: null, lojaId: null, faturamentoAlvo: null, observacao: null, origem: "manual" },
  ];
  const calc = calcularUnidades(us, [cenarioPadrao, rapido], cenarioPadrao);
  assert(calc.length === 3 && !calc.some((x) => x.unidade.id === "u4"), "unidade cancelada fora do cálculo");
  assert(calc.find((x) => x.unidade.id === "u1").cenario.id === "c1", "sem cenário próprio usa o de simulação");
  assert(calc.find((x) => x.unidade.id === "u2").cenario.id === "c2" && calc.find((x) => x.unidade.id === "u2").premissas.faturamento === 600000, "cenário e faturamento-alvo próprios");
  colado(calc.find((x) => x.unidade.id === "u1").maduro.res, 49500, "unidade A: resultado maduro do cenário base");
  const semCenario = calcularUnidades(us, [], null);
  assert(semCenario.length === 0, "sem nenhum cenário não há cálculo");
  const imp = impactoMensal(calc, "2026-10", 6);
  igual(imp.map((x) => x.mes), ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"], "meses do impacto");
  igual(imp.map((x) => x.lojasAbertas), [0, 1, 1, 2, 2, 2], "lojas abertas ao longo do tempo (sem data não conta)");
  colado(imp[0].resultado, 0, "antes da primeira abertura: resultado zero");
  colado(imp[1].resultado, orcDre(ORCAMENTO_PADRAO, 500000 * 0.7).res, "mês 1 da loja A: 70% do faturamento-alvo");
  colado(imp[2].resultado, orcDre(ORCAMENTO_PADRAO, 500000 * 0.8).res, "mês 2 da loja A: 80%");
  const P2 = { ...ORCAMENTO_PADRAO, faturamento: 600000 };
  colado(imp[3].resultado, orcDre(ORCAMENTO_PADRAO, 500000 * 0.9).res + orcDre(P2, 600000).res, "janeiro: A no mês 3 (90%) + B no mês 1 (curva 100%)");
  colado(imp[5].resultado, orcDre(ORCAMENTO_PADRAO, 500000 * 1).res + orcDre(P2, 600000).res, "março: A no mês 5 (100%) + B maduro (depois da curva, 100%)");
  const longe = impactoMensal(calc, "2026-10", 24);
  assert(longe.length === 24 && longe[23].lojasAbertas === 2, "24 meses");
  const gran = calc.find((x) => x.unidade.id === "u1");
  colado(gran.primeiroAno, resultadoPrimeiroAno(ORCAMENTO_PADRAO, CURVA_PADRAO), "1º ano da unidade A");
}

console.log(`\nRede (financeiro): ${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
