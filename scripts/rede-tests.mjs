#!/usr/bin/env node
/**
 * Testes dos cálculos da rede de lojas (painel operacional Fat Buddha):
 * datas, meta por dia da semana, semáforo, metas vigentes, totais, corte do mês,
 * ranking TOP/FLOP, alertas, série diária, vendas por hora e a conferência
 * número a número contra as regras do HTML original usando os dados de exemplo.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  avaliarLoja,
  brlCompacto,
  calcularPainelRede,
  cortarMes,
  diaDaSemana,
  formatarValor,
  gerarAlertas,
  listarDias,
  listarMeses,
  mediaPorHora,
  mesAnterior,
  metaDoDia,
  metaNoPeriodo,
  rankear,
  resolverMeta,
  resumirLojaNoMes,
  serieDiaria,
  somarDias,
  statusMeta,
  textoMeta,
  totaisDeVendas,
  ultimoDiaDoMes,
} from "../lib/rede/calculo.ts";
import { INDICADORES } from "../lib/rede/tipos.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FALHOU:", msg);
  }
}
const perto = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}

const PESOS = { seg: 0.85, ter: 0.9, qua: 0.95, qui: 1, sex: 1.25, sab: 1.35, dom: 1.15 };

/* ---------------------------------------------------------------- datas */
igual(diaDaSemana("2026-10-01"), "qui", "1/out/2026 é quinta");
igual(diaDaSemana("2026-10-03"), "sab", "3/out/2026 é sábado");
igual(diaDaSemana("2026-10-04"), "dom", "4/out/2026 é domingo");
igual(ultimoDiaDoMes("2026-10"), "2026-10-31", "último dia de outubro");
igual(ultimoDiaDoMes("2026-02"), "2026-02-28", "fevereiro comum");
igual(ultimoDiaDoMes("2028-02"), "2028-02-29", "fevereiro bissexto");
igual(ultimoDiaDoMes("2026-12"), "2026-12-31", "dezembro");
igual(somarDias("2026-10-31", 1), "2026-11-01", "virada de mês");
igual(somarDias("2026-12-31", 1), "2027-01-01", "virada de ano");
igual(somarDias("2026-03-01", -1), "2026-02-28", "voltar um dia");
assert(listarDias("2026-10-01", "2026-10-31").length === 31, "31 dias em outubro");
assert(listarDias("2026-10-05", "2026-10-04").length === 0, "intervalo invertido = vazio");
assert(listarDias("2026-10-05", "2026-10-05").length === 1, "um dia só");
igual(listarMeses("2026-10-15", "2027-01-02"), ["2026-10", "2026-11", "2026-12", "2027-01"], "meses atravessando o ano");
igual(mesAnterior("2027-01"), "2026-12", "mês anterior em janeiro");
igual(mesAnterior("2026-11"), "2026-10", "mês anterior");

/* ---------------------------------------------------------------- metas por dia */
{
  const metaMes = 1_000_000;
  const soma = listarDias("2026-10-01", "2026-10-31").reduce((a, d) => a + metaDoDia(metaMes, d, PESOS), 0);
  assert(perto(soma, metaMes, 1e-4), `soma das metas diárias = meta do mês (${soma})`);
  assert(metaDoDia(metaMes, "2026-10-03", PESOS) > metaDoDia(metaMes, "2026-10-05", PESOS), "sábado pesa mais que segunda");
  // Outubro/2026: 31 dias começando na quinta → soma dos pesos conferida à mão.
  // qui×5 (1,8,15,22,29), sex×5, sab×5, dom×4, seg×4, ter×4, qua×4 (31 = sáb conta no sab×5)
  const contagem = { qui: 5, sex: 5, sab: 5, dom: 4, seg: 4, ter: 4, qua: 4 };
  const somaMao = Object.entries(contagem).reduce((a, [k, n]) => a + PESOS[k] * n, 0);
  assert(perto(metaDoDia(somaMao, "2026-10-03", PESOS), PESOS.sab, 1e-9), "meta do dia = mês × peso ÷ soma dos pesos (conferido à mão)");
  const mapa = new Map([["2026-10", 1_000_000]]);
  assert(perto(metaNoPeriodo(mapa, "2026-10-01", "2026-10-31", PESOS), 1_000_000, 1e-4), "período do mês inteiro = meta do mês");
  assert(perto(metaNoPeriodo(mapa, "2026-10-01", "2026-10-15", PESOS), metaNoPeriodo(mapa, "2026-10-01", "2026-10-31", PESOS) - metaNoPeriodo(mapa, "2026-10-16", "2026-10-31", PESOS), 1e-6), "períodos complementares somam o todo");
  const dois = new Map([["2026-10", 1_000_000], ["2026-11", 500_000]]);
  assert(perto(metaNoPeriodo(dois, "2026-10-01", "2026-11-30", PESOS), 1_500_000, 1e-4), "dois meses somam as duas metas");
  assert(metaNoPeriodo(new Map(), "2026-10-01", "2026-10-31", PESOS) === 0, "sem meta cadastrada = 0");
  assert(metaNoPeriodo(mapa, "2026-11-01", "2026-11-30", PESOS) === 0, "mês sem meta não entra");
}

