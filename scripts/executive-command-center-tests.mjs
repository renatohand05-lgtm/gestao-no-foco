#!/usr/bin/env node
/**
 * Testes — Executive Command Center (Gate 20.7)
 * Sem I/O · sem LLM · sem mocks inventados.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import { runPredictiveEngine } from "../lib/predictive/index.ts";
import {
  aggregateCommandSources,
  buildMorningBrief,
  ECC_ENGINE_VERSION,
  ECC_UNAVAILABLE_LABEL,
  resolveActionOwner,
  runExecutiveCommandCenter,
} from "../lib/executive-command-center/index.ts";

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

console.log("\nExecutive Command Center — Gate 20.7 / RC1\n");

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

const hoje = {
  faturamentoHoje: 1500,
  metaHoje: 2000,
  percentualHoje: 75,
  ticketMedioHoje: 350,
  ticketMedioMes: 320,
  faturamentoMes: 28000,
  metaMes: 40000,
  percentualMes: 70,
  projecaoFechamento: 45000,
};

const agg = aggregateCommandSources({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  decision: null,
});

assert(agg.bh && agg.eic && agg.timeline && agg.edc, "agregação de dados");
assert(agg.edc.engineVersion.startsWith("20.6"), "EDC agregado");
assert(agg.timeline.engineVersion.startsWith("20.5"), "Timeline agregada");

const ecc = runExecutiveCommandCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  decision: null,
  hoje,
  greetingOverride: "Bom dia.",
});

assert(ecc.engineVersion === ECC_ENGINE_VERSION, "engineVersion 20.7");

/* Executive Score */
assert(
  ecc.score.value == null ||
    (ecc.score.value >= 0 && ecc.score.value <= 100),
  "Executive Score",
);

/* Morning Brief */
assert(
  ecc.morningBrief.greetingLine.length > 0 &&
    ecc.morningBrief.paragraphs.length >= 2 &&
    ecc.morningBrief.fullText.includes(ecc.morningBrief.greetingLine),
  "Morning Brief",
);
const brief = buildMorningBrief({
  score: { value: 93, label: "Saudável", confidence: "alta", healthLabel: "Saudável", source: "test" },
  criticalDecisionsCount: 3,
  pendingDecisionsCount: 3,
  risks: [
    {
      id: "r1",
      title: "Fluxo de caixa",
      description: "Existe risco de fluxo negativo em 8 dias.",
      priority: "critical",
      impactLabel: null,
      confidence: "media",
      source: "t",
      category: "cashflow",
    },
  ],
  quickWins: [
    {
      id: "q1",
      title: "QW",
      description: "d",
      kind: "quick_win",
      potentialGainLabel: "R$ 27.000",
      confidence: "media",
      source: "t",
    },
  ],
  generatedAt: ai.generatedAt,
  greetingOverride: "Bom dia.",
});
assert(
  brief.fullText.includes("Bom dia.") &&
    brief.fullText.includes("3 decisões críticas") &&
    brief.fullText.includes("93") &&
    brief.fullText.includes("Quick Wins"),
  "Morning Brief conteúdo determinístico",
);

/* prioridades / riscos / oportunidades / quick wins */
assert(ecc.priorities.length <= 5, "prioridades top 5");
assert(ecc.risks.length <= 5, "riscos top 5");
assert(ecc.opportunities.length <= 5, "oportunidades top 5");
assert(ecc.quickWins.length <= 5, "quick wins top 5");
assert(
  ecc.priorities.every((p) => p.id && p.title && p.priority),
  "contrato prioridades",
);
assert(
  ecc.risks.every((r) => r.id && r.title && r.priority),
  "contrato riscos",
);
assert(
  ecc.opportunities.every((o) => o.id && o.kind),
  "contrato oportunidades",
);

/* KPIs */
assert(ecc.kpis.length === 9, "KPIs (9 métricas)");
assert(
  ecc.kpis.every((k) => k.key && k.label && typeof k.available === "boolean"),
  "contrato KPIs",
);
assert(
  ecc.kpis.find((k) => k.key === "lucro_previsto")?.available === false,
  "lucro previsto honesto (indisponível)",
);
assert(
  ecc.kpis.find((k) => k.key === "ticket_medio")?.available === true,
  "ticket médio com hoje",
);

/* forecast */
assert(
  ecc.cashflowForecast != null || ecc.financialForecast != null,
  "forecast presente",
);
assert(ecc.goals && typeof ecc.goals.available === "boolean", "goals slice");

/* action / alert center */
assert(
  ecc.actions.every(
    (a) =>
      a.title &&
      a.description &&
      a.priority &&
      a.urgency &&
      a.confidence &&
      a.source &&
      a.category &&
      a.owner &&
      a.status,
  ),
  "action center",
);
assert(
  ecc.alerts.every((a) => a.kind && a.title && a.priority),
  "alert center",
);

/* estado vazio */
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
const emptyEcc = runExecutiveCommandCenter({
  tenantSlug: "vazio",
  ai: emptyAi,
  predictive: emptyPred,
  feeds: emptyFeeds,
});
assert(
  emptyEcc.engineVersion === ECC_ENGINE_VERSION &&
    Array.isArray(emptyEcc.priorities) &&
    Array.isArray(emptyEcc.kpis),
  "estado vazio",
);

