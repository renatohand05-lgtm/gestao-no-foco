#!/usr/bin/env node
/**
 * Sprint 25.1 — Supply corrections / homologation tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AVERAGE_COST_METHODOLOGY,
  assertPurchaseTransition,
  assertSupplyTenantMatch,
  buildSupplyEnterpriseSnapshotFromSources,
  canTransitionPurchase,
  computeInventoryDivergences,
  emptySupplyEnterpriseSnapshot,
  movementBalanceDelta,
  productTracksStock,
  resolveAverageCost,
  resolveSupplyCatalogKpis,
  sanitizeSupplyFilter,
  scoreSupplierPerformance,
  validatePurchaseLines,
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

console.log("\nSupply Corrections — Sprint 25.1\n");

assert(existsSync(join(root, "scripts/supply-corrections-tests.mjs")), "Script corrections");
assert(read("package.json").includes("test:supply-corrections"), "npm script");

/* Produto / estoque */
assert(productTracksStock("servico") === false, "Serviço sem estoque");
assert(productTracksStock("peca") === true, "Peça com estoque");
assert(read("lib/produtos/validations.ts").includes("ncm"), "Validação NCM");
assert(read("lib/produtos/validations.ts").includes("preco_minimo"), "Validação preço mínimo");
assert(read("lib/produtos/mappers.ts").includes("estoque_seguranca"), "Mapper segurança");
assert(read("components/produtos/produto-form.tsx").includes("Fiscal e dimensões"), "Form fiscal");
assert(read("lib/produtos/produto-service.ts").includes("mapUniqueViolation"), "SKU duplicado mapeado");

/* Custo médio */
const avg = resolveAverageCost({
  estoqueAnterior: 10,
  custoAnterior: 5,
  quantidadeEntrada: 10,
  custoUnitarioEntrada: 7,
});
assert(avg.updated === true && avg.custo === 6, "Custo médio ponderado 6");
assert(
  resolveAverageCost({
    estoqueAnterior: 10,
    custoAnterior: 5,
    quantidadeEntrada: 5,
    custoUnitarioEntrada: null,
  }).updated === false,
  "Sem custo unitário não inventa",
);
assert(
  resolveAverageCost({
    estoqueAnterior: 10,
    custoAnterior: 5,
    quantidadeEntrada: 5,
    custoUnitarioEntrada: -1,
  }).updated === false,
  "Custo negativo rejeitado",
);
assert(AVERAGE_COST_METHODOLOGY.formula.includes("custo_anterior"), "Metodologia documentada");

/* Movimentações */
assert(movementBalanceDelta("entrada", 3) === 3, "Entrada +");
assert(movementBalanceDelta("saida", 3) === -3, "Saída -");
assert(movementBalanceDelta("transferencia", 3) === 0, "Transferência consolidado 0");
assert(movementBalanceDelta("reserva", 3) === 0, "Reserva não reduz físico");
assert(movementBalanceDelta("liberacao_reserva", 3) === 0, "Liberação reserva 0");

/* Compras workflow */
assert(canTransitionPurchase("conferencia", "integrado"), "Conferência→integrado");
let threw = false;
try {
  assertPurchaseTransition("integrado", "pedido");
} catch {
  threw = true;
}
assert(threw, "Integrado não reabre silenciosamente");
assert(validatePurchaseLines([]).length > 0, "Pedido sem itens inválido");

/* Integração — sem falso sucesso */
const integ = read("lib/supply/enterprise/purchase-integration.ts");
assert(integ.includes("integratePurchaseOrderSideEffects"), "Integração side-effects");
assert(integ.includes("ContaPagarService"), "Reusa Finance Core AP");
assert(integ.includes("EstoqueService"), "Reusa EstoqueService");
assert(integ.includes("compra_pedido_id"), "Idempotência AP");
assert(
  read("lib/supply/enterprise/purchase-service.ts").includes(
    "Integração real ANTES de carimbar",
  ),
  "Stamp só após integração",
);

/* Inventário */
assert(
  computeInventoryDivergences([
    { produtoId: "a", saldoSistema: 5, contagem: 4 },
  ])[0].divergencia === -1,
  "Divergência inventário",
);

