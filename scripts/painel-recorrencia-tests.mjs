#!/usr/bin/env node
/**
 * Testes do cálculo do painel de carteira recorrente (lib/painel-recorrencia/compute).
 * Node com --experimental-strip-types.
 */
import {
  calcularPainelRecorrencia,
  mesAnterior,
  proximoMes,
  ultimoDia,
} from "../lib/painel-recorrencia/compute.ts";

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
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
}
function perto(a, b, msg, tol = 0.01) {
  assert(typeof a === "number" && Math.abs(a - b) <= tol, `${msg} — esperado ${b}, veio ${a}`);
}

const cli = (nome, entrada, saida, mrr, extra = {}) => ({
  nome,
  ativo: !saida,
  entrada,
  saida,
  mrr,
  nicho: null,
  motivo: null,
  ...extra,
});

// datas
igual(proximoMes("2026-12"), "2027-01", "virada de ano para frente");
igual(mesAnterior("2026-01"), "2025-12", "virada de ano para trás");
igual(ultimoDia("2026-02"), "2026-02-28", "fevereiro de 2026");
igual(ultimoDia("2028-02"), "2028-02-29", "fevereiro bissexto");

const HOJE = "2026-06-15";
const clientes = [
  cli("A", "2026-01-10", null, 1000, { nicho: "Saúde" }),
  cli("B", "2026-01-20", "2026-03-20", 2000, { nicho: "Saúde", motivo: "Preço" }),
  cli("C", "2026-02-05", null, 3000, { nicho: "Pet" }),
  cli("D", "2026-03-01", null, 1500),
  cli("E", "2026-04-10", "2026-05-31", 500, { motivo: "Preço" }),
  cli("F", "2026-05-02", null, 2500, { nicho: "Pet" }),
  cli("G", "2026-06-03", null, 4000),
];
const financeiro = [
  { mes: "2026-03", receita: 6000, despesa: 4000, resultado: 2000, comerciais: 600, pessoal: 2000 },
  { mes: "2026-04", receita: 7000, despesa: 5000, resultado: 2000, comerciais: 500, pessoal: 2500 },
  { mes: "2026-05", receita: 9000, despesa: 6000, resultado: 3000, comerciais: 900, pessoal: 3000 },
];

const p = calcularPainelRecorrencia({ clientes, financeiro, hoje: HOJE });
const ponto = (mes) => p.serie.find((x) => x.mes === mes);

