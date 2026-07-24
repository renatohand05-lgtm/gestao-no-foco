#!/usr/bin/env node
/**
 * Testes — Plano de Ação do Dia (Gate 17.1 / 17.2)
 */
import { composeExecutiveActionPlan } from "../lib/dashboard/executive-action-plan-compose.ts";
import { buildExecutiveDecisionItems } from "../lib/dashboard/executive-decision-rules.ts";

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

console.log("\nDashboard — Plano de Ação do Dia\n");

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

const baseDecision = buildExecutiveDecisionItems({
  tenantSlug: "teste-renato-01",
  hoje: {
    meta: 3500,
    faturamento: 1000,
    percentual: 28,
    dataHoje: "2026-07-22",
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
  estoque: { abaixoMinimo: 3, zerados: 1 },
  financeiro: {
    pagarVencidoQtd: 1,
    pagarVencidoValor: 5000,
    pagarVencendoHojeQtd: 0,
    pagarVencendoHojeValor: 0,
    receberVencidoQtd: 0,
    receberVencidoValor: 0,
  },
});

{
  const plan = composeExecutiveActionPlan({
    tenantSlug: "teste-renato-01",
    decisionItems: baseDecision.items,
    intelligence: emptyIntel,
  });
  assert(plan.recommendations.length > 0, "gera recomendações");
  assert(
    plan.recommendations.every((r) => r.priority === "alta" || r.priority === "media"),
    "prioridade alta ou média",
  );
  assert(
    plan.recommendations.some((r) => r.priority === "alta"),
    "há prioridade alta",
  );
  assert(
    plan.recommendations.some(
      (r) => r.id.includes("estoque-critico") && r.priority === "media",
    ),
    "warning da Decisão vira Atenção (média) no Plano",
  );
  assert(plan.recommendations.length <= 5, "limite 5 itens");
  assert(
    plan.recommendations.every((r) => r.href.startsWith("/teste-renato-01/")),
    "isolamento por tenant no href",
  );
  assert(
    plan.recommendations.some((r) => r.id.includes("meta-dia-abaixo")),
    "meta abaixo do ritmo vira ação",
  );
  assert(
    plan.recommendations.some((r) => r.title.includes("Acelerar") || r.title.includes("vendas")),
    "título acionável (não só sinal)",
  );
  assert(
    !plan.recommendations.some((r) => r.id.includes("orcamentos-recuperacao")),
    "oportunidade não entra no plano",
  );
}

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "t1",
    hoje: {
      meta: null,
      faturamento: 0,
      percentual: null,
      dataHoje: "2026-07-22",
    },
    mes: {
      metaMensal: null,
      realizadoAcumulado: 0,
      diasDecorridos: 1,
      diasTotais: 31,
    },
  });
  const plan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: decision.items,
    intelligence: emptyIntel,
  });
  assert(plan.recommendations.length === 0, "estado vazio sem dados");
}

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "acme",
    hoje: {
      meta: 1000,
      faturamento: 200,
      percentual: 20,
      dataHoje: "2026-07-22",
    },
    mes: {
      metaMensal: 10000,
      realizadoAcumulado: 1000,
      diasDecorridos: 5,
      diasTotais: 31,
      projecaoFechamento: 6000,
    },
    estoque: { abaixoMinimo: 2, zerados: 0 },
  });
  const plan = composeExecutiveActionPlan({
    tenantSlug: "acme",
    decisionItems: decision.items,
    intelligence: {
      ...emptyIntel,
      saudeOperacao: {
        status: "available",
        osAbertas: 10,
        osAtrasadas: 2,
        osAguardandoCliente: 1,
      },
      receitaPotencial: {
        status: "available",
        aguardandoAprovacaoValor: 9000,
        aguardandoAprovacaoQtd: 2,
        orcamentosPendentesValor: 0,
        orcamentosPendentesQtd: 0,
        totalValor: 9000,
      },
    },
  });
  const ids = plan.recommendations.map((r) => r.id);
  assert(new Set(ids).size === ids.length, "sem duplicidade de ids");
  assert(
    plan.recommendations.every((r) => r.href.startsWith("/acme/")),
    "link por tenant acme",
  );
  assert(
    plan.recommendations.some((r) => r.id.includes("estoque") || r.title.includes("estoque")),
    "estoque crítico gera ação",
  );
}

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "t1",
    hoje: {
      meta: 1000,
      faturamento: 200,
      percentual: 20,
      dataHoje: "2026-07-22",
    },
    mes: {
      metaMensal: 10000,
      realizadoAcumulado: 500,
      diasDecorridos: 5,
      diasTotais: 31,
      projecaoFechamento: 3000,
    },
    oficina: {
      aguardandoAprovacao: 0,
      aguardandoPecas: 0,
      aguardandoOrcamento: 0,
      atrasadas: 2,
      semAtualizacao: 0,
      maxHorasParada: 90,
    },
  });
  const plan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: decision.items,
    intelligence: emptyIntel,
  });
  assert(
    plan.recommendations.some((r) => r.id.includes("os-paradas") || r.title.includes("OS")),
    "OS atrasada gera ação",
  );
}

