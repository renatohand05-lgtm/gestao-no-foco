#!/usr/bin/env node
/**
 * Testes — Executive Copilot (Gate 20.3)
 * Determinístico · sem I/O · sem LLM · sem mocks inventados.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import {
  ExecutiveCopilotEngine,
  runExecutiveCopilot,
} from "../lib/ai/executive-copilot-engine.ts";
import { detectExecutiveCopilotIntent } from "../lib/ai/executive-copilot-intents.ts";
import { EXECUTIVE_COPILOT_ENGINE_VERSION } from "../lib/ai/executive-copilot-types.ts";

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

console.log("\nExecutive Copilot — Gate 20.3\n");

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
  tenantSlug: "acme-oficina",
  financeiro: baseFin,
  comercial: baseCom,
  crm: baseCrm,
  operacao: baseOp,
  estoque: baseEst,
});

function ask(query, access) {
  return runExecutiveCopilot({
    query,
    tenantSlug: "acme-oficina",
    ai,
    decision: null,
    access,
  });
}

/* ── Intents ──────────────────────────────────────────── */
const intentCases = [
  ["Como está minha empresa hoje?", "visao_geral"],
  ["O que exige atenção agora?", "prioridade_do_dia"],
  ["O que devo resolver primeiro?", "prioridade_do_dia"],
  ["Como está meu caixa?", "financeiro"],
  ["Como estão minhas vendas?", "comercial"],
  ["Minha oficina está atrasada?", "operacao"],
  ["Tenho risco de falta de peças?", "estoque"],
  ["Quais clientes estão em risco?", "crm"],
  ["Quais OS estão críticas?", "ordens_servico"],
  ["Vou bater a meta?", "metas"],
  ["Quais são os maiores riscos?", "riscos"],
  ["Onde posso ganhar mais resultado?", "oportunidades"],
  ["Qual plano de ação recomendado?", "plano_acao"],
  ["Por que meu score está em 74?", "explicacao_score"],
  ["Esses dados são confiáveis?", "cobertura_dados"],
];

for (const [q, expected] of intentCases) {
  assert(detectExecutiveCopilotIntent(q) === expected, `intent: ${expected}`);
}

assert(
  detectExecutiveCopilotIntent("Qual o cardápio do almoço?") === "unknown",
  "intent desconhecida",
);

/* Ambiguidade */
assert(
  detectExecutiveCopilotIntent("caixa de atendimento lotado") !== "financeiro",
  "ambiguidade: caixa atendimento ≠ financeiro",
);
assert(
  detectExecutiveCopilotIntent("Como está meu caixa?") === "financeiro",
  "ambiguidade: caixa sozinho → financeiro",
);
assert(
  detectExecutiveCopilotIntent("OS atrasadas na oficina") === "ordens_servico" ||
    detectExecutiveCopilotIntent("OS atrasadas na oficina") === "operacao",
  "ambiguidade: OS/oficina reconhecida",
);

/* ── Respostas por intenção ───────────────────────────── */
const labels = [
  ["visão geral", "Como está minha empresa hoje?", "visao_geral"],
  ["prioridade", "O que devo resolver primeiro?", "prioridade_do_dia"],
  ["financeiro", "Como está meu caixa?", "financeiro"],
  ["comercial", "Como estão minhas vendas?", "comercial"],
  ["operação", "Minha oficina está atrasada?", "operacao"],
  ["CRM", "Quais clientes estão em risco?", "crm"],
  ["estoque", "Tenho risco de estoque?", "estoque"],
  ["OS", "Quais OS precisam de ação?", "ordens_servico"],
  ["metas", "Vou bater a meta?", "metas"],
  ["riscos", "Quais são os maiores riscos?", "riscos"],
  ["oportunidades", "Onde posso ganhar mais resultado?", "oportunidades"],
  ["plano", "Qual plano de ação recomendado?", "plano_acao"],
  ["score", "Por que meu score está assim?", "explicacao_score"],
  ["cobertura", "Esses dados são confiáveis?", "cobertura_dados"],
];