/* ---------------------------------------------------------------- semáforo (regra do HTML) */
igual(statusMeta(21, "max", 21, 10), "ok", "CMV igual à meta = ok");
igual(statusMeta(21, "max", 20.6, 10), "ok", "CMV abaixo da meta = ok");
igual(statusMeta(21, "max", 23.1, 10), "warn", "CMV 10% acima = atenção (limite)");
igual(statusMeta(21, "max", 23.11, 10), "bad", "CMV acima de 10% de desvio = crítico");
igual(statusMeta(100, "min", 90, 10), "warn", "exatamente 10% abaixo = atenção (sem erro de ponto flutuante)");
igual(statusMeta(100, "min", 100 - 1e-12, 10), "ok", "diferença desprezível não derruba o semáforo");
igual(statusMeta(6, "min", 6, 10), "ok", "Comp igual à meta = ok");
igual(statusMeta(6, "min", 5.4, 10), "warn", "Comp 10% abaixo = atenção (limite)");
igual(statusMeta(6, "min", 5.39, 10), "bad", "Comp abaixo de 10% de desvio = crítico");
igual(statusMeta(6, "min", -2.1, 10), "bad", "Comp negativo = crítico");
igual(statusMeta(null, "min", 5, 10), "neu", "sem meta = neutro");
igual(statusMeta(5, null, 5, 10), "neu", "sem direção = neutro");
igual(statusMeta(5, "min", null, 10), "neu", "sem valor = neutro");
igual(statusMeta(5, "min", Number.NaN, 10), "neu", "NaN = neutro");
igual(statusMeta(0, "max", 1, 10), "bad", "meta zero com valor acima não divide por zero");
igual(statusMeta(0, "max", 0, 10), "ok", "meta zero atingida");
igual(statusMeta(100, "min", 90, 20), "warn", "tolerância configurável (20%)");
igual(statusMeta(100, "min", 70, 20), "bad", "tolerância configurável: fora");
// Mesmas respostas da função status() do HTML para uma grade de valores.
{
  const htmlStatus = (m, v) => {
    if (m.meta == null || v == null || isNaN(v)) return "neu";
    const ok = m.t === "min" ? v >= m.meta : v <= m.meta;
    if (ok) return "ok";
    const off = m.t === "min" ? (m.meta - v) / m.meta : (v - m.meta) / m.meta;
    return off <= 0.1 ? "warn" : "bad";
  };
  let diverge = 0;
  for (const t of ["min", "max"]) {
    for (const meta of [2, 4.7, 5, 6, 15, 19, 21, 97, 100, 500000]) {
      for (let i = -40; i <= 40; i++) {
        const v = meta * (1 + i / 100);
        // Exatamente no limite de 10% o HTML oscila por ponto flutuante; aqui o limite é "atenção" (testado à parte).
        if (Math.abs(Math.abs(i) - 10) < 1e-9) continue;
        if (statusMeta(meta, t, v, 10) !== htmlStatus({ meta, t }, v)) diverge++;
      }
    }
  }
  assert(diverge === 0, `semáforo idêntico ao HTML em 1 600 combinações (fora o limite exato) (diverge: ${diverge})`);
}