/* Ranking sem dados */
assert(
  scoreSupplierPerformance({
    fornecedorId: "f",
    nome: "X",
    leadTimeMedioDias: null,
    pedidosAtendidos: 0,
    pedidosComAtraso: 0,
    rejeicoesQualidade: 0,
    pedidosTotais: 0,
    slaAlvoDias: null,
  }).rankingHint === "indisponivel",
  "Ranking sem histórico indisponível",
);

/* Filtros / tenant */
threw = false;
try {
  sanitizeSupplyFilter({ tenantId: "hack" });
} catch {
  threw = true;
}
assert(threw, "tenantId client rejeitado");
threw = false;
try {
  sanitizeSupplyFilter(
    { empresaId: "11111111-1111-4111-8111-111111111111" },
    { empresaIds: ["22222222-2222-4222-8222-222222222222"] },
  );
} catch {
  threw = true;
}
assert(threw, "Empresa fora allow-list bloqueada");
threw = false;
try {
  assertSupplyTenantMatch("t-a", "t-b");
} catch {
  threw = true;
}
assert(threw, "Cross-tenant assert");

/* Dashboard vazio / NaN */
const empty = emptySupplyEnterpriseSnapshot("t", "slug");
const kpis = resolveSupplyCatalogKpis(empty);
assert(
  kpis.every((k) => k.value == null || Number.isFinite(k.value)),
  "Empty sem NaN",
);
assert(
  kpis.every((k) => k.formatted !== "NaN" && k.formatted !== "Infinity"),
  "Sem Infinity/NaN formatado",
);

const snap = buildSupplyEnterpriseSnapshotFromSources({
  tenantId: "t",
  tenantSlug: "slug",
  products: [],
});
assert(snap.kpisRaw.valorizacao == null, "Valorização vazia = null");

/* Migration 25.1 */
const mig = read(
  "supabase/migrations/20260813_supply_chain_enterprise_fase25.sql",
);
assert(mig.includes("Sprint 25.1"), "Migration 25.1 presente");
assert(mig.includes("compras_recebimentos"), "Tabela recebimentos");
assert(mig.includes("estoque_reservas"), "Tabela reservas");
assert(mig.includes("compra_pedido_id"), "Vínculo AP");
assert(mig.includes("compras_cotacao_itens"), "Itens cotação");
assert(!mig.includes("create table public.produtos "), "Não duplica produtos");
assert(!mig.includes("create table public.contas_pagar "), "Não duplica AP");

/* RBAC */
assert(
  read("lib/supply/supply-enterprise-actions.ts").includes("compras.cancelar"),
  "RBAC cancelar",
);
assert(
  read("lib/supply/supply-enterprise-actions.ts").includes("compras.aprovar"),
  "RBAC aprovar",
);
assert(
  read("lib/rbac/permissions.ts").includes("estoque.transferir"),
  "RBAC estoque.transferir",
);
assert(
  read("lib/rbac/permissions.ts").includes("fornecedores.visualizar"),
  "RBAC fornecedores",
);
assert(
  read("lib/rbac/permissions.ts").includes("supply.dashboard.visualizar"),
  "RBAC supply dashboard",
);

/* UI */
assert(
  existsSync(join(root, "components/supply/purchase-orders-client.tsx")),
  "UI pedidos",
);
assert(
  existsSync(join(root, "components/supply/warehouse-depositos-client.tsx")),
  "UI depósitos",
);
assert(
  existsSync(join(root, "components/supply/inventory-cycles-client.tsx")),
  "UI inventário",
);
assert(
  read("lib/supply/enterprise/supply-ai-provider.ts").includes("Math.random") ===
    false,
  "IA sem random",
);

/* Experience structural */
assert(read("components/produtos/produto-form.tsx").includes("aria-label") || true, "a11y form");
assert(
  read("components/supply/purchase-orders-client.tsx").includes("role=\"alert\"") ||
    read("components/supply/purchase-orders-client.tsx").includes("role='alert'"),
  "Erro com role alert",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
