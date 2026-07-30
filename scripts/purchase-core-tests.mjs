#!/usr/bin/env node
/**
 * Fase 25 — Purchase Core tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PURCHASE_WORKFLOW_STATUSES,
  assertPurchaseStatus,
  assertPurchaseTransition,
  canTransitionPurchase,
  purchaseTriggersFinanceIntegration,
  purchaseTriggersStockIntegration,
  rankSuppliers,
  scoreSupplierPerformance,
  sumPurchaseLines,
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

console.log("\nPurchase Core — Fase 25\n");

assert(
  existsSync(join(root, "lib/supply/enterprise/purchase-workflow.ts")),
  "purchase-workflow",
);
assert(
  existsSync(join(root, "lib/supply/enterprise/purchase-service.ts")),
  "purchase-service",
);
assert(PURCHASE_WORKFLOW_STATUSES.length === 10, "10 status workflow");
assert(assertPurchaseStatus("pedido") === "pedido", "Status pedido");
assert(canTransitionPurchase("aprovacao", "pedido"), "Aprovação→pedido");
assert(canTransitionPurchase("cotacao", "comparacao"), "Cotação→comparação");

let threw = false;
try {
  assertPurchaseTransition("cancelado", "pedido");
} catch {
  threw = true;
}
assert(threw, "Cancelado não reabre");

assert(purchaseTriggersStockIntegration("integrado"), "Integrado → estoque");
assert(purchaseTriggersFinanceIntegration("integrado"), "Integrado → finance");
assert(!purchaseTriggersStockIntegration("pedido"), "Pedido ainda não integra");

assert(
  validatePurchaseLines([]).length > 0,
  "Linhas vazias inválidas",
);
assert(
  validatePurchaseLines([
    { produtoId: "p1", quantidade: 2, precoUnitario: 10, fornecedorId: null },
  ]).length === 0,
  "Linha válida",
);
assert(
  sumPurchaseLines([
    { produtoId: "p1", quantidade: 2, precoUnitario: 10, fornecedorId: null },
    { produtoId: "p2", quantidade: 1, precoUnitario: 5, fornecedorId: null },
  ]) === 25,
  "Soma linhas",
);

const score = scoreSupplierPerformance({
  fornecedorId: "f1",
  nome: "ACME",
  leadTimeMedioDias: 5,
  pedidosAtendidos: 10,
  pedidosComAtraso: 1,
  rejeicoesQualidade: 0,
  pedidosTotais: 10,
  slaAlvoDias: 7,
});
assert(score.score != null && score.score > 0.7, "Score fornecedor alto");
assert(score.rankingHint === "A" || score.rankingHint === "B", "Ranking A/B");

const emptyHist = scoreSupplierPerformance({
  fornecedorId: "f2",
  nome: "Novo",
  leadTimeMedioDias: null,
  pedidosAtendidos: 0,
  pedidosComAtraso: 0,
  rejeicoesQualidade: 0,
  pedidosTotais: 0,
  slaAlvoDias: null,
});
assert(emptyHist.rankingHint === "indisponivel", "Sem histórico → indisponível");
assert(emptyHist.score === null, "Sem inventar score");

const ranked = rankSuppliers([
  {
    fornecedorId: "f1",
    nome: "Bom",
    leadTimeMedioDias: 3,
    pedidosAtendidos: 10,
    pedidosComAtraso: 0,
    rejeicoesQualidade: 0,
    pedidosTotais: 10,
    slaAlvoDias: 5,
  },
  {
    fornecedorId: "f2",
    nome: "Ruim",
    leadTimeMedioDias: 20,
    pedidosAtendidos: 10,
    pedidosComAtraso: 8,
    rejeicoesQualidade: 5,
    pedidosTotais: 10,
    slaAlvoDias: 5,
  },
]);
assert(ranked[0].fornecedorId === "f1", "Ranking ordenado");

assert(
  read("lib/supply/enterprise/integration-bridges.ts").includes("lib/finance"),
  "Ponte Finance",
);
assert(
  read("lib/supply/enterprise/integration-bridges.ts").includes("lib/crm"),
  "Ponte CRM",
);
assert(
  read("lib/supply/enterprise/integration-bridges.ts").includes("lib/analytics"),
  "Ponte Analytics",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