/* ---------------------------------------------------------------- metas vigentes */
{
  const metas = [
    { id: "1", lojaId: null, indicador: "cmv", meta: 21, direcao: "max", validoDe: "2026-01-01", validoAte: "2026-09-30" },
    { id: "2", lojaId: null, indicador: "cmv", meta: 20, direcao: "max", validoDe: "2026-10-01", validoAte: null },
    { id: "3", lojaId: "tat", indicador: "cmv", meta: 22, direcao: "max", validoDe: "2026-10-01", validoAte: null },
    { id: "4", lojaId: null, indicador: "absent", meta: null, direcao: null, validoDe: "2026-01-01", validoAte: null },
  ];
  igual(resolverMeta(metas, "bro", "cmv", "2026-10-15"), { meta: 20, direcao: "max", origem: "rede" }, "loja sem meta própria usa a da rede");
  igual(resolverMeta(metas, "tat", "cmv", "2026-10-15"), { meta: 22, direcao: "max", origem: "loja" }, "meta da loja vence a da rede");
  igual(resolverMeta(metas, "bro", "cmv", "2026-09-30"), { meta: 21, direcao: "max", origem: "rede" }, "histórico: meta antiga vale antes da mudança");
  igual(resolverMeta(metas, "tat", "cmv", "2026-09-30"), { meta: 21, direcao: "max", origem: "rede" }, "loja ainda sem meta própria no passado");
  igual(resolverMeta(metas, "bro", "preparo", "2026-10-15"), { meta: null, direcao: null, origem: null }, "indicador sem meta");
  igual(resolverMeta(metas, "bro", "absent", "2026-10-15"), { meta: null, direcao: null, origem: "rede" }, "acompanhamento sem meta numérica");
  igual(resolverMeta(metas, null, "cmv", "2026-10-15"), { meta: 20, direcao: "max", origem: "rede" }, "consulta da rede inteira");
  igual(resolverMeta(metas, "bro", "cmv", "2025-12-31"), { meta: null, direcao: null, origem: null }, "antes de qualquer vigência");
}

/* ---------------------------------------------------------------- totais */
{
  const t = totaisDeVendas([
    { lojaId: "a", data: "2026-10-01", salao: 1000, delivery: 3000, pedidosSalao: 10, pedidosDelivery: 30 },
    { lojaId: "a", data: "2026-10-02", salao: 500, delivery: 1500, pedidosSalao: 5, pedidosDelivery: 20 },
  ]);
  igual([t.salao, t.delivery, t.fat, t.pedidos, t.diasComVenda], [1500, 4500, 6000, 65, 2], "somas básicas");
  assert(perto(t.ticket, 6000 / 65), "ticket médio = faturamento ÷ pedidos");
  assert(perto(t.ticketSalao, 100) && perto(t.ticketDelivery, 4500 / 50), "ticket por canal");
  assert(perto(t.pctDelivery, 75), "delivery = 75% do faturamento");
  const vazio = totaisDeVendas([]);
  igual([vazio.fat, vazio.ticket, vazio.pctDelivery, vazio.ticketSalao, vazio.diasComVenda], [0, null, null, null, 0], "sem vendas: ticket e % ficam vazios, sem dividir por zero");
  const soDelivery = totaisDeVendas([{ lojaId: "a", data: "2026-10-01", salao: 0, delivery: 100, pedidosSalao: 0, pedidosDelivery: 2 }]);
  igual([soDelivery.ticketSalao, soDelivery.ticketDelivery], [null, 50], "loja só delivery: ticket de salão vazio");
  const zeros = totaisDeVendas([{ lojaId: "a", data: "2026-10-01", salao: 0, delivery: 0, pedidosSalao: 0, pedidosDelivery: 0 }]);
  assert(zeros.diasComVenda === 0, "dia lançado com zero não conta como dia com venda");
}

