#!/usr/bin/env node
/**
 * Testes — Business Health Engine (Gate 20.2)
 * Interpretação determinística do Decision Engine · sem I/O · sem mocks inventados.
 */
import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import {
  BusinessHealthEngine,
  BUSINESS_HEALTH_ENGINE_VERSION,
  BUSINESS_HEALTH_STATUS_LABEL,
  classifyBusinessHealthConfidence,
  classifyBusinessHealthStatus,
  runBusinessHealthEngine,
} from "../lib/dashboard/business-health-engine.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("\nBusiness Health Engine — Gate 20.2\n");

/* ── Faixas oficiais ──────────────────────────────────── */
assert(classifyBusinessHealthStatus(100) === "excelente", "Status 100 → Excelente");
assert(classifyBusinessHealthStatus(90) === "excelente", "Status 90 → Excelente");
assert(classifyBusinessHealthStatus(89) === "saudavel", "Status 89 → Saudável");
assert(classifyBusinessHealthStatus(80) === "saudavel", "Status 80 → Saudável");
assert(classifyBusinessHealthStatus(79) === "atencao", "Status 79 → Atenção");
assert(classifyBusinessHealthStatus(65) === "atencao", "Status 65 → Atenção");
assert(classifyBusinessHealthStatus(64) === "critico", "Status 64 → Crítico");
assert(classifyBusinessHealthStatus(0) === "critico", "Status 0 → Crítico");
assert(classifyBusinessHealthStatus(null) === "indisponivel", "Status null → Indisponível");
assert(
  BUSINESS_HEALTH_STATUS_LABEL.excelente === "Excelente" &&
    BUSINESS_HEALTH_STATUS_LABEL.saudavel === "Saudável" &&
    BUSINESS_HEALTH_STATUS_LABEL.atencao === "Atenção" &&
    BUSINESS_HEALTH_STATUS_LABEL.critico === "Crítico",
  "Labels oficiais PT-BR",
);

/* ── Confidence ───────────────────────────────────────── */
assert(classifyBusinessHealthConfidence(5, 90) === "alta", "Confidence Alta");
assert(classifyBusinessHealthConfidence(4, 80) === "alta", "Confidence Alta limiar");
assert(classifyBusinessHealthConfidence(3, 60) === "media", "Confidence Média");
assert(classifyBusinessHealthConfidence(2, 90) === "baixa", "Confidence Baixa (módulos)");
assert(classifyBusinessHealthConfidence(5, 40) === "baixa", "Confidence Baixa (cobertura)");

const baseFin = {
  status: "available",
  saldoAtual: 10000,
  saldoProjetado7d: -500,
  saldoProjetado30d: 8000,
  pagarVencidoQtd: 2,
  pagarVencidoValor: 1500,
  receberVencidoQtd: 0,
  receberVencidoValor: 0,
};
const baseCom = {
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
};
const baseCrm = {
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
};
const baseOp = {
  status: "available",
  aguardandoAprovacao: 4,
  atrasadas: 2,
  paradas: 1,
  semResponsavel: 0,
  taxaOcupacaoPct: 70,
  capacidadeLimite: false,
  valorAguardandoAprovacao: null,
};
const baseEst = {
  status: "available",
  zerados: 0,
  abaixoMinimo: 0,
  valorParado: null,
  valorParadoDisponivel: false,
  cadastroInconsistente: 0,
  coberturaDisponivel: true,
  giroDisponivel: false,
  fornecedorUnico: false,
  skusAtivos: 100,
};

const ai = runExecutiveDecisionEngine({
  tenantSlug: "demo-tenant",
  financeiro: baseFin,
  comercial: baseCom,
  crm: baseCrm,
  operacao: baseOp,
  estoque: baseEst,
});

const health = runBusinessHealthEngine(ai);
const viaApi = BusinessHealthEngine.run(ai);

assert(
  health.overallScore === viaApi.overallScore,
  "BusinessHealthEngine.run === runBusinessHealthEngine",
);
assert(health.engineVersion === BUSINESS_HEALTH_ENGINE_VERSION, "engineVersion 20.2");
assert(
  health.overallScore ===
    (ai.executiveScore == null ? null : Math.round(ai.executiveScore)),
  "Business Score = Executive Score (sem inventar)",
);
assert(
  health.overallStatus === classifyBusinessHealthStatus(health.overallScore),
  "overallStatus usa faixas oficiais 90/80/65",
);