/* determinismo */
const a = runExecutiveCommandCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  hoje,
  greetingOverride: "Bom dia.",
});
const b = runExecutiveCommandCenter({
  tenantSlug: "acme-oficina",
  ai,
  predictive,
  feeds,
  hoje,
  greetingOverride: "Bom dia.",
});
assert(
  a.morningBrief.fullText === b.morningBrief.fullText &&
    a.score.value === b.score.value &&
    JSON.stringify(a.priorities.map((p) => p.id)) ===
      JSON.stringify(b.priorities.map((p) => p.id)),
  "comportamento determinístico",
);

/* RC1 — limites top 5 */
assert(ecc.priorities.length <= 5, "limites: prioridades ≤ 5");
assert(ecc.risks.length <= 5, "limites: riscos ≤ 5");
assert(ecc.opportunities.length <= 5, "limites: oportunidades ≤ 5");
assert(ecc.quickWins.length <= 5, "limites: quick wins ≤ 5");
assert(ecc.alerts.length <= 5, "limites: alertas ≤ 5");
assert(ecc.actions.length <= 5, "limites: actions ≤ 5");

/* RC1 — owner por área (não "A definir") */
assert(resolveActionOwner("finance", "Caixa") === "Financeiro", "owner financeiro");
assert(
  resolveActionOwner("inventory", "Estoque parado") === "Estoque e Compras",
  "owner estoque",
);
assert(
  resolveActionOwner("sales", "Ticket médio") === "Comercial",
  "owner comercial",
);
assert(
  resolveActionOwner("operations", "OS atrasadas") === "Operações",
  "owner operações",
);
assert(resolveActionOwner("decision", "Revisar") === "Gestão", "owner gestão");
assert(
  ecc.actions.every((x) => x.owner && x.owner !== "A definir"),
  "actions sem placeholder A definir",
);

/* RC1 — estados indisponíveis elegantes */
assert(
  ecc.kpis.find((k) => k.key === "lucro_previsto")?.available === false,
  "lucro previsto sem fonte DRE (RC1)",
);
assert(
  ecc.kpis.find((k) => k.key === "margem")?.available === false,
  "margem sem fonte DRE (RC1)",
);
assert(
  ecc.kpis.find((k) => k.key === "lucro_previsto")?.value ===
    ECC_UNAVAILABLE_LABEL,
  "lucro com label elegante",
);

/* RC1 — empty lists ok */
assert(Array.isArray(emptyEcc.risks) && emptyEcc.risks.length >= 0, "CC sem riscos ok");
assert(
  Array.isArray(emptyEcc.opportunities),
  "CC sem oportunidades ok",
);
assert(Array.isArray(emptyEcc.actions), "CC sem decisões ok");

/* undefined / NaN safety on KPIs */
assert(
  ecc.kpis.every(
    (k) =>
      typeof k.value === "string" &&
      k.value !== "NaN" &&
      k.value !== "Infinity" &&
      k.value !== "undefined",
  ),
  "KPIs sem NaN/Infinity/undefined",
);

/* integração UI — Hero consolidado (sem CockpitHero) */
const eicSrc = read(
  "components/dashboard/executive/executive-intelligence-center.tsx",
);
const shellSrc = read(
  "components/dashboard/executive/executive-engines-shell.tsx",
);
const headerSrc = read(
  "components/dashboard/executive-command-center/executive-header.tsx",
);
const skelSrc = read(
  "components/dashboard/executive-command-center/executive-command-center-skeleton.tsx",
);
const decisionCard = read(
  "components/dashboard/executive-decision-center/decision-card.tsx",
);
const streamSrc = read("components/dashboard/dashboard-streaming.tsx");

assert(
  eicSrc.includes("ExecutiveEnginesShell") &&
    shellSrc.includes("<ExecutiveCommandCenter") &&
    !shellSrc.includes("ExecutiveCockpitHero") &&
    headerSrc.includes('data-ecc-block="consolidated-hero"'),
  "Hero consolidado no Command Center",
);
assert(
  shellSrc.includes("aggregateCommandSources") &&
    shellSrc.includes("businessHealth={shared.bh}"),
  "engines compartilhados no shell",
);
assert(
  !shellSrc.includes("<ExecutiveCockpitHero"),
  "ausência de Hero duplicado no topo",
);
assert(
  skelSrc.includes("ExecutiveCommandCenterSkeleton") ||
    skelSrc.includes("Carregando Executive Command Center"),
  "skeleton específico",
);
assert(
  streamSrc.includes("ExecutiveCommandCenterSkeleton"),
  "streaming usa skeleton do CC",
);
assert(
  decisionCard.includes("aria-expanded") &&
    decisionCard.includes("aria-controls") &&
    decisionCard.includes("evidenceId"),
  "a11y toggles evidência (aria-expanded/controls)",
);
assert(
  eicSrc.includes("aria-controls") && eicSrc.includes("panelId"),
  "a11y disclosure EIC",
);
assert(
  read("package.json").includes("test:executive-command-center"),
  "script package.json",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