/* ---------------------------------------------------------------- corte do mês */
{
  const dias31 = listarDias("2026-10-01", "2026-10-31");
  let c = cortarMes("2026-10", "2026-11-18", dias31, PESOS);
  igual([c.dataCorte, c.parcial, c.fracao], ["2026-10-31", false, 1], "mês fechado: corte no último dia");
  c = cortarMes("2026-12", "2026-11-18", [], PESOS);
  igual([c.dataCorte, c.parcial, c.fracao], [null, true, 0], "mês futuro: sem corte");
  c = cortarMes("2026-11", "2026-11-18", listarDias("2026-11-01", "2026-11-14"), PESOS);
  igual([c.dataCorte, c.parcial], ["2026-11-14", true], "mês corrente: corte no último dia lançado");
  assert(c.fracao > 0.3 && c.fracao < 0.6, `fração dos pesos até 14/nov plausível (${c.fracao.toFixed(3)})`);
  const pesoAte = listarDias("2026-11-01", "2026-11-14").reduce((a, d) => a + PESOS[diaDaSemana(d)], 0);
  const pesoTodo = listarDias("2026-11-01", "2026-11-30").reduce((a, d) => a + PESOS[diaDaSemana(d)], 0);
  assert(perto(c.fracao, pesoAte / pesoTodo), "fração = soma dos pesos até o corte ÷ soma dos pesos do mês");
  c = cortarMes("2026-11", "2026-11-18", [], PESOS);
  igual([c.dataCorte, c.fracao], [null, 0], "mês corrente sem lançamento: sem corte");
  c = cortarMes("2026-11", "2026-11-18", ["2026-11-18"], PESOS);
  igual(c.dataCorte, null, "lançamento de hoje não conta (o dia ainda não fechou)");
  c = cortarMes("2026-11", "2026-11-01", ["2026-11-01"], PESOS);
  igual(c.dataCorte, null, "primeiro dia do mês, nada fechado ainda");
  c = cortarMes("2026-11", "2026-11-18", ["2026-10-31", "2026-11-03"], PESOS);
  igual(c.dataCorte, "2026-11-03", "ignora lançamentos de outros meses");
}

/* ---------------------------------------------------------------- ranking e alertas */
{
  const av = (statuses) =>
    statuses.map((s, i) => ({ k: INDICADORES[i].k, valor: s === "neu" ? null : 1, meta: s === "neu" ? null : 1, metaEfetiva: 1, direcao: s === "neu" ? null : "min", status: s, origemMeta: "rede", origemValor: "manual" }));
  const itens = [
    { loja: { id: "a", nome: "Alfa" }, avaliacoes: av(["ok", "ok", "bad", "warn"]), pctMeta: 90 },
    { loja: { id: "b", nome: "Beta" }, avaliacoes: av(["ok", "ok", "ok", "ok"]), pctMeta: 80 },
    { loja: { id: "c", nome: "Gama" }, avaliacoes: av(["ok", "ok", "ok", "ok"]), pctMeta: 110 },
    { loja: { id: "d", nome: "Delta" }, avaliacoes: av(["bad", "bad", "bad", "bad"]), pctMeta: 150 },
  ];
  const r = rankear(itens);
  igual(r.map((x) => x.nome), ["Gama", "Beta", "Alfa", "Delta"], "ordem: indicadores ok, depois % da meta de vendas");
  igual(r.map((x) => x.tag), ["TOP", "TOP", "FLOP", "FLOP"], "4 lojas: 2 TOP e 2 FLOP");
  igual(r.map((x) => x.pos), [1, 2, 3, 4], "posições sequenciais");
  const r5 = rankear([...itens, { loja: { id: "e", nome: "Épsilon" }, avaliacoes: av(["ok", "bad", "bad", "bad"]), pctMeta: 70 }]);
  igual(r5.map((x) => x.tag), ["TOP", "TOP", "TOP", "FLOP", "FLOP"], "5 lojas: 3 TOP (arredonda para cima) e 2 FLOP");
  igual(rankear([itens[0]]).map((x) => x.tag), ["TOP"], "uma loja só é TOP");
  igual(rankear([]), [], "sem lojas, sem ranking");
  const semDado = rankear([
    { loja: { id: "x", nome: "Sem dado" }, avaliacoes: av(["neu", "neu", "neu", "neu"]), pctMeta: null },
    { loja: { id: "y", nome: "Com dado" }, avaliacoes: av(["ok", "neu", "neu", "neu"]), pctMeta: null },
  ]);
  igual(semDado[0].nome, "Com dado", "loja sem nenhum dado fica atrás");
  assert(semDado[1].comMeta === 0 && semDado[1].ok === 0, "loja sem metas: 0 de 0");

  const al = gerarAlertas(itens);
  assert(al.length === 1 + 1 + 4 && al.filter((a) => a.status === "bad").length === 5, "alertas: 5 críticos e 1 atenção");
  assert(al[0].status === "bad" && al[al.length - 1].status === "warn", "críticos vêm antes dos de atenção");
  igual(gerarAlertas([{ loja: { id: "z", nome: "Z" }, avaliacoes: av(["ok", "ok", "neu", "neu"]) }]), [], "tudo na meta = sem alertas");
}

