#!/usr/bin/env node
/**
 * Testes — Predictive Intelligence (Gate 20.4)
 * Motor local · sem I/O · sem LLM · sem inventar números.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import {
  PREDICTIVE_ENGINE_VERSION,
  PredictiveEngine,
  runPredictiveEngine,
} from "../lib/predictive/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

console.log("\nPredictive Intelligence — Gate 20.4\n");

const feeds = {
  tenantSlug: "acme-oficina",
  financeiro: {
    status: "available",
    saldoAtual: 10000,
    saldoProjetado7d: -500,
    saldoProjetado30d: 8000,
    pagarVencidoQtd: 2,
    pagarVencidoValor: 1500,
    receberVencidoQtd: 0,
    receberVencidoValor: 0,
  },
  comercial: {
    status: "available",
    faturamentoPeriodo: 20000,
    valorEmNegociacao: 5000,
    valorPerdido: 0,
    taxaConversaoPct: 35,
    conversaoDisponivel: true,
    metaDisponivel: true,
    metaPercentual: 70,
    metaAtingida: false,
    metaAbaixoRitmo: true,
    coberturaOrigemPct: 90,
    coberturaOrigemBaixa: false,
    coberturaResponsavelPct: 90,
    orcamentosAguardando: 3,
  },
  crm: {
    status: "available",
    clientesAtivos: 40,
    clientesInativos180: 5,
    clientesRecorrentes: 10,
    clientesEmRisco: 2,
    vipSemRetorno: 0,
    revisoesVencidas: 0,
    orcamentosPendentes: 1,
    oportunidades: 2,
    ultimaVisitaCarteira: "2026-07-01",
  },
  operacao: {
    status: "available",
    aguardandoAprovacao: 4,
    atrasadas: 2,
    paradas: 1,
    semResponsavel: 0,
    taxaOcupacaoPct: 70,
    capacidadeLimite: false,
    valorAguardandoAprovacao: null,
  },
  estoque: {
    status: "available",
    zerados: 1,
    abaixoMinimo: 3,
    valorParado: null,
    valorParadoDisponivel: false,
    cadastroInconsistente: 0,
    coberturaDisponivel: true,
    giroDisponivel: false,
    fornecedorUnico: false,
    skusAtivos: 100,
  },
};

const ai = runExecutiveDecisionEngine(feeds);

const result = runPredictiveEngine({
  tenantSlug: "acme-oficina",
  ai,
  feeds,
  hoje: {
    faturamentoHoje: 1500,
    metaHoje: 2000,
    percentualHoje: 75,
    projecaoFechamentoMes: 45000,
  },
});

assert(result.engineVersion === PREDICTIVE_ENGINE_VERSION, "engineVersion 20.4");
assert(result.forecasts.length === 5, "5 previsões de domínio");
assert(
  result.forecasts.map((f) => f.domain).join(",") ===
    "faturamento,fluxo_caixa,estoque,metas,risco_operacional",
  "domínios na ordem oficial",
);

const fat = result.forecasts.find((f) => f.domain === "faturamento");
assert(fat && fat.primaryValue.includes("45"), "faturamento usa projeção do mês");
assert(fat.evidence.some((e) => e.source === "dashboard-hoje"), "evidência hoje");

const cx = result.forecasts.find((f) => f.domain === "fluxo_caixa");
assert(cx && cx.risk === "critico", "caixa 7d negativo → risco crítico");
assert(cx.evidence.some((e) => /7 dias/i.test(e.label)), "evidência projeção 7d");

const est = result.forecasts.find((f) => f.domain === "estoque");
assert(est && (est.risk === "critico" || est.risk === "alto" || est.risk === "moderado"), "estoque com zerados/abaixo");
assert(est.href.includes("/acme-oficina/estoque"), "tenant no link estoque");

const meta = result.forecasts.find((f) => f.domain === "metas");
assert(meta && /70%/.test(meta.primaryValue), "meta % real do feed");
assert(meta.headline.toLowerCase().includes("abaixo") || meta.risk !== "baixo", "meta abaixo do ritmo");

const op = result.forecasts.find((f) => f.domain === "risco_operacional");
assert(op && op.evidence.some((e) => /atrasad/i.test(e.label)), "OS atrasadas evidência");
assert(op.href.includes("/acme-oficina/"), "tenant preservado OS");

assert(["alta", "media", "baixa"].includes(result.overallConfidence), "confiança geral");
assert(result.summary.length > 0, "summary");
assert(
  result.forecasts.every((f) => f.confidenceLabel && f.trendLabel && f.riskLabel),
  "labels confiança/tendência/risco",
);

const again = PredictiveEngine.run({
  tenantSlug: "acme-oficina",
  ai,
  feeds,
  hoje: {
    faturamentoHoje: 1500,
    metaHoje: 2000,
    percentualHoje: 75,
    projecaoFechamentoMes: 45000,
  },
});
assert(JSON.stringify(again) === JSON.stringify(result), "determinístico");

/* Sem inventar / sem fetch */
const blob = JSON.stringify(result);
assert(!/fake|mock|lorem|openai/i.test(blob), "sem mocks/LLM");

const emptyAi = runExecutiveDecisionEngine({
  tenantSlug: "acme-oficina",
  financeiro: null,
  comercial: null,
  crm: null,
  operacao: null,
  estoque: null,
});
const empty = runPredictiveEngine({
  tenantSlug: "acme-oficina",
  ai: emptyAi,
  feeds: {
    tenantSlug: "acme-oficina",
    financeiro: null,
    comercial: null,
    crm: null,
    operacao: null,
    estoque: null,
  },
});
assert(
  empty.forecasts.every((f) => f.primaryValue === "Indisponível" || f.unavailableReason),
  "feeds null → indisponível honesto",
);
assert(empty.overallConfidence === "baixa", "sem dados → confiança baixa");

/* Wiring */
const eic = read("components/dashboard/executive/executive-intelligence-center.tsx");
const stream = read("components/dashboard/dashboard-streaming.tsx");
const pkg = read("package.json");
assert(eic.includes("PredictiveIntelligencePanel"), "EIC monta painel preditivo");
assert(
  eic.indexOf("ExecutiveCopilotPanel") < eic.indexOf("PredictiveIntelligencePanel"),
  "Predictive abaixo do Copilot",
);
assert(stream.includes("buildExecutiveAiBundle"), "streaming usa bundle (sem fetch extra)");
assert(stream.includes("runPredictiveEngine"), "streaming roda motor preditivo");
assert(pkg.includes("test:predictive"), "package.json script");
assert(!read("lib/predictive/engine.ts").includes("fetch("), "engine sem fetch");
assert(!read("lib/predictive/engine.ts").includes("createClient"), "engine sem SQL client");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
