#!/usr/bin/env node
/**
 * Testes — Centro de Decisão (Gate 16.2)
 */
import {
  buildDecisionSummary,
  buildExecutiveDecisionItems,
  sortDecisionItems,
} from "../lib/dashboard/executive-decision-rules.ts";

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

console.log("\nDashboard — Centro de Decisão\n");

const base = {
  tenantSlug: "teste-renato-01",
  hoje: {
    meta: 3500,
    faturamento: 2000,
    percentual: 57,
    dataHoje: "2026-07-22",
  },
  mes: {
    metaMensal: 75000,
    realizadoAcumulado: 10000,
    diasDecorridos: 15,
    diasTotais: 31,
    projecaoFechamento: 20000,
  },
};

{
  const r = buildExecutiveDecisionItems(base);
  const item = r.items.find((i) => i.id === "meta-dia-abaixo");
  assert(!!item, "meta abaixo do ritmo");
  assert(item?.severity === "warning", "meta abaixo = warning");
  assert(item?.href?.includes("/vendas"), "link vendas");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    hoje: {
      meta: 3500,
      faturamento: 3787,
      percentual: 108.2,
      dataHoje: "2026-07-22",
    },
    mes: {
      ...base.mes,
      projecaoFechamento: 80000,
    },
  });
  const item = r.items.find((i) => i.id === "meta-dia-atingida");
  assert(!!item, "meta atingida");
  assert(item?.severity === "opportunity", "meta atingida = opportunity");
  assert(
    !r.items.some((i) => i.id === "meta-dia-abaixo"),
    "não duplica meta abaixo quando atingida",
  );
}

{
  const r = buildExecutiveDecisionItems(base);
  const item = r.items.find((i) => i.id === "projecao-mes-abaixo");
  assert(!!item, "projeção mensal abaixo");
  assert(item?.severity === "warning", "projeção = warning");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    hoje: { ...base.hoje, percentual: 90, faturamento: 3150 },
    oficina: {
      aguardandoAprovacao: 3,
      aguardandoPecas: 0,
      aguardandoOrcamento: 0,
      atrasadas: 0,
      semAtualizacao: 0,
    },
  });
  const item = r.items.find((i) => i.id === "os-aguardando-aprovacao");
  assert(!!item, "OS aguardando aprovação");
  assert(item?.href?.includes("aguardando_aprovacao"), "link OS aprovação");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    oficina: {
      aguardandoAprovacao: 0,
      aguardandoPecas: 2,
      aguardandoOrcamento: 0,
      atrasadas: 1,
      semAtualizacao: 2,
      maxHorasParada: 80,
    },
  });
  const item = r.items.find((i) => i.id === "os-paradas");
  assert(!!item, "OS paradas");
  assert(item?.severity === "critical", "OS atrasada = critical");
  assert(item?.href?.includes("centro-operacoes"), "link oficina");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    estoque: { abaixoMinimo: 4, zerados: 1 },
  });
  const item = r.items.find((i) => i.id === "estoque-critico");
  assert(!!item, "estoque crítico");
  assert(item?.href?.endsWith("/estoque"), "link estoque");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    financeiro: {
      pagarVencidoQtd: 2,
      pagarVencidoValor: 1500,
      pagarVencendoHojeQtd: 0,
      pagarVencendoHojeValor: 0,
      receberVencidoQtd: 0,
      receberVencidoValor: 0,
    },
  });
  const item = r.items.find((i) => i.id === "contas-pagar-atencao");
  assert(!!item, "contas vencidas");
  assert(item?.severity === "critical", "pagar vencido = critical");
  assert(item?.href?.includes("contas-pagar"), "link pagar");
}

{
  const r = buildExecutiveDecisionItems({
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
      projecaoFechamento: null,
    },
  });
  assert(r.items.length === 0, "nenhum alerta sem dados");
  assert(
    r.summary.headline.includes("Nenhum risco crítico"),
    "headline vazia coerente",
  );
}

{
  const items = [
    {
      id: "b",
      title: "b",
      description: "",
      severity: "warning",
      category: "vendas",
      source: "t",
      score: 70,
    },
    {
      id: "a",
      title: "a",
      description: "",
      severity: "critical",
      category: "vendas",
      source: "t",
      score: 100,
    },
    {
      id: "c",
      title: "c",
      description: "",
      severity: "info",
      category: "vendas",
      source: "t",
      score: 20,
    },
  ];
  const sorted = sortDecisionItems(items);
  assert(sorted[0].id === "a", "ordenação: crítico primeiro");
  assert(sorted[1].id === "b", "ordenação: warning depois");
  assert(sorted[2].id === "c", "ordenação: info por último");
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    financeiro: {
      pagarVencidoQtd: 1,
      pagarVencidoValor: 50000,
      pagarVencendoHojeQtd: 0,
      pagarVencendoHojeValor: 0,
      receberVencidoQtd: 1,
      receberVencidoValor: 100,
    },
    oficina: {
      aguardandoAprovacao: 1,
      aguardandoPecas: 0,
      aguardandoOrcamento: 2,
      atrasadas: 0,
      semAtualizacao: 0,
    },
  });
  assert(r.items[0].severity === "critical", "maior prioridade no topo");
  const limited = r.items.slice(0, 5);
  assert(limited.length <= 5, "limite 5 itens (slice)");
  assert(
    new Set(r.items.map((i) => i.id)).size === r.items.length,
    "sem ids duplicados",
  );
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    tenantSlug: "outro-tenant",
  });
  assert(
    r.items.every((i) => !i.href || i.href.startsWith("/outro-tenant/")),
    "isolamento por tenant no href",
  );
}

{
  const r = buildExecutiveDecisionItems({
    ...base,
    hoje: { meta: 0, faturamento: 100, percentual: null, dataHoje: "2026-07-22" },
  });
  assert(
    !r.items.some((i) => i.id.startsWith("meta-dia")),
    "meta zero não gera alerta de ritmo",
  );
}

{
  const summary = buildDecisionSummary([
    {
      id: "1",
      title: "x",
      description: "",
      severity: "critical",
      category: "vendas",
      source: "t",
      score: 100,
    },
  ]);
  assert(
    summary.headline.includes("1 risco crítico"),
    "headline 1 crítico",
  );
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