/* ---------------------------------------------------------------- série diária e vendas por hora */
{
  const vendas = [
    { lojaId: "a", data: "2026-10-01", salao: 100, delivery: 200, pedidosSalao: 1, pedidosDelivery: 2 },
    { lojaId: "a", data: "2026-10-02", salao: 50, delivery: 50, pedidosSalao: 1, pedidosDelivery: 1 },
    { lojaId: "b", data: "2026-10-02", salao: 0, delivery: 100, pedidosSalao: 0, pedidosDelivery: 1 },
  ];
  const s = serieDiaria({ de: "2026-10-01", ate: "2026-10-31", hoje: "2026-10-03", vendas, metasPorMes: new Map([["2026-10", 31000]]), pesos: PESOS });
  assert(s.length === 31, "um ponto por dia");
  igual([s[0].salao, s[0].delivery, s[1].salao, s[1].delivery], [100, 200, 50, 150], "vendas de lojas diferentes somam no mesmo dia");
  assert(perto(s[1].acumReal, 500), "acumulado realizado");
  assert(s[2].acumReal === 300 + 200, "dia sem venda repete o acumulado até hoje");
  assert(s[3].acumReal === null, "depois de hoje o realizado é nulo");
  assert(perto(s[30].acumMeta, 31000, 1e-3), "meta acumulada fecha na meta do mês");
  const semMeta = serieDiaria({ de: "2026-10-01", ate: "2026-10-03", hoje: "2026-10-03", vendas, metasPorMes: new Map(), pesos: PESOS });
  assert(semMeta.every((p) => p.metaDia === 0), "sem meta cadastrada, meta diária = 0");

  const h = mediaPorHora(
    [
      { hora: 12, salao: 1000, delivery: 3000 },
      { hora: 12, salao: 1000, delivery: 1000 },
      { hora: 19, salao: 0, delivery: 4000 },
    ],
    2,
  );
  igual(h.pontos.map((p) => p.hora), [12, 19], "horas ordenadas");
  assert(perto(h.pontos[0].total, 3000) && perto(h.pontos[0].salao, 1000) && perto(h.pontos[0].delivery, 2000), "média por dia com venda");
  igual(h.pico.hora, 12, "pico de vendas");
  igual(mediaPorHora([], 0), { pontos: [], pico: null }, "sem dados por hora");
  assert(mediaPorHora([{ hora: 10, salao: 5, delivery: 5 }], 0).pontos[0].total === 10, "zero dias não divide por zero");
}

/* ---------------------------------------------------------------- formatação (igual ao fmt() do HTML) */
{
  igual(brlCompacto(1_250_000), "R$ 1,3 mi", "R$ 1,25 mi arredonda como no HTML");
  igual(brlCompacto(2_000_000), "R$ 2 mi", "remove ,0");
  igual(brlCompacto(847_000), "R$ 847 mil", "milhares");
  igual(formatarValor("pct1", 20.6), "20,6%", "pct1");
  igual(formatarValor("pct0", 97.4), "97%", "pct0");
  igual(formatarValor("pctS", 7.2), "+7,2%", "pctS positivo");
  igual(formatarValor("pctS", -2.1), "-2,1%", "pctS negativo");
  igual(formatarValor("min", 13.8), "13,8 min", "minutos");
  igual(formatarValor("nota", 4.8), "4,8", "nota");
  igual(formatarValor("int", 1234), "1.234", "inteiro com milhar");
  igual(formatarValor("pct1", null), "—", "sem valor");
  igual(textoMeta("pct1", 21, "max"), "até 21%", "texto da meta (máx)");
  igual(textoMeta("pct0", 100, "min"), "pelo menos 100%", "texto da meta (mín)");
  igual(textoMeta("pct1", null, null), "acompanhamento", "sem meta = acompanhamento");
}

