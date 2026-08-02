#!/usr/bin/env node
/**
 * Sprint 27.8.2 — labels, serviços comerciais, meta dashboard.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTechnicalId,
  resolveOptionLabel,
} from "../lib/gf/resolve-option-label.ts";
import {
  formatFormaPagamentoLabel,
  getPaymentMethodLabel,
} from "../lib/financeiro/payment-method-label.ts";
import {
  buildCatalogItemSelectLabel,
  calcServiceMarginOnPrice,
  formatServiceMargin,
} from "../lib/produtos/service-commercial.ts";
import {
  calcMetaAtingimento,
  classifyMetaDashboardStatus,
} from "../lib/metas/meta-dashboard-math.ts";

const root = process.cwd();
const suite = process.argv[2] ?? "all";
let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log("  PASS ", msg);
  } else {
    fail++;
    console.log("  FAIL ", msg);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel) {
  return existsSync(join(root, rel));
}

function runSelectLabel() {
  console.log("\n## select-label-resolution\n");
  assert(exists("lib/gf/resolve-option-label.ts"), "resolve-option-label exists");
  assert(exists("components/gf/gf-select.tsx"), "GFSelect exists");
  const gf = read("components/gf/gf-select.tsx");
  assert(gf.includes("items={items}"), "GFSelect passa items ao Root");
  assert(gf.includes("resolveOptionLabel"), "GFSelect usa resolveOptionLabel");
  assert(
    gf.includes("Registro indisponível"),
    "fallback visual sem UUID",
  );

  const id = "30695788-5fe7-4685-a2b2-8bb50076478a";
  assert(isTechnicalId(id), "detecta UUID");
  const label = resolveOptionLabel(id, [
    { value: id, label: "Operação — Oficina" },
  ]);
  assert(label === "Operação — Oficina", "resolve label da option");
  assert(
    resolveOptionLabel(id, []) === "Registro indisponível",
    "UUID sem option → indisponível",
  );
  assert(
    !isTechnicalId(resolveOptionLabel(id, [])),
    "fallback nunca é UUID",
  );
  assert(resolveOptionLabel("", []) === "", "vazio não vira indisponível");
}

function runCostCenter() {
  console.log("\n## cost-center-label\n");
  const form = read("components/vendas/venda-form.tsx");
  assert(form.includes("centro.nome"), "centro usa nome no label");
  assert(form.includes("Código:"), "centro mostra código na description");
  assert(
    !form.includes("label: `${centro.codigo} · ${centro.nome}`"),
    "não usa só código·nome concatenado sem description",
  );
}

function runPayment() {
  console.log("\n## payment-method-label\n");
  assert(exists("lib/financeiro/payment-method-label.ts"), "helper existe");
  assert(getPaymentMethodLabel("cartao_credito") === "Cartão de crédito", "crédito");
  assert(getPaymentMethodLabel("cartao_debito") === "Cartão de débito", "débito");
  assert(getPaymentMethodLabel("dinheiro") === "Dinheiro", "dinheiro");
  assert(getPaymentMethodLabel("pix").toLowerCase() === "pix", "pix");
  assert(
    getPaymentMethodLabel("transferencia").includes("Transferência"),
    "transferencia",
  );
  assert(
    formatFormaPagamentoLabel({ nome: "Visa Loja", tipo: "cartao_credito" }) ===
      "Visa Loja",
    "catálogo nome prevalece",
  );
  assert(
    formatFormaPagamentoLabel({ nome: "cartao_credito", tipo: "cartao_credito" }) ===
      "Cartão de crédito",
    "nome técnico mapeado",
  );
  assert(
    formatFormaPagamentoLabel({ nome: "CREDITO", tipo: "cartao_credito" }) ===
      "Cartão de crédito",
    "código MAIÚSCULO mapeado via tipo",
  );
  assert(
    formatFormaPagamentoLabel({ nome: "PIX", tipo: "pix" })
      .toLowerCase()
      .includes("pix"),
    "PIX → Pix",
  );
  const rapida = read("components/vendas/venda-rapida-form.tsx");
  assert(rapida.includes("formatFormaPagamentoLabel"), "venda rápida usa helper");
  assert(!rapida.includes("(${f.tipo})"), "não mostra tipo cru entre parênteses");
}

function runProductServiceLabel() {
  console.log("\n## product-service-label\n");
  const label = buildCatalogItemSelectLabel({
    id: "4d0b0e78-6974-4988-b350-3bb4361e0e43",
    nome: "Troca de pastilha",
    tipo: "servico",
    codigo_interno: "SRV-001",
    preco_venda: 180,
    custo: 85,
    preco_sugerido: 210,
  });
  assert(label.includes("SERVIÇO"), "badge serviço");
  assert(label.includes("Troca de pastilha"), "nome");
  assert(label.includes("SRV-001"), "código");
  assert(!label.includes("4d0b0e78"), "sem UUID no label");
  const form = read("components/vendas/venda-form.tsx");
  assert(form.includes("buildCatalogItemSelectLabel"), "venda-form usa label rico");
}

function runServicePrice() {
  console.log("\n## service-price-visibility\n");
  const table = read("components/produtos/produto-table.tsx");
  assert(table.includes("Custo MO") || table.includes("servicosMode"), "tabela serviços");
  assert(table.includes("Preço sugerido"), "coluna sugerido");
  assert(table.includes("formatServiceMargin"), "margem");
  const detail = read("components/produtos/produto-detail.tsx");
  assert(detail.includes("Dados do serviço"), "detalhe serviço");
  assert(detail.includes("preco_sugerido"), "detalhe preço sugerido");
  const listSel = read("lib/produtos/produto-service.ts");
  assert(listSel.includes("preco_sugerido"), "LIST_SELECT com campos serviço");
}

function runServiceMargin() {
  console.log("\n## service-margin\n");
  assert(calcServiceMarginOnPrice(85, 180) != null, "margem calculável");
  assert(
    Math.abs(calcServiceMarginOnPrice(85, 180) - (180 - 85) / 180) < 1e-9,
    "fórmula (preço-custo)/preço",
  );
  assert(calcServiceMarginOnPrice(10, 0) == null, "preço zero → null");
  assert(formatServiceMargin(10, 0) === "Indisponível", "label indisponível");
}

function runDashboardGoal() {
  console.log("\n## dashboard-goal-source\n");
  assert(exists("lib/metas/resolve-meta-mensal.ts"), "resolve meta canônico");
  const dia = read("lib/dashboard/vendas-dia-service.ts");
  assert(dia.includes("resolveMetaMensalVigente"), "vendas-dia usa canônico");
  const resumo = read("lib/dashboard/resumo-vendas-mes-service.ts");
  assert(resumo.includes("resolveMetaMensalVigente"), "resumo-mes usa canônico");
  const agg = read("lib/executive-command-center/aggregator.ts");
  assert(
    agg.includes("Meta não cadastrada") || agg.includes("Indisponível"),
    "ECC não mascara meta ausente",
  );
  assert(!agg.includes("formatPredictivePct(comercial.metaPercentual)"), "não usa % como meta");
  assert(calcMetaAtingimento(50, 100) === 0.5, "atingimento");
  assert(calcMetaAtingimento(50, 0) == null, "meta 0 → null");
  assert(calcMetaAtingimento(50, null) == null, "meta null → null");
  assert(classifyMetaDashboardStatus(null, null) === "Não cadastrada", "status");
  assert(classifyMetaDashboardStatus(1.1, 100) === "Superada", "superada");
}

function runGoalRefresh() {
  console.log("\n## dashboard-goal-refresh\n");
  const actions = read("lib/metas/actions.ts");
  assert(actions.includes("revalidatePath(`/${tenantSlug}/dashboard`)"), "revalidate dashboard");
  assert(actions.includes("analytics"), "revalidate analytics");
  assert(actions.includes("inteligencia"), "revalidate inteligencia");
  assert(actions.includes("revalidateTag"), "revalidateTag meta");
  assert(actions.includes("updateTag"), "updateTag meta");
}

function runGoalPeriod() {
  console.log("\n## goal-period-resolution\n");
  const src = read("lib/metas/resolve-meta-mensal.ts");
  const scope = read("lib/metas/meta-scope.ts");
  assert(
    src.includes("fallback_geral") || scope.includes("fallback_geral"),
    "fallback centro → geral",
  );
  assert(src.includes("toCompetenciaMonthStart"), "normaliza competência");
  assert(src.includes("nao_cadastrada"), "status não cadastrada");
}

function runGoalTenant() {
  console.log("\n## goal-tenant-isolation\n");
  const src = read("lib/metas/resolve-meta-mensal.ts");
  assert(src.includes('.eq("tenant_id", tenantId)'), "filtra tenant_id");
  assert(src.includes("deleted_at"), "respeita soft-delete");
}

const runners = {
  "select-label-resolution": runSelectLabel,
  "cost-center-label": runCostCenter,
  "payment-method-label": runPayment,
  "product-service-label": runProductServiceLabel,
  "service-price-visibility": runServicePrice,
  "service-margin": runServiceMargin,
  "dashboard-goal-source": runDashboardGoal,
  "dashboard-goal-refresh": runGoalRefresh,
  "goal-period-resolution": runGoalPeriod,
  "goal-tenant-isolation": runGoalTenant,
  all() {
    for (const [k, fn] of Object.entries(runners)) {
      if (k === "all") continue;
      fn();
    }
  },
};

console.log("\nSprint 27.8.2 tests —", suite);
const fn = runners[suite];
if (!fn) {
  console.error("Suite desconhecida:", suite);
  process.exit(1);
}
fn();
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