{
  const plan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: [],
    intelligence: emptyIntel,
    cockpit: {
      status: "partial",
      notice: "x",
      saldoAtual: 100,
      hoje: { entradasPrevistas: null, saidasPrevistas: null, saldoProjetado: 100 },
      dias7: { entradasPrevistas: 0, saidasPrevistas: 5000, saldoProjetado: -200 },
      dias30: { entradasPrevistas: 0, saidasPrevistas: 8000, saldoProjetado: -500 },
      vencidas: { pagarQtd: 1, pagarValor: 300, receberQtd: 0, receberValor: 0 },
      maiorCompromisso7d: null,
      receber30dVisaoParcial: true,
      saude: "critico",
      saudeLabel: "Crítico",
      saudeReason: "Saldo projetado em 7 dias negativo.",
    },
  });
  const item = plan.recommendations.find((r) => r.id.includes("fluxo"));
  assert(!!item, "fluxo pressionado via cockpit");
  assert(item?.priority === "alta", "fluxo crítico = alta");
}

{
  const decision = buildExecutiveDecisionItems({
    tenantSlug: "t1",
    hoje: {
      meta: 1000,
      faturamento: 200,
      percentual: 20,
      dataHoje: "2026-07-22",
    },
    mes: {
      metaMensal: 10000,
      realizadoAcumulado: 500,
      diasDecorridos: 5,
      diasTotais: 31,
      projecaoFechamento: 3000,
    },
    oficina: {
      aguardandoAprovacao: 3,
      aguardandoPecas: 0,
      aguardandoOrcamento: 0,
      atrasadas: 0,
      semAtualizacao: 0,
    },
  });
  const plan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: decision.items,
    intelligence: emptyIntel,
  });
  const aprov = plan.recommendations.find((r) =>
    r.id.includes("os-aguardando-aprovacao"),
  );
  assert(!!aprov, "OS aguardando aprovação");
  assert(
    aprov?.impactValue == null || typeof aprov.impactValue === "number",
    "impacto indisponível ou numérico",
  );
}

{
  const many = buildExecutiveDecisionItems({
    tenantSlug: "t1",
    hoje: {
      meta: 5000,
      faturamento: 500,
      percentual: 10,
      dataHoje: "2026-07-22",
    },
    mes: {
      metaMensal: 100000,
      realizadoAcumulado: 5000,
      diasDecorridos: 10,
      diasTotais: 31,
      projecaoFechamento: 15500,
    },
    oficina: {
      aguardandoAprovacao: 6,
      aguardandoPecas: 2,
      aguardandoOrcamento: 0,
      atrasadas: 3,
      semAtualizacao: 2,
      maxHorasParada: 100,
    },
    estoque: { abaixoMinimo: 5, zerados: 2 },
    financeiro: {
      pagarVencidoQtd: 4,
      pagarVencidoValor: 20000,
      pagarVencendoHojeQtd: 1,
      pagarVencendoHojeValor: 1000,
      receberVencidoQtd: 2,
      receberVencidoValor: 8000,
    },
  });
  const plan = composeExecutiveActionPlan({
    tenantSlug: "t1",
    decisionItems: many.items,
    intelligence: emptyIntel,
  });
  assert(plan.recommendations.length === 5, "corta em 5");
  for (let i = 1; i < plan.recommendations.length; i++) {
    assert(
      plan.recommendations[i - 1].score >= plan.recommendations[i].score,
      `ordenação determinística idx ${i}`,
    );
  }
}

{
  const plan = composeExecutiveActionPlan({
    tenantSlug: "outro",
    decisionItems: [],
    intelligence: {
      ...emptyIntel,
      saudeOperacao: {
        status: "available",
        osAbertas: 1,
        osAtrasadas: 0,
        osAguardandoCliente: 2,
      },
    },
  });
  const item = plan.recommendations.find((r) =>
    r.id.includes("os-aguardando-cliente"),
  );
  assert(!!item, "OS aguardando cliente (nomenclatura fiel)");
  assert(
    item?.title.toLowerCase().includes("aguardando cliente") ||
      item?.description.toLowerCase().includes("aguardando cliente"),
    "não usa CRM/retorno genérico",
  );
  assert(item?.href.includes("/outro/"), "tenant no link de OS cliente");
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