/* ── Módulos ──────────────────────────────────────────── */
assert(health.finance.key === "finance", "Financeiro key");
assert(health.commercial.key === "commercial", "Comercial key");
assert(health.operation.key === "operation", "Operação key");
assert(health.crm.key === "crm", "CRM key");
assert(health.inventory.key === "inventory", "Estoque key");

assert(
  health.finance.score ===
    (ai.moduleScores.find((m) => m.module === "financeiro")?.score == null
      ? null
      : Math.round(ai.moduleScores.find((m) => m.module === "financeiro").score)),
  "Financeiro score reutilizado",
);
assert(
  health.commercial.score ===
    (ai.moduleScores.find((m) => m.module === "comercial")?.score == null
      ? null
      : Math.round(ai.moduleScores.find((m) => m.module === "comercial").score)),
  "Comercial score reutilizado",
);
assert(
  health.operation.score ===
    (ai.moduleScores.find((m) => m.module === "operacao")?.score == null
      ? null
      : Math.round(ai.moduleScores.find((m) => m.module === "operacao").score)),
  "Operação score reutilizado",
);
assert(
  health.crm.score ===
    (ai.moduleScores.find((m) => m.module === "crm")?.score == null
      ? null
      : Math.round(ai.moduleScores.find((m) => m.module === "crm").score)),
  "CRM score reutilizado",
);
assert(
  health.inventory.score ===
    (ai.moduleScores.find((m) => m.module === "estoque")?.score == null
      ? null
      : Math.round(ai.moduleScores.find((m) => m.module === "estoque").score)),
  "Estoque score reutilizado",
);

assert(health.finance.motivos.length > 0, "Financeiro: motivos evidência");
assert(
  health.finance.riscos.some((r) => /vencid/i.test(r.text)),
  "Financeiro: risco contas vencidas (evidência)",
);
assert(health.commercial.motivos.length > 0, "Comercial: motivos");
assert(health.operation.motivos.length > 0, "Operação: motivos");
assert(health.crm.motivos.length > 0, "CRM: motivos");
assert(health.inventory.motivos.length > 0, "Estoque: motivos");
assert(
  health.inventory.oportunidades.length > 0 ||
    health.inventory.status === "excelente" ||
    health.inventory.status === "saudavel",
  "Estoque: sem ruptura → oportunidade ou status saudável",
);

/* ── Prioridades / confidence ─────────────────────────── */
assert(Array.isArray(health.priorities), "Prioridades array");
assert(health.priorities.length >= 1, "Prioridade nº1 presente");
assert(health.priorities[0].rank === 1, "Prioridade rank 1");
assert(
  ["alta", "media", "baixa"].includes(health.confidence),
  "Confidence Alta|Média|Baixa",
);
assert(typeof health.confidenceLabel === "string", "confidenceLabel");

const again = runBusinessHealthEngine(ai);
assert(
  JSON.stringify(again) === JSON.stringify(health),
  "Compose determinístico (mesmo input → mesmo output)",
);

assert(
  !JSON.stringify(health).toLowerCase().includes('"mock"') &&
    !JSON.stringify(health).toLowerCase().includes("fake"),
  "Sem mocks inventados",
);

/* ── UI wiring ────────────────────────────────────────── */
const eic = read("components/dashboard/executive/executive-intelligence-center.tsx");
const card = read("components/dashboard/business-health/business-health-card.tsx");
const pkg = read("package.json");

assert(eic.includes("BusinessHealthCard"), "Dashboard: BusinessHealthCard no EIC");
assert(
  eic.includes("Gate 20.2 — Business Health abaixo do Executive Score") ||
    (eic.indexOf("<ExecutiveCockpitHero") >= 0 &&
      eic.indexOf("<ExecutiveCockpitHero") < eic.indexOf("<BusinessHealthCard")),
  "Dashboard: Business Health abaixo do Executive Score (Hero)",
);
assert(card.includes('data-dashboard-block="business-health"'), "Card block id");
assert(pkg.includes("test:business-health"), "package.json script");

/* ── Indisponível honesto ─────────────────────────────── */
const aiEmpty = runExecutiveDecisionEngine({
  tenantSlug: "demo-tenant",
  financeiro: null,
  comercial: null,
  crm: null,
  operacao: null,
  estoque: null,
});
const emptyHealth = runBusinessHealthEngine(aiEmpty);
assert(
  emptyHealth.overallStatus === "indisponivel" || emptyHealth.overallScore == null,
  "Sem dados → score/status honesto",
);
assert(emptyHealth.confidence === "baixa", "Sem dados → confidence Baixa");
assert(
  emptyHealth.finance.status === "indisponivel",
  "Financeiro indisponível sem feed",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
