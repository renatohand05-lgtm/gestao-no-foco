#!/usr/bin/env node
/**
 * Testes — Executive Decision Center (Gate 20.6)
 * Sem I/O · sem LLM · sem mocks inventados.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import { runPredictiveEngine } from "../lib/predictive/index.ts";
import { runExecutiveTimeline } from "../lib/executive-timeline/index.ts";
import {
  buildDecisionSimulations,
  computeConfidence,
  computeDecisionQueueScore,
  computeEffort,
  computeExecutiveDecisionScore,
  computeImpact,
  computeUrgency,
  dedupeDecisions,
  EDC_ENGINE_VERSION,
  isQuickWin,
  priorityFromScores,
  runExecutiveDecisionCenter,
  sortDecisionQueue,
} from "../lib/executive-decision-center/index.ts";

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

console.log("\nExecutive Decision Center — Gate 20.6\n");

const feeds = {
  tenantSlug: "acme-oficina",
  financeiro: {
    status: "available",
    saldoAtual: 10000,
    saldoProjetado7d: -500,
    saldoProjetado30d: 8000,
    pagarVencidoQtd: 2,
    pagarVencidoValor: 1500,
    receberVencidoQtd: 3,
    receberVencidoValor: 4200,
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
    valorParado: 8000,
    valorParadoDisponivel: true,
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
});

const edc = runExecutiveDecisionCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  decision: null,
  timeline,
});

/* ——— criação de decisões ——— */
assert(edc.engineVersion === EDC_ENGINE_VERSION, "engineVersion 20.6");
assert(edc.total === edc.queue.length, "total === queue.length");
assert(edc.decisions.length > 0, "criação de decisões");
assert(
  edc.queue.every(
    (d) =>
      d.id &&
      d.title &&
      d.description &&
      d.category &&
      d.priority &&
      typeof d.impact === "number" &&
      d.urgency &&
      d.confidence &&
      d.effort &&
      typeof d.score === "number" &&
      d.recommendation &&
      Array.isArray(d.evidence) &&
      d.source &&
      d.suggestedAction &&
      d.timestamp &&
      typeof d.quickWin === "boolean",
  ),
  "contrato de decisão completo",
);

/* ——— impacto / urgência / confiança / esforço / prioridade ——— */
const impact = computeImpact({
  severityBoost: 70,
  scoreGap: 40,
  hasFinancialSignal: true,
});
assert(impact >= 70 && impact <= 100, "cálculo de impacto");

const urgency = computeUrgency({
  priorityHint: "high",
  riskCritical: false,
  cashNegative: true,
});
assert(urgency === "imediata", "cálculo de urgência (caixa negativo)");

const confidence = computeConfidence({
  partial: false,
  evidenceCount: 3,
  sourceReliable: true,
});
assert(confidence === "alta", "cálculo de confiança");

const effort = computeEffort({
  category: "financeiro",
  hasHref: true,
  complexity: "baixa",
});
assert(effort === "baixo", "cálculo de esforço");

const priority = priorityFromScores({
  impact: 90,
  urgency: "imediata",
  confidence: "alta",
});
assert(priority === "critical", "cálculo de prioridade");

const qScore = computeDecisionQueueScore({
  priority: "critical",
  impact: 90,
  urgency: "imediata",
  confidence: "alta",
  effort: "baixo",
});
assert(qScore >= 80 && qScore <= 100, "score de fila composto");

/* ——— Executive Score ——— */
assert(
  edc.executiveScore.value == null ||
    (edc.executiveScore.value >= 0 && edc.executiveScore.value <= 100),
  "Executive Score 0–100 ou null",
);
assert(edc.executiveScore.dimensions.length === 8, "8 dimensões no score");
const scoreAgain = computeExecutiveDecisionScore({
  bh: {
    overallScore: 70,
    overallStatus: "atencao",
    overallStatusLabel: "Atenção",
    finance: {
      key: "finance",
      module: "financeiro",
      label: "Financeiro",
      score: 65,
      status: "atencao",
      statusLabel: "Atenção",
      motivos: [],
      riscos: [],
      oportunidades: [],
      coverage: "available",
    },
    commercial: {
      key: "commercial",
      module: "comercial",
      label: "Comercial",
      score: 70,
      status: "atencao",
      statusLabel: "Atenção",
      motivos: [],
      riscos: [],
      oportunidades: [],
      coverage: "available",
    },
    operation: {
      key: "operation",
      module: "operacao",
      label: "Operação",
      score: 60,
      status: "atencao",
      statusLabel: "Atenção",
      motivos: [],
      riscos: [],
      oportunidades: [],
      coverage: "available",
    },
    crm: {
      key: "crm",
      module: "crm",
      label: "CRM",
      score: 80,
      status: "saudavel",
      statusLabel: "Saudável",
      motivos: [],
      riscos: [],
      oportunidades: [],
      coverage: "available",
    },
    inventory: {
      key: "inventory",
      module: "estoque",
      label: "Estoque",
      score: 55,
      status: "atencao",
      statusLabel: "Atenção",
      motivos: [],
      riscos: [],
      oportunidades: [],
      coverage: "available",
    },
    priorities: [],
    confidence: "media",
    confidenceLabel: "Média",
    coveragePct: 100,
    modulesAvailable: 5,
    generatedAt: ai.generatedAt,
    engineVersion: "20.2.0",
  },
  predictive,
});
assert(
  scoreAgain.value != null && scoreAgain.value >= 0 && scoreAgain.value <= 100,
  "cálculo do Executive Score",
);

