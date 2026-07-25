#!/usr/bin/env node
/**
 * Gate 20.1.1 — Executive Cockpit Premium
 * UI/hierarquia · sem I/O · sem mocks inventados · sem alterar compose.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runExecutiveDecisionEngine } from "../lib/dashboard/executive-decision-engine.ts";
import { composeExecutiveIntelligenceCenter } from "../lib/dashboard/executive-intelligence-center-compose.ts";
import {
  EIC_MAX_PRIORIDADES,
  EIC_MAX_OPORTUNIDADES,
  EIC_MAX_RISCOS,
} from "../lib/dashboard/executive-intelligence-center-types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
let skip = 0;

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

function blockIndex(src, marker) {
  return src.indexOf(marker);
}

console.log("\nExecutive Cockpit Premium — Gate 20.1.1\n");

const streaming = read("components/dashboard/dashboard-streaming.tsx");
const hero = read("components/dashboard/executive/executive-cockpit-hero.tsx");
const eic = read(
  "components/dashboard/executive/executive-intelligence-center.tsx",
);
const header = read(
  "components/dashboard/executive/executive-dashboard-header.tsx",
);
const aiCard = read("components/dashboard/executive/executive-ai-card.tsx");
const decision = read(
  "components/dashboard/executive/executive-decision-center.tsx",
);
const actionPlan = read(
  "components/dashboard/executive/executive-action-plan-section.tsx",
);
const commercial = read(
  "components/vendas/commercial-intelligence-summary-card.tsx",
);
const pkg = read("package.json");

/* ── Hero ─────────────────────────────────────────────── */
assert(
  hero.includes("data-dashboard-block=\"executive-cockpit-hero\""),
  "Hero: data-dashboard-block presente",
);
assert(
  hero.includes("Executive Score") && hero.includes("Prioridade do dia"),
  "Hero: score + prioridade do dia",
);
assert(
  hero.includes("DashboardRefreshButton") && hero.includes("updatedAtLabel"),
  "Hero: atualizar dados + última atualização",
);
assert(
  hero.includes("Cobertura parcial") || hero.includes("partial"),
  "Hero: cobertura honesta",
);
assert(
  hero.includes("gofMotion"),
  "Hero: microinteração gofMotion",
);

/* ── Header sem greeting duplicado ─────────────────────── */
assert(
  header.includes("Cockpit Executivo"),
  "Header: título de contexto (sem saudação)",
);
assert(
  !header.includes("title={greeting}"),
  "Header: greeting não é título",
);

/* ── Wiring Hero props ─────────────────────────────────── */
assert(
  streaming.includes("greeting={ctx.greeting}") &&
    streaming.includes("dateLabel={dateLabel}") &&
    streaming.includes("updatedAtLabel={hojeData.atualizado_em_label}"),
  "Streaming: props do Hero repassadas ao AI block",
);
assert(
  aiCard.includes("greeting={greeting}") &&
    aiCard.includes("ExecutiveIntelligenceCenter"),
  "AI Card: props → Intelligence Center",
);
assert(
  eic.includes("ExecutiveCockpitHero"),
  "EIC: monta Hero Executivo",
);

/* ── Hierarquia (ordem no streaming) ───────────────────── */
const hojeBlockStart = streaming.indexOf('data-dashboard-block="hoje-v2"');
assert(hojeBlockStart >= 0, "Hierarquia: bloco hoje-v2 presente");
const hojeBlock = streaming.slice(hojeBlockStart);
const orderMarkers = [
  "ExecutiveDashboardHeader",
  "DashboardQuickActions",
  "ExecutiveAiLazyBlock",
  "ResumoVendasHojeCards",
  "ExecutiveIntelligenceSection",
  "ExecutiveDecisionCenter",
  "ExecutiveActionPlanSection",
  "ExecutiveFinancialCockpit",
  "CommercialIntelligenceSummaryCard",
  "ExecutiveSummarySection",
  "ResumoLeituraDoDia",
  "ResumoVendasMesTable",
];
const idxs = orderMarkers.map((m) => blockIndex(hojeBlock, m));
assert(
  idxs.every((i) => i >= 0),
  "Hierarquia: todos os blocos presentes no streaming",
);
assert(
  idxs.every((v, i, arr) => i === 0 || v > arr[i - 1]),
  "Hierarquia: ordem Hero/AI antes de metas, decisão, financeiro, resumo, mês",
);
assert(
  blockIndex(hojeBlock, "ExecutiveAiLazyBlock") <
    blockIndex(hojeBlock, "ResumoVendasHojeCards"),
  "Hierarquia: Intelligence Center (Hero) antes de Metas/ritmo",
);