/* ---------------------------------------------------------------- conferência com o HTML (dados de exemplo) */
{
  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminho = process.env.REDE_DEMO_JSON || join(aqui, "fixtures", "rede-demo-compact.json");
  const D = JSON.parse(readFileSync(caminho, "utf8"));
  const lojas = [
    ["brooklyn", "Brooklyn"],
    ["perdizes", "Perdizes"],
    ["vila-mariana", "Vila Mariana"],
    ["tatuape", "Tatuapé"],
  ].map(([id, nome], i) => ({ id, slug: id, nome, status: "operando", canais: "salao+delivery", dataInauguracao: null, inauguracaoPrevista: null, ordem: i }));
  lojas.push({ id: "butanta", slug: "butanta", nome: "Butantã", status: "inauguracao", canais: "delivery", dataInauguracao: null, inauguracaoPrevista: "2026-11-15", ordem: 5 });
  const vendas = D.dias.map(([lojaId, data, salao, delivery, pedidosSalao, pedidosDelivery]) => ({ lojaId, data, salao, delivery, pedidosSalao, pedidosDelivery }));
  const metasFat = D.metas.map(([lojaId, valor]) => ({ lojaId, mes: "2026-10-01", valor }));
  const indicadores = D.ind.map(([lojaId, indicador, valor]) => ({ lojaId, mes: "2026-10-01", indicador, valor, origem: "exemplo" }));
  const defs = [
    ["fat", 500000, "min"],
    ["pctMeta", 100, "min"],
    ["comp", 6, "min"],
    ["cmv", 21, "max"],
    ["pessoal", 19, "max"],
    ["preparo", 15, "max"],
    ["cancel", 2, "max"],
    ["ifood", 4.7, "min"],
    ["online", 97, "min"],
    ["rupturas", 5, "max"],
    ["absent", null, null],
    ["turnover", null, null],
  ];
  const metas = defs.map(([indicador, meta, direcao], i) => ({ id: String(i), lojaId: null, indicador, meta, direcao, validoDe: "2026-01-01", validoAte: null }));
  const config = { ambiente: "demonstracao", pisoLoja: 500000, pesosDiaSemana: PESOS, toleranciaCmv: 1, toleranciaSemaforoPct: 10 };

  const painel = calcularPainelRede({ lojas, config, metas, metasFat, indicadores, vendas, de: "2026-10-01", ate: "2026-10-31", mesRef: "2026-10", hoje: "2026-11-18" });

  // --- implementação independente, copiada da lógica do HTML (lojaStats, status, ranked, alertas)
  const htmlStatus = (m, v) => {
    if (m.meta == null || v == null || isNaN(v)) return "neu";
    const ok = m.t === "min" ? v >= m.meta : v <= m.meta;
    if (ok) return "ok";
    const off = m.t === "min" ? (m.meta - v) / m.meta : (v - m.meta) / m.meta;
    return off <= 0.1 ? "warn" : "bad";
  };
  const METAS_HTML = defs.map(([k, meta, t]) => ({ k, meta, t }));
  const st = {};
  for (const l of lojas.filter((x) => x.status === "operando")) {
    const dias = D.dias.filter((d) => d[0] === l.id);
    const sal = dias.reduce((a, d) => a + d[2], 0);
    const del = dias.reduce((a, d) => a + d[3], 0);
    const ps = dias.reduce((a, d) => a + d[4], 0);
    const pd = dias.reduce((a, d) => a + d[5], 0);
    const fat = sal + del;
    const metaMes = D.metas.find((m) => m[0] === l.id)[1];
    const ind = Object.fromEntries(D.ind.filter((i) => i[0] === l.id).map((i) => [i[1], i[2]]));
    st[l.id] = { sal, del, fat, ped: ps + pd, ticket: fat / (ps + pd), pctMeta: (fat / metaMes) * 100, vals: { fat, pctMeta: (fat / metaMes) * 100, ...ind } };
  }
  const rankedHtml = lojas
    .filter((l) => l.status === "operando")
    .map((l) => {
      const ms = METAS_HTML.filter((m) => m.meta != null);
      const ok = ms.filter((m) => htmlStatus(m, st[l.id].vals[m.k]) === "ok").length;
      return { nome: l.nome, ok, pct: st[l.id].pctMeta };
    })
    .sort((a, b) => b.ok - a.ok || b.pct - a.pct);

  const todos = Object.values(st);
  const fatRede = todos.reduce((a, s) => a + s.fat, 0);
  const metaRede = D.metas.reduce((a, m) => a + m[1], 0);
  const pedRede = todos.reduce((a, s) => a + s.ped, 0);
  const delRede = todos.reduce((a, s) => a + s.del, 0);

  assert(painel.porLoja.length === 4, "só lojas operando entram no painel (Butantã em inauguração fica de fora)");
  assert(perto(painel.kpis.fat, fatRede, 1e-6), `faturamento da rede = HTML (${painel.kpis.fat} vs ${fatRede})`);
  assert(perto(painel.kpis.meta, metaRede, 1e-3), `meta da rede = HTML (${painel.kpis.meta} vs ${metaRede})`);
  assert(perto(painel.kpis.pctMeta, (fatRede / metaRede) * 100, 1e-6), "vendas × meta da rede = HTML");
  assert(painel.kpis.pedidos === pedRede, "pedidos = HTML");
  assert(perto(painel.kpis.ticket, fatRede / pedRede, 1e-9), "ticket médio = HTML");
  assert(perto(painel.kpis.pctDelivery, (delRede / fatRede) * 100, 1e-9), "delivery no faturamento = HTML");
  assert(painel.kpis.lojasAcimaPiso === todos.filter((s) => s.fat >= 500000).length, "lojas acima do piso = HTML");
  for (const p of painel.porLoja) {
    assert(perto(p.mes.totais.fat, st[p.loja.id].fat), `${p.loja.nome}: faturamento do mês`);
    assert(perto(p.mes.pctMeta, st[p.loja.id].pctMeta, 1e-9), `${p.loja.nome}: % da meta (mês fechado) = HTML`);
    assert(perto(p.mes.totais.ticket, st[p.loja.id].ticket, 1e-9), `${p.loja.nome}: ticket = HTML`);
    for (const m of METAS_HTML) {
      const a = p.avaliacoes.find((x) => x.k === m.k);
      assert(a.status === htmlStatus(m, st[p.loja.id].vals[m.k]), `${p.loja.nome} · ${m.k}: semáforo = HTML (${a.status})`);
    }
  }
  igual(painel.ranking.map((r) => r.nome), rankedHtml.map((r) => r.nome), "ranking = HTML");
  igual(painel.ranking.map((r) => r.ok), rankedHtml.map((r) => r.ok), "indicadores na meta por loja = HTML");
  igual(painel.ranking.map((r) => r.tag), ["TOP", "TOP", "FLOP", "FLOP"], "TOP/FLOP: 2 e 2");

  const alHtml = [];
  for (const l of lojas.filter((x) => x.status === "operando"))
    for (const m of METAS_HTML) {
      const s = htmlStatus(m, st[l.id].vals[m.k]);
      if (s === "warn" || s === "bad") alHtml.push({ s, l: l.nome, k: m.k });
    }
  assert(painel.alertas.length === alHtml.length, `quantidade de alertas = HTML (${painel.alertas.length} vs ${alHtml.length})`);
  assert(painel.alertas.filter((a) => a.status === "bad").length === alHtml.filter((a) => a.s === "bad").length, "críticos = HTML");
  assert(painel.lojasSemLancamento.length === 0, "mês fechado completo: nenhuma loja sem lançamento");

  // Série: meta acumulada fecha na meta da rede; realizado fecha no faturamento.
  const ult = painel.serie[painel.serie.length - 1];
  assert(perto(ult.acumMeta, metaRede, 1e-3), "série: meta acumulada fecha na meta da rede");
  assert(perto(ult.acumReal, fatRede, 1e-6), "série: realizado acumulado fecha no faturamento");

  // Filtro por loja restringe KPIs.
  const so = calcularPainelRede({ lojas, config, metas, metasFat, indicadores, vendas, de: "2026-10-01", ate: "2026-10-31", mesRef: "2026-10", hoje: "2026-11-18", lojaFiltroId: "tatuape" });
  assert(perto(so.kpis.fat, st.tatuape.fat), "filtro por loja: faturamento");
  assert(perto(so.kpis.meta, 500000, 1e-3), "filtro por loja: meta");
  assert(so.ranking.length === 4, "filtro por loja: ranking continua da rede toda");

  // Período parcial: primeira quinzena.
  const quinz = calcularPainelRede({ lojas, config, metas, metasFat, indicadores, vendas, de: "2026-10-01", ate: "2026-10-15", mesRef: "2026-10", hoje: "2026-11-18" });
  const esperado = D.dias.filter((d) => d[1] <= "2026-10-15").reduce((a, d) => a + d[2] + d[3], 0);
  assert(perto(quinz.kpis.fat, esperado), "período parcial soma só os dias do período");
  assert(quinz.kpis.meta < metaRede && quinz.kpis.meta > 0, "meta do período parcial é proporcional");

  // Mês corrente com lançamentos só até o dia 14: avalia mês até a data.
  const nov = [];
  for (const d of listarDias("2026-11-01", "2026-11-14")) nov.push({ lojaId: "brooklyn", data: d, salao: 7000, delivery: 25000, pedidosSalao: 100, pedidosDelivery: 300 });
  for (const d of listarDias("2026-11-01", "2026-11-10")) nov.push({ lojaId: "perdizes", data: d, salao: 0, delivery: 30000, pedidosSalao: 0, pedidosDelivery: 400 });
  const pNov = calcularPainelRede({
    lojas,
    config,
    metas,
    metasFat: [{ lojaId: "brooklyn", mes: "2026-11-01", valor: 1_000_000 }, { lojaId: "perdizes", mes: "2026-11-01", valor: 950_000 }],
    indicadores: [],
    vendas: nov,
    de: "2026-11-01",
    ate: "2026-11-30",
    mesRef: "2026-11",
    hoje: "2026-11-18",
  });
  assert(pNov.corte.parcial && pNov.corte.dataCorte === "2026-11-14", "mês corrente: corte no último dia lançado do mês");
  const bk = pNov.porLoja.find((p) => p.loja.id === "brooklyn");
  const pdz = pNov.porLoja.find((p) => p.loja.id === "perdizes");
  assert(bk.mes.diasSemLancamento === 0, "Brooklyn: lançou todos os dias até o corte");
  assert(pdz.mes.diasSemLancamento === 4, `Perdizes: 4 dias sem lançamento (${pdz.mes.diasSemLancamento})`);
  assert(pNov.lojasSemLancamento.some((l) => l.lojaId === "perdizes"), "lista de lojas com lançamento atrasado");
  assert(bk.mes.pctMeta != null && Math.abs(bk.mes.pctMeta - 100) < 60, "% da meta comparado ao ritmo esperado, não ao mês cheio");
  const fatBk = bk.avaliacoes.find((a) => a.k === "fat");
  assert(fatBk.metaEfetiva < fatBk.meta && fatBk.metaEfetiva > 0, "piso é proporcional ao corte do mês");
  const tat = pNov.porLoja.find((p) => p.loja.id === "tatuape");
  igual(tat.avaliacoes.find((a) => a.k === "fat").status, "neu", "loja sem lançamento nenhum: semáforo neutro, não vermelho");
  assert(tat.mes.pctMeta === null, "loja sem lançamento: % da meta vazio");
}

