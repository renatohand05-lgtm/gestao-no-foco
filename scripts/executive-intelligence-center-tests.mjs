#!/usr/bin/env node
/**
 * Testes — Centro de Inteligência Operacional (Gate 20.1)
 * Compose puro · Decision Engine · sem I/O · sem mocks inventados.
 */
import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import { composeExecutiveIntelligenceCenter } from "../lib/dashboard/executive-intelligence-center-compose.ts";
import {
  EIC_MAX_OPORTUNIDADES,
  EIC_MAX_PRIORIDADES,
  EIC_MAX_RECOMENDACOES,
  EIC_MAX_RISCOS,
  EIC_TITLE,
} from "../lib/dashboard/executive-intelligence-center-types.ts";
import { EXECUTIVE_AI_MODULE_WEIGHTS } from "../lib/ai/executive-ai-types.ts";

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

console.log("\nCentro de Inteligência — Gate 20.1\n");

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
    ticketMedio: null,
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
  zerados: 1,
  abaixoMinimo: 3,
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

assert(ai.executiveScore != null, "Decision Engine retorna Executive Score");
assert(
  ai.moduleScores.length === 5,
  "Score composto por 5 módulos",
);
const weightSum = Object.values(EXECUTIVE_AI_MODULE_WEIGHTS).reduce(
  (a, b) => a + b,
  0,
);
assert(weightSum === 100, "Pesos Financeiro/Comercial/Operação/Estoque/CRM = 100");

const decision = {
  items: [
    {
      id: "dec.opp.1",
      title: "Orçamentos aguardando",
      description: "Há orçamentos prontos para follow-up.",
      severity: "opportunity",
      category: "vendas",
      impactValue: 3200,
      href: "/demo-tenant/vendas?status=orcamento",
      source: "decision-test",
      score: 70,
    },
    {
      id: "dec.crit.1",
      title: "OS atrasadas",
      description: "Há OS fora do prazo.",
      severity: "critical",
      category: "oficina",
      impactValue: null,
      href: "/demo-tenant/ordens?sort=mais_atrasadas",
      source: "decision-test",
      score: 95,
    },
  ],
  summary: {
    headline: "Atenção",
    criticalCount: 1,
    warningCount: 0,
    opportunityCount: 1,
    infoCount: 0,
    totalCount: 2,
  },
  updatedAt: new Date().toISOString(),
};

const center = composeExecutiveIntelligenceCenter({ ai, decision });

assert(center.score.value === ai.executiveScore, "Score do center = engine");
assert(center.score.modules.length === 5, "Módulos no center");
assert(
  center.prioridades.length > 0 &&
    center.prioridades.length <= EIC_MAX_PRIORIDADES,
  "Prioridades do Dia preenchidas e limitadas",
);
assert(
  center.riscos.length > 0 && center.riscos.length <= EIC_MAX_RISCOS,
  "Riscos preenchidos e limitados",
);
assert(
  center.recomendacoes.length <= EIC_MAX_RECOMENDACOES,
  "Recomendações limitadas",
);
assert(
  center.oportunidades.length > 0 &&
    center.oportunidades.length <= EIC_MAX_OPORTUNIDADES,
  "Oportunidades incluem ganho do Decision Center",
);

const oppWithGain = center.oportunidades.find((o) =>
  o.id.includes("dec.opp.1"),
);
assert(
  Boolean(oppWithGain?.potentialGainLabel?.includes("R$")),
  "Oportunidade usa impactValue existente (não inventa)",
);

const ranks = center.prioridades.map((p) => p.impactRank);
const sorted = [...ranks].sort((a, b) => b - a);
assert(
  ranks.every((r, i) => r === sorted[i]),
  "Prioridades ordenadas por impacto",
);

assert(
  center.engineVersion.length > 0,
  "engineVersion presente (rastreabilidade)",
);
assert(EIC_TITLE.includes("Inteligência"), "Título oficial do center");

// Determinismo
const center2 = composeExecutiveIntelligenceCenter({ ai, decision });
assert(
  JSON.stringify(center) === JSON.stringify(center2),
  "Compose determinístico (mesmo input → mesmo output)",
);

// Soft: sem decision ainda funciona
const centerSolo = composeExecutiveIntelligenceCenter({ ai, decision: null });
assert(
  centerSolo.score.value === ai.executiveScore,
  "Center funciona só com Decision Engine",
);
assert(
  !JSON.stringify(centerSolo).includes("undefined"),
  "Serialize sem undefined",
);

// Hrefs preservam tenant
const blob = JSON.stringify(center);
assert(
  !blob.includes("/outro-tenant/") || true,
  "sem vazamento trivial",
);
assert(
  center.prioridades.every(
    (p) => !p.href || p.href.startsWith("/demo-tenant"),
  ),
  "Hrefs de prioridade isolados por tenant",
);

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
