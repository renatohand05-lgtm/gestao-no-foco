#!/usr/bin/env node
/**
 * Fase 25 — Supply Core tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUPPLY_KPI_CATALOG,
  assertMovementKind,
  buildExecutiveSupplyBundle,
  buildSupplyEnterpriseSnapshotFromSources,
  canTransitionPurchase,
  computeTargetMargin,
  emptySupplyEnterpriseSnapshot,
  getSupplyFeatureFlags,
  getSupplyKpiDefinition,
  movementBalanceDelta,
  normalizeProductTipo,
  productTracksStock,
  resolveSupplyCatalogKpis,
  resolveSupplyKpi,
  resolveSupplyProvider,
  sanitizeSupplyFilter,
  toLegacyMovementType,
} from "../lib/supply/index.ts";

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

console.log("\nSupply Core — Fase 25\n");

assert(existsSync(join(root, "lib/supply/index.ts")), "Barrel lib/supply");
assert(
  existsSync(join(root, "lib/supply/enterprise/orchestrator.ts")),
  "Orchestrator",
);
assert(
  existsSync(join(root, "lib/supply/enterprise/kpi-catalog.ts")),
  "KPI catalog",
);
assert(
  existsSync(join(root, "lib/supply/supply-feature-flags.ts")),
  "Feature flags",
);
assert(read("package.json").includes("test:supply-core"), "script test:supply-core");
assert(
  existsSync(
    join(root, "supabase/migrations/20260813_supply_chain_enterprise_fase25.sql"),
  ),
  "Migration 20260813",
);
assert(
  read("supabase/migrations/20260813_supply_chain_enterprise_fase25.sql").includes(
    "NÃO executar automaticamente",
  ),
  "Migration marca aplicação manual",
);

assert(SUPPLY_KPI_CATALOG.length >= 14, "Catálogo KPI >= 14");
assert(getSupplyKpiDefinition("supply.giro")?.availability === "available", "Giro available");
assert(getSupplyFeatureFlags().enterprise === true, "Enterprise default on");
assert(getSupplyFeatureFlags().externalAi === false, "External AI default off");

assert(normalizeProductTipo("peca") === "peca", "Tipo peça");
assert(normalizeProductTipo("xyz") === "produto", "Tipo inválido → produto");
assert(productTracksStock("servico") === false, "Serviço não rastreia estoque");
assert(productTracksStock("peca") === true, "Peça rastreia estoque");
assert(
  computeTargetMargin({ custo: 50, precoVenda: 100 }) === 0.5,
  "Margem alvo 50%",
);
assert(
  computeTargetMargin({ custo: null, precoVenda: 100 }) === null,
  "Margem sem custo = null",
);

assert(movementBalanceDelta("entrada", 5) === 5, "Entrada +");
assert(movementBalanceDelta("saida", 5) === -5, "Saída -");
assert(movementBalanceDelta("reserva", 5) === 0, "Reserva 0");
assert(toLegacyMovementType("perda") === "saida", "Perda → saida legado");
assert(toLegacyMovementType("devolucao") === "entrada", "Devolução → entrada");
assert(assertMovementKind("ajuste") === "ajuste", "assertMovementKind");

assert(canTransitionPurchase("rascunho", "solicitacao"), "Workflow rascunho→solicitacao");
assert(!canTransitionPurchase("integrado", "pedido"), "Integrado sem volta");

const empty = emptySupplyEnterpriseSnapshot("t-a", "a");
const emptyKpis = resolveSupplyCatalogKpis(empty);
assert(
  emptyKpis.every(
    (k) => k.availability !== "available" || (k.value != null && Number.isFinite(k.value)),
  ),
  "Empty sem inventar",
);
assert(
  emptyKpis.some((k) => k.formatted === "Dados indisponíveis"),
  "Dados indisponíveis",
);

let threw = false;
try {
  sanitizeSupplyFilter({ tenantId: "x" });
} catch {
  threw = true;
}
assert(threw, "Rejeita tenantId do client");

threw = false;
try {
  sanitizeSupplyFilter({ empresaId: "not-a-uuid" });
} catch {
  threw = true;
}
assert(threw, "Rejeita UUID inválido");

const snap = buildSupplyEnterpriseSnapshotFromSources({
  tenantId: "t-a",
  tenantSlug: "a",
  products: [
    {
      produtoId: "p1",
      nome: "Peça A",
      sku: "A1",
      categoria: "Freios",
      tipo: "peca",
      saldo: 2,
      minimo: 5,
      maximo: 20,
      seguranca: 3,
      custo: 10,
      precoVenda: 25,
      fornecedorPrincipal: "Fornecedor X",
      diasSemMovimentacao: 100,
      saidasPeriodo: 30,
      valorEstoque: 20,
    },
    {
      produtoId: "p2",
      nome: "Peça B",
      sku: "B1",
      categoria: "Freios",
      tipo: "peca",
      saldo: 50,
      minimo: 5,
      maximo: 20,
      seguranca: null,
      custo: 8,
      precoVenda: 20,
      fornecedorPrincipal: "Fornecedor Y",
      diasSemMovimentacao: 10,
      saidasPeriodo: 5,
      valorEstoque: 400,
    },
  ],
  fornecedoresAtivos: 2,
  purchases: { valorPedidosMes: 1000, pedidosMes: 3, pedidosAbertos: 1 },
  purchaseWorkflowReady: true,
  warehouseReady: true,
});

assert(snap.kpisRaw.rupturaCount === 1, "Ruptura detectada");
assert(snap.kpisRaw.excessoCount === 1, "Excesso detectado");
assert(snap.kpisRaw.paradoCount === 1, "Parado detectado");
assert(snap.kpisRaw.valorizacao === 420, "Valorização");
assert(resolveSupplyKpi(snap, "supply.fornecedores").value === 2, "Fornecedores KPI");

const bundle = buildExecutiveSupplyBundle({ snap });
assert(bundle.version === "25.0", "Bundle version 25");
assert(bundle.highlighted.length >= 8, "Highlighted KPIs");
assert(bundle.insights.length > 0, "Insights determinísticos");
assert(resolveSupplyProvider().kind === "deterministic", "Provider determinístico");
assert(
  !read("lib/supply/enterprise/supply-ai-provider.ts").includes("Math.random"),
  "IA sem random",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