for (const [name, q, intent] of labels) {
  const r = ask(q);
  assert(r.intent === intent, `${name}: intent`);
  assert(typeof r.answer === "string" && r.answer.length > 0, `${name}: answer`);
  assert(typeof r.summary === "string" && r.summary.length > 0, `${name}: summary`);
  assert(["alta", "media", "baixa"].includes(r.confidence), `${name}: confidence`);
  assert(Array.isArray(r.evidence), `${name}: evidence array`);
  assert(
    r.intent === "unknown" || r.evidence.length > 0,
    `${name}: evidências presentes`,
  );
  assert(r.engineVersion === EXECUTIVE_COPILOT_ENGINE_VERSION, `${name}: version`);
  assert(r.recommendedActions.length <= 3, `${name}: máx 3 ações`);
}

const unknown = ask("Qual a previsão do tempo?");
assert(unknown.intent === "unknown", "unknown intent");
assert(
  /não está disponível/i.test(unknown.answer),
  "unknown: mensagem oficial",
);

/* Determinismo */
const a = ask("Como está meu caixa?");
const b = ask("Como está meu caixa?");
assert(JSON.stringify(a) === JSON.stringify(b), "resposta determinística");

/* Tenant nos links */
const fin = ask("Como está meu caixa?");
assert(
  fin.relatedLinks.every((l) => l.href.startsWith("/acme-oficina/")),
  "tenant preservado nos links",
);
assert(!fin.relatedLinks.some((l) => /other-tenant/.test(l.href)), "sem tenant cruzado");

/* Permissões */
const denied = ask("Como está meu caixa?", { financeiro: false });
assert(
  /permiss/i.test(denied.answer) || denied.unavailableReasons.length > 0,
  "permissão: não expõe financeiro",
);
assert(denied.relatedLinks.length === 0, "permissão: sem links financeiros");

/* Sem inventar */
const blob = JSON.stringify(ask("Como está minha empresa hoje?"));
assert(!/fake|mock|lorem/i.test(blob), "sem mocks inventados");
assert(
  ask("Como está meu caixa?").evidence.every(
    (e) => e.source && e.label && e.value != null,
  ),
  "evidência com fonte/label/valor",
);

/* Engine API */
assert(
  ExecutiveCopilotEngine.run({
    query: "Cobertura dos dados",
    tenantSlug: "acme-oficina",
    ai,
  }).intent === "cobertura_dados",
  "ExecutiveCopilotEngine.run",
);

/* UI / wiring / performance contracts */
const panel = read("components/ai/executive-copilot/executive-copilot-panel.tsx");
const eic = read("components/dashboard/executive/executive-intelligence-center.tsx");
const engine = read("lib/ai/executive-copilot-engine.ts");
const pkg = read("package.json");

assert(panel.includes("use client"), "UI client panel");
assert(panel.includes("aria-live") || panel.includes("ExecutiveCopilotResponseView"), "a11y response");
assert(panel.includes("Shift+Enter") || read("components/ai/executive-copilot/executive-copilot-input.tsx").includes("Shift+Enter"), "a11y Enter/Shift+Enter");
assert(eic.includes("ExecutiveCopilotPanel"), "EIC monta Copilot");
assert(eic.includes("tenantSlug"), "tenantSlug no EIC");
assert(!engine.includes("fetch(") && !engine.includes("createClient"), "engine sem fetch/query");
assert(!engine.includes("openai") && !engine.includes("OpenAI"), "sem API externa");
assert(pkg.includes("test:executive-copilot"), "package.json script");
assert(panel.includes("sm:grid-cols-2") || read("components/ai/executive-copilot/executive-copilot-evidence.tsx").includes("sm:grid-cols-2"), "responsivo evidências 2 cols");

/* Score explanation uses real score */
const scoreR = ask("Por que meu score está em 74?");
assert(
  scoreR.intent === "explicacao_score" &&
    (ai.executiveScore == null ||
      scoreR.answer.includes(String(Math.round(ai.executiveScore))) ||
      scoreR.evidence.some((e) => e.domain === "score")),
  "explicação score com evidência real",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