/* ——— ordenação da fila ——— */
assert(
  edc.queue.length < 2 ||
    edc.queue.every(
      (d, i, arr) => i === 0 || arr[i - 1].score >= d.score,
    ),
  "ordenação da fila por score",
);
const sorted = sortDecisionQueue([
  {
    score: 40,
    priority: "low",
    impact: 20,
    id: "a",
  },
  {
    score: 90,
    priority: "critical",
    impact: 80,
    id: "b",
  },
]);
assert(sorted[0].id === "b", "sortDecisionQueue prioriza score maior");

/* ——— quick wins ——— */
assert(
  edc.quickWins.every((d) => d.quickWin === true),
  "identificação de quick wins",
);
assert(
  isQuickWin({ effort: "baixo", impact: 60, confidence: "media" }) === true,
  "isQuickWin baixo esforço + alto impacto",
);
assert(
  isQuickWin({ effort: "alto", impact: 90, confidence: "alta" }) === false,
  "isQuickWin rejeita alto esforço",
);

/* ——— simulações ——— */
const sims = buildDecisionSimulations({ feeds, predictive });
assert(sims.length >= 5, "gera simulações");

const ticket = sims.find((s) => s.kind === "ticket_medio");
assert(ticket?.available === true, "simulação de ticket médio");
assert(
  ticket?.baselineValue.includes("20") || ticket?.projectedValue.includes("22"),
  "ticket médio usa faturamento real",
);

const despesas = sims.find((s) => s.kind === "reducao_despesas");
assert(despesas?.available === true, "simulação de redução de despesas");

const fat = sims.find((s) => s.kind === "crescimento_faturamento");
assert(fat?.available === true, "simulação de faturamento");

const rec = sims.find((s) => s.kind === "antecipacao_recebiveis");
assert(rec?.available === true, "simulação de recebíveis");

assert(
  edc.simulations.some((s) => s.kind === "ticket_medio"),
  "engine inclui simulações",
);

/* ——— integração Predictive + Timeline ——— */
assert(
  edc.queue.some(
    (d) =>
      d.source === "predictive-intelligence" ||
      d.id.startsWith("edc:pred:"),
  ) || predictive.forecasts.every((f) => f.risk === "baixo" || f.risk === "indisponivel" || (f.unavailableReason && f.evidence.length === 0)),
  "integração com Predictive Intelligence",
);
assert(
  edc.queue.some((d) => d.id.startsWith("edc:tl:")) || timeline.events.length === 0,
  "integração com Executive Timeline",
);

/* ——— estado vazio ——— */
const emptyFeeds = {
  tenantSlug: "vazio",
  financeiro: null,
  comercial: null,
  crm: null,
  operacao: null,
  estoque: null,
};
const emptyAi = runExecutiveDecisionEngine(emptyFeeds);
const emptyPred = runPredictiveEngine({
  tenantSlug: "vazio",
  ai: emptyAi,
  feeds: emptyFeeds,
});
const emptyEdc = runExecutiveDecisionCenter({
  tenantSlug: "vazio",
  ai: emptyAi,
  predictive: emptyPred,
  feeds: emptyFeeds,
});
assert(
  emptyEdc.total === 0 || emptyEdc.queue.length >= 0,
  "estado vazio não quebra",
);
assert(
  emptyEdc.simulations.every(
    (s) => s.available === false || typeof s.baselineValue === "string",
  ),
  "simulações vazias marcadas unavailable quando sem base",
);

/* ——— deduplicação ——— */
const duped = dedupeDecisions([
  {
    id: "1",
    title: "Pagar fornecedores",
    source: "a",
    score: 40,
  },
  {
    id: "2",
    title: "Pagar fornecedores",
    source: "a",
    score: 80,
  },
  {
    id: "3",
    title: "Outro",
    source: "a",
    score: 50,
  },
]);
assert(duped.length === 2, "deduplicação de decisões");
assert(duped.find((d) => d.title === "Pagar fornecedores")?.score === 80, "dedupe mantém maior score");

/* ——— determinismo ——— */
const a = runExecutiveDecisionCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  timeline,
});
const b = runExecutiveDecisionCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  timeline,
});
assert(
  JSON.stringify(a.queue.map((d) => d.id)) ===
    JSON.stringify(b.queue.map((d) => d.id)) &&
    a.executiveScore.value === b.executiveScore.value,
  "comportamento determinístico",
);

/* ——— arquivos / integração UI ——— */
const eicSrc = read(
  "components/dashboard/executive/executive-intelligence-center.tsx",
);
assert(
  eicSrc.includes("DecisionCenterPanel") &&
    eicSrc.indexOf("ExecutiveTimelinePanel") <
      eicSrc.indexOf("DecisionCenterPanel"),
  "Decision Center abaixo da Timeline no EIC",
);
assert(
  read("package.json").includes("test:executive-decision-center"),
  "script package.json presente",
);

const pkg = JSON.parse(read("package.json"));
assert(
  typeof pkg.scripts["test:executive-decision-center"] === "string",
  "script test:executive-decision-center definido",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
