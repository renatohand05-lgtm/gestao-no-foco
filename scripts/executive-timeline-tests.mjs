#!/usr/bin/env node
/**
 * Testes — Executive Timeline (Gate 20.5)
 * Sem I/O · sem LLM · sem mocks inventados.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import { runPredictiveEngine } from "../lib/predictive/index.ts";
import {
  computeTimelinePriority,
  dedupeTimelineEvents,
  groupTimelineEvents,
  runExecutiveTimeline,
  sortTimelineEvents,
  EXECUTIVE_TIMELINE_ENGINE_VERSION,
} from "../lib/executive-timeline/index.ts";

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

console.log("\nExecutive Timeline — Gate 20.5\n");

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
    ticketMedio: null,
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
const predictive = runPredictiveEngine({
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

const timeline = runExecutiveTimeline({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  decision: null,
  sort: "recent",
});

assert(timeline.engineVersion === EXECUTIVE_TIMELINE_ENGINE_VERSION, "engineVersion 20.5");
assert(timeline.events.length > 0, "geração de eventos");
assert(
  timeline.events.every(
    (e) =>
      e.id &&
      e.timestamp &&
      e.title &&
      e.category &&
      e.severity &&
      typeof e.impact === "number" &&
      Array.isArray(e.evidence) &&
      e.source &&
      e.confidence &&
      typeof e.priority === "number",
  ),
  "contrato de evento completo",
);

/* Ordenação por data */
const byRecent = sortTimelineEvents(timeline.events, "recent");
assert(
  byRecent.length < 2 ||
    new Date(byRecent[0].timestamp).getTime() >=
      new Date(byRecent[1].timestamp).getTime(),
  "ordenação por data (mais recente)",
);

/* Ordenação por impacto */
const byImpact = sortTimelineEvents(timeline.events, "impact");
assert(
  byImpact.length < 2 || byImpact[0].impact >= byImpact[1].impact,
  "ordenação por impacto",
);

/* Ordenação por severidade/risco */
const byRisk = sortTimelineEvents(timeline.events, "risk");
const rank = { critical: 4, attention: 3, positive: 2, info: 1 };
assert(
  byRisk.length < 2 ||
    rank[byRisk[0].severity] >= rank[byRisk[1].severity],
  "ordenação por severidade",
);

/* Prioridade */
const pCritical = computeTimelinePriority("critical", 90, "alta");
const pInfo = computeTimelinePriority("info", 20, "baixa");
assert(pCritical > pInfo, "cálculo de prioridade");

/* Agrupamento */
const groups = groupTimelineEvents(timeline.events);
assert(groups.length > 0, "agrupamento por categoria");
assert(
  groups.every((g) => g.key && g.label && g.events.length > 0),
  "grupos válidos",
);

/* Deduplicação */
const duped = dedupeTimelineEvents([
  ...timeline.events,
  { ...timeline.events[0], id: "dup-clone", priority: 0 },
]);
assert(duped.length <= timeline.events.length, "deduplicação");

/* Confiança */
assert(
  timeline.events.every((e) => ["alta", "media", "baixa"].includes(e.confidence)),
  "confiança válida",
);

/* Positivos e críticos */
assert(
  timeline.events.some((e) => e.severity === "positive") ||
    timeline.events.some((e) => e.severity === "critical") ||
    timeline.events.some((e) => e.severity === "attention"),
  "eventos positivos ou críticos/atenção",
);
assert(
  timeline.events.some((e) => e.severity === "critical") ||
    timeline.events.some((e) => e.category === "risk") ||
    timeline.events.some((e) => e.category === "cashflow"),
  "eventos críticos / risco / caixa",
);

/* Integração preditiva */
assert(
  timeline.events.some((e) => e.source === "predictive-engine"),
  "integração preditiva",
);

/* Estado vazio */
const emptyAi = runExecutiveDecisionEngine({
  tenantSlug: "acme-oficina",
  financeiro: null,
  comercial: null,
  crm: null,
  operacao: null,
  estoque: null,
});
const emptyPred = runPredictiveEngine({
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
const emptyTl = runExecutiveTimeline({
  tenantSlug: "acme-oficina",
  ai: emptyAi,
  predictive: emptyPred,
  categories: ["cashflow"],
});
assert(typeof emptyTl.total === "number", "estado vazio: total numérico");

/* Determinismo */
const again = runExecutiveTimeline({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  sort: "recent",
});
assert(JSON.stringify(again.events.map((e) => e.id)) === JSON.stringify(timeline.events.map((e) => e.id)), "determinístico");

/* Wiring / sem fetch */
const eic = read("components/dashboard/executive/executive-intelligence-center.tsx");
const shell = read("components/dashboard/executive/executive-engines-shell.tsx");
const engine = read("lib/executive-timeline/engine.ts");
const pkg = read("package.json");
assert(
  eic.includes("ExecutiveEnginesShell") && shell.includes("<ExecutiveTimelinePanel"),
  "EIC monta Timeline",
);
assert(
  shell.indexOf("<PredictiveIntelligencePanel") <
    shell.indexOf("<ExecutiveTimelinePanel"),
  "Timeline abaixo da Predictive",
);
assert(!engine.includes("fetch(") && !engine.includes("createClient"), "sem fetch/SQL");
assert(pkg.includes("test:executive-timeline"), "package.json script");
assert(!/openai|OpenAI/i.test(engine), "sem OpenAI");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