/* ---------------------------------------------------------------- avaliarLoja: precedência calculado × lançado */
{
  const resumo = resumirLojaNoMes({
    lojaId: "a",
    vendasDoMes: [{ lojaId: "a", data: "2026-10-01", salao: 100, delivery: 100, pedidosSalao: 1, pedidosDelivery: 1 }],
    metaMes: 1000,
    corte: { mes: "2026-10", dataCorte: "2026-10-31", parcial: false, fracao: 1 },
    pesos: PESOS,
  });
  const metas = [{ id: "1", lojaId: null, indicador: "fat", meta: 100, direcao: "min", validoDe: "2026-01-01", validoAte: null }];
  const av = avaliarLoja({
    lojaId: "a",
    resumo,
    indicadoresDoMes: [{ lojaId: "a", mes: "2026-10-01", indicador: "fat", valor: 999999, origem: "manual" }],
    metas,
    dataRef: "2026-10-31",
    fracao: 1,
    tolPct: 10,
  });
  const fat = av.find((a) => a.k === "fat");
  assert(fat.valor === 200 && fat.origemValor === "calculado", "faturamento vem das vendas lançadas, não de lançamento manual");
  assert(av.length === INDICADORES.length, "todos os indicadores avaliados");
  assert(av.find((a) => a.k === "cmv").status === "neu", "indicador sem lançamento = neutro");
}

console.log(`\nRede (cálculos): ${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