/* ── Score / painéis ───────────────────────────────────── */
assert(
  eic.includes("Score por domínio") &&
    eic.includes("tendência indisponível"),
  "Score: domínio com tendência honesta",
);
assert(
  eic.includes("Prioridades do Dia") &&
    eic.includes("Oportunidades") &&
    eic.includes("Riscos"),
  "Painéis: prioridades / oportunidades / riscos separados",
);
assert(
  eic.includes("Confirmado") && eic.includes("Estimado") && eic.includes("Parcial"),
  "Painéis: status de confiança honestos",
);
assert(
  eic.includes("<details") && eic.includes("defaultOpen={false}"),
  "Painéis: disclosure acessível (recomendações fechadas)",
);

/* ── Decision / Action compactados ─────────────────────── */
assert(
  decision.includes("<details") && decision.includes("Ver detalhe por domínio"),
  "Decision Center: detalhe sob disclosure",
);
assert(
  actionPlan.includes("Ver mais") && actionPlan.includes("slice(0, 3)"),
  "Action Plan: top 3 + disclosure",
);

/* ── Comercial premium ─────────────────────────────────── */
assert(
  commercial.includes("MetricCard") &&
    commercial.includes("Faturamento") &&
    commercial.includes("Conversão"),
  "Comercial: KPIs MetricCard sem novos dados",
);

/* ── Compose intacto + limites ─────────────────────────── */
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
  tenantSlug: "demo-tenant",
  financeiro: baseFin,
  comercial: baseCom,
  crm: baseCrm,
  operacao: baseOp,
  estoque: baseEst,
});
const center = composeExecutiveIntelligenceCenter({ ai, decision: null });

assert(center.score.value != null, "Compat EIC: score calculado (sem inventar)");
assert(
  center.prioridades.length <= EIC_MAX_PRIORIDADES,
  "Prioridades: máx 5",
);
assert(
  center.oportunidades.length <= EIC_MAX_OPORTUNIDADES,
  "Oportunidades: máx 5",
);
assert(center.riscos.length <= EIC_MAX_RISCOS, "Riscos: máx 5");
assert(
  center.priorityHeadline.title.length > 0,
  "Hero: prioridade headline disponível",
);
assert(
  !JSON.stringify(center).includes("mock") &&
    !JSON.stringify(center).includes("fake"),
  "Sem mocks inventados no compose",
);

/* ── Performance / contratos ───────────────────────────── */
assert(
  !streaming.includes("createClient") &&
    !streaming.includes("from(\"") &&
    !streaming.includes(".rpc("),
  "Streaming: sem query SQL nova",
);
assert(
  !hero.includes("fetch(") && !eic.includes("fetch("),
  "Hero/EIC: sem fetch novo",
);
assert(
  pkg.includes("test:executive-cockpit-premium"),
  "package.json: script test:executive-cockpit-premium",
);

/* ── A11y / motion ─────────────────────────────────────── */
assert(
  hero.includes("aria-labelledby") || eic.includes("aria-"),
  "A11y: landmarks / labels presentes",
);
assert(
  decision.includes("aria-expanded") || decision.includes("<details"),
  "A11y: disclosure Decision Center",
);
assert(
  hero.includes("motion-safe") ||
    hero.includes("gofMotion") ||
    eic.includes("gofMotion"),
  "Motion: tokens com prefers-reduced-motion",
);

/* ── Responsividade (contratos de grid) ────────────────── */
assert(
  eic.includes("sm:grid-cols-2") && eic.includes("lg:grid-cols-5"),
  "Responsivo: score por domínio 2→5 cols",
);
assert(
  commercial.includes("gofGrid") || commercial.includes("threeCol"),
  "Responsivo: comercial em grid",
);

console.log(
  `\nResultado: ${pass} PASS · ${fail} FAIL · ${skip} SKIP\n`,
);
process.exit(fail > 0 ? 1 : 0);