igual(p.serie.map((x) => x.mes), ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"], "série vai do 1º mês com dado até hoje");
igual(ponto("2026-06").parcial, true, "mês de hoje é parcial");
igual(ponto("2026-05").parcial, false, "mês anterior é fechado");

// clientes ativos no fim de cada mês
igual(ponto("2026-01").ativosFim, 2, "jan: A e B");
igual(ponto("2026-02").ativosFim, 3, "fev: A, B, C");
igual(ponto("2026-03").ativosFim, 3, "mar: B saiu no dia 20, D entrou");
igual(ponto("2026-04").ativosFim, 4, "abr: A, C, D, E");
igual(ponto("2026-05").ativosFim, 4, "mai: E saiu em 31/05, F entrou");
igual(ponto("2026-06").ativosFim, 5, "jun: A, C, D, F, G");

// MRR
perto(ponto("2026-01").mrrFim, 3000, "mrr jan");
perto(ponto("2026-03").mrrFim, 5500, "mrr mar (A+C+D)");
perto(ponto("2026-05").mrrFim, 8000, "mrr mai (A+C+D+F)");
perto(ponto("2026-06").mrrFim, 12000, "mrr jun");

// novos e churn
igual(ponto("2026-01").novos, 2, "novos jan");
igual(ponto("2026-03").churn, 1, "churn mar");
perto(ponto("2026-03").mrrPerdido, 2000, "mrr perdido mar");
igual(ponto("2026-05").churn, 1, "churn mai (saída no último dia do mês)");
perto(ponto("2026-04").mrrNovo, 500, "mrr novo abr");

// churn % = perdidos ÷ clientes no início do mês
perto(ponto("2026-03").churnPct, (1 / 3) * 100, "churn% mar = 1 de 3 no início");
perto(ponto("2026-05").churnPct, (1 / 4) * 100, "churn% mai = 1 de 4 no início");
igual(ponto("2026-01").churnPct, null, "sem clientes no início → churn% nulo");

// financeiro
perto(ponto("2026-04").receita, 7000, "receita abr");
perto(ponto("2026-04").margemPct, (2000 / 7000) * 100, "margem abr");
igual(ponto("2026-02").receita, null, "mês sem lançamento → nulo (não zero)");
perto(ponto("2026-04").cac, 500, "CAC abr: 500 de comerciais ÷ 1 novo");
igual(ponto("2026-03").cac, 600, "CAC mar: 600 ÷ 1 novo (D)");
assert(p.temFinanceiro, "tem financeiro");

// situação atual
igual(p.atual.ativos, 5, "ativos hoje");
perto(p.atual.mrr, 12000, "MRR hoje");
perto(p.atual.ticketMedio, 2400, "ticket médio");
igual(p.atual.mesFechado, "2026-05", "último mês fechado");
perto(p.atual.resultadoUltimoMes, 3000, "resultado do último mês fechado");
perto(p.atual.margemUltimoMes, (3000 / 9000) * 100, "margem do último mês fechado");
// churn médio dos últimos 3 meses fechados com base (mar, abr, mai)
const esperadoChurn3m = ((1 / 3) * 100 + 0 + (1 / 4) * 100) / 3;
perto(p.atual.churnPctMedia3m, esperadoChurn3m, "churn médio 3m");
perto(p.atual.ltv, 2400 / (esperadoChurn3m / 100), "LTV = ticket ÷ churn", 0.5);
assert(p.atual.permanenciaMediaMeses > 1 && p.atual.permanenciaMediaMeses < 2.5, "permanência média dos que saíram (~2 meses)");
perto(p.atual.concentracaoTop5Pct, 100, "com 5 ativos, top 5 = 100% da receita");

// nichos e motivos
const saude = p.nichos.find((n) => n.nicho === "Saúde");
igual([saude.ativos, saude.churn, saude.mrr], [1, 1, 1000], "nicho Saúde");
assert(p.nichos.some((n) => n.nicho === "Sem nicho"), "clientes sem nicho agrupados");
igual(p.motivos[0], { motivo: "Preço", clientes: 2, mrr: 2500 }, "motivo mais comum");

// maiores clientes
igual(p.top[0].nome, "G", "maior cliente");
igual(p.top.length, 5, "top lista os ativos");

// projeção
igual(p.projecao.map((x) => x.mes), ["2026-07", "2026-08", "2026-09"], "3 meses à frente");
assert(p.projecao[0].mrr > ponto("2026-06").mrrFim * 0.8, "projeção segue a tendência de alta");

// clientes que não dá para pôr no tempo
{
  const q = calcularPainelRecorrencia({
    clientes: [
      cli("X", "2026-05-01", null, 100),
      { nome: "Sem entrada", ativo: true, entrada: null, saida: null, mrr: 50, nicho: null, motivo: null },
      { nome: "Churn sem saída", ativo: false, entrada: "2026-04-01", saida: null, mrr: 70, nicho: null, motivo: null },
    ],
    financeiro: [],
    hoje: HOJE,
  });
  igual(q.atual.ativos, 1, "só conta quem tem data");
  assert(q.avisos.some((a) => /sem data de entrada/.test(a)), "avisa de cliente sem entrada");
  assert(q.avisos.some((a) => /sem data de saída/.test(a)), "avisa de churn sem saída");
  assert(!q.temFinanceiro, "sem lançamentos → sem financeiro");
}

// carteira vazia não quebra
{
  const v = calcularPainelRecorrencia({ clientes: [], financeiro: [], hoje: HOJE });
  igual(v.atual.ativos, 0, "carteira vazia");
  igual(v.projecao.length, 0, "sem projeção sem dados");
  assert(v.atual.ticketMedio === null && v.atual.ltv === null, "indicadores nulos, não NaN");
}

// cliente que entra e sai no mesmo mês
{
  const q = calcularPainelRecorrencia({
    clientes: [cli("Rápido", "2026-05-02", "2026-05-20", 100), cli("Fixo", "2026-01-05", null, 200)],
    financeiro: [],
    hoje: HOJE,
  });
  const mai = q.serie.find((x) => x.mes === "2026-05");
  igual([mai.novos, mai.churn, mai.ativosFim], [1, 1, 1], "entrou e saiu no mesmo mês");
  perto(mai.churnPct, 0, "quem entrou e saiu no mesmo mês não entra no churn % (base do 1º dia)");
  perto(mai.mrrPerdido, 100, "mas o MRR perdido conta a saída");
}

console.log(`\npainel-recorrencia: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
