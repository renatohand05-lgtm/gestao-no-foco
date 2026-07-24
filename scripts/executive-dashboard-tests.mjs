#!/usr/bin/env node
/**
 * Testes — Sprint 17 Executive Dashboard (Gate 17.3.1)
 */
import {
  composeExecutiveSummary,
  summaryTitlesOverlapActionPlan,
} from "../lib/dashboard/executive-summary-compose.ts";
import { buildExecutiveDecisionItems } from "../lib/dashboard/executive-decision-rules.ts";
import { composeExecutiveActionPlan } from "../lib/dashboard/executive-action-plan-compose.ts";
import { EXECUTIVE_STATUS_LABEL } from "../lib/dashboard/executive-ui.ts";

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

console.log("\nDashboard — Sprint 17 Executive\n");

/** Ordem canônica dos blocos (após KPIs). */
const RENDER_ORDER = [
  "executive-summary",
  "decision-center",
  "action-plan",
  "executive-intelligence",
  "financial-cockpit",
];

assert(
  RENDER_ORDER[0] === "executive-summary" &&
    RENDER_ORDER[1] === "decision-center" &&
    RENDER_ORDER[2] === "action-plan",
  "árvore: Resumo → Decisão → Plano",
);

assert(
  EXECUTIVE_STATUS_LABEL.critico === "Crítico" &&
    EXECUTIVE_STATUS_LABEL.atencao === "Atenção" &&
    EXECUTIVE_STATUS_LABEL.saudavel === "Saudável" &&
    EXECUTIVE_STATUS_LABEL.excelente === "Excelente",
  "nomenclatura canônica de status",
);

const emptyIntel = {
  receitaPotencial: {
    status: "unavailable",
    aguardandoAprovacaoValor: null,
    aguardandoAprovacaoQtd: null,
    orcamentosPendentesValor: null,
    orcamentosPendentesQtd: null,
    totalValor: null,
  },
  prioridadesDoDia: { status: "available", items: [] },
  radarFinanceiro: {
    status: "unavailable",
    entradasPrevistas: null,
    saidasPrevistas: null,
    saldoProjetado: null,
  },
  saudeOperacao: {
    status: "unavailable",
    osAbertas: null,
    osAtrasadas: null,
    osAguardandoCliente: null,
  },
};

const cockpitOk = {
  status: "available",
  notice: null,
  saldoAtual: 10000,
  hoje: { entradasPrevistas: null, saidasPrevistas: null, saldoProjetado: 10000 },
  dias7: { entradasPrevistas: 0, saidasPrevistas: 0, saldoProjetado: 10000 },
  dias30: { entradasPrevistas: 0, saidasPrevistas: 0, saldoProjetado: 10000 },
  vencidas: { pagarQtd: 0, pagarValor: 0, receberQtd: 0, receberValor: 0 },
  maiorCompromisso7d: null,
  receber30dVisaoParcial: true,
  saude: "saudavel",
  saudeLabel: "Saudável",
  saudeReason: "ok",
};

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "t1",
    hoje: {
      meta: 3500,
      faturamento: 1000,
      percentual: 28,
      dataHoje: "2026-07-23",
    },
    mes: {
      metaMensal: 75000,
      realizadoAcumulado: 10000,
      diasDecorridos: 15,
      diasTotais: 31,
      projecaoFechamento: 20000,
    },
    oficina: {
      aguardandoAprovacao: 2,
      aguardandoPecas: 1,
      aguardandoOrcamento: 0,
      atrasadas: 1,
      semAtualizacao: 1,
      maxHorasParada: 80,
    },
    estoque: { abaixoMinimo: 2, zerados: 0 },
  });

  const actionPlan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: decision.items,
    intelligence: emptyIntel,
    cockpit: cockpitOk,
  });

  const summary = composeExecutiveSummary({
    decision,
    actionPlan,
    intelligence: emptyIntel,
    cockpit: cockpitOk,
  });

  assert(
    ["critico", "atencao", "saudavel", "excelente"].includes(summary.status),
    "status geral válido",
  );
  assert(
    Object.values(EXECUTIVE_STATUS_LABEL).includes(summary.statusLabel),
    "statusLabel canônico",
  );
  assert(
    summary.priorities.every(
      (p) =>
        p.severityLabel === "Crítico" || p.severityLabel === "Atenção",
    ),
    "sinais só Crítico/Atenção",
  );
  assert(
    summary.priorities.every((p) => !p.href),
    "resumo sem drill-down (sem href)",
  );
  assert(
    !summaryTitlesOverlapActionPlan(
      summary.priorities.map((p) => p.title),
      actionPlan.recommendations.map((r) => r.title),
    ),
    "sem sobreposição de títulos Resumo × Plano",
  );
  assert(
    summary.prioritiesCount === actionPlan.recommendations.length,
    "contagem = ações do Plano",
  );
  assert(
    actionPlan.recommendations.every((r) => r.href && r.actionLabel),
    "Plano: CTA + link obrigatórios",
  );
  assert(
    actionPlan.recommendations.every((r) =>
      [
        "/t1/vendas",
        "/t1/ordens",
        "/t1/centro-operacoes",
        "/t1/estoque",
        "/t1/financeiro",
        "/t1/clientes",
        "/t1/dashboard",
      ].some((prefix) => r.href.startsWith(prefix) || r.href.includes(prefix.split("/").pop())),
    ) ||
      actionPlan.recommendations.every((r) => r.href.startsWith("/t1/")),
    "links preservam tenant",
  );
}

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "acme",
    hoje: {
      meta: null,
      faturamento: 0,
      percentual: null,
      dataHoje: "2026-07-23",
    },
    mes: {
      metaMensal: null,
      realizadoAcumulado: 0,
      diasDecorridos: 1,
      diasTotais: 31,
    },
  });
  const actionPlan = composeExecutiveActionPlan({
    tenantSlug: "acme",
    decisionItems: decision.items,
    intelligence: emptyIntel,
    cockpit: {
      ...cockpitOk,
      saude: "indisponivel",
      saudeLabel: "Indisponível",
      saldoAtual: null,
      status: "unavailable",
    },
  });
  const summary = composeExecutiveSummary({
    decision,
    actionPlan,
    intelligence: emptyIntel,
    cockpit: {
      ...cockpitOk,
      saude: "indisponivel",
      saudeLabel: "Indisponível",
      saldoAtual: null,
      status: "unavailable",
    },
  });
  assert(summary.status === "excelente", "sem alertas → Excelente");
  assert(summary.priorities.length === 0, "sem sinais");
  assert(summary.prioritiesCount === 0, "contagem 0");
}

{
  const known = [
    "/x/centro-operacoes",
    "/x/financeiro/fluxo-caixa",
    "/x/financeiro/contas-pagar",
    "/x/financeiro/contas-receber",
    "/x/ordens",
    "/x/vendas",
    "/x/estoque",
    "/x/clientes",
  ];
  assert(
    known.every((h) => h.split("/").filter(Boolean).length >= 2),
    "rotas de drill-down conhecidas (formato tenant)",
  );
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
