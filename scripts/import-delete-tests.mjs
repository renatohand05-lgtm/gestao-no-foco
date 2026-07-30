#!/usr/bin/env node
/**
 * Sprint 25.4.2 — Import delete / undo eligibility tests
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertReasonRequired,
  assertTypedConfirmation,
  evaluateNfeUndo,
  evaluateProductUndo,
  evaluateServiceUndo,
  evaluateStockMovementUndo,
  productBlockReasons,
  serviceBlockReasons,
  stockBlockReasons,
  stockReversalIdempotencyKey,
  summarizeUndoDecisions,
} from "../lib/import-engine/delete/eligibility.ts";
import { buildUndoImpactPreview } from "../lib/import-engine/delete/preview.ts";
import { getPermissionsForRole } from "../lib/rbac/role-permissions.ts";

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

console.log("\nImport Delete — Sprint 25.4.2\n");

// —— Serviço sem uso ——
assert(
  evaluateServiceUndo({
    usedInSale: false,
    usedInOs: false,
    usedInBudget: false,
    financeHistory: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }) === "soft_delete",
  "desfazer serviço sem uso",
);

// —— Serviço usado em OS ——
assert(
  evaluateServiceUndo({
    usedInSale: false,
    usedInOs: true,
    usedInBudget: false,
    financeHistory: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }) === "inactivate",
  "bloquear exclusão serviço em OS (inativar)",
);
assert(
  serviceBlockReasons({
    usedInSale: false,
    usedInOs: true,
    usedInBudget: false,
    financeHistory: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }).includes("usado_em_os"),
  "motivo OS",
);

// —— Produto sem uso ——
assert(
  evaluateProductUndo({
    usedInSale: false,
    usedInOs: false,
    usedInBudget: false,
    laterMovements: false,
    currentQty: 0,
    reserved: false,
    inInventory: false,
    fiscalOrFinanceLink: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }) === "soft_delete",
  "desfazer produto sem uso",
);

// —— Produto com movimento / saldo ——
assert(
  evaluateProductUndo({
    usedInSale: false,
    usedInOs: false,
    usedInBudget: false,
    laterMovements: true,
    currentQty: 0,
    reserved: false,
    inInventory: false,
    fiscalOrFinanceLink: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }) === "inactivate",
  "bloquear produto com movimento posterior",
);
assert(
  productBlockReasons({
    usedInSale: false,
    usedInOs: false,
    usedInBudget: false,
    laterMovements: false,
    currentQty: 5,
    reserved: false,
    inInventory: false,
    fiscalOrFinanceLink: false,
    alreadyReverted: false,
    tenantMismatch: false,
  }).includes("saldo_nao_zero"),
  "saldo não zero",
);

// —— Saldo inicial / movimento ——
assert(
  evaluateStockMovementUndo({
    alreadyReverted: false,
    laterMovementsOnProduct: false,
    inventoryDepends: false,
    tenantMismatch: false,
    originalQty: 10,
  }) === "reverse_movement",
  "desfazer saldo inicial elegível",
);
assert(
  evaluateStockMovementUndo({
    alreadyReverted: true,
    laterMovementsOnProduct: false,
    inventoryDepends: false,
    tenantMismatch: false,
    originalQty: 10,
  }) === "skip",
  "segunda reversão bloqueada",
);
assert(
  stockBlockReasons({
    alreadyReverted: true,
    laterMovementsOnProduct: false,
    inventoryDepends: false,
    tenantMismatch: false,
    originalQty: 10,
  }).includes("segunda_reversao"),
  "motivo segunda reversão",
);

const key1 = stockReversalIdempotencyKey({
  tenantId: "t1",
  importRunId: "r1",
  originalMovementId: "m1",
});
const key2 = stockReversalIdempotencyKey({
  tenantId: "t1",
  importRunId: "r1",
  originalMovementId: "m1",
});
assert(key1 === key2, "reversão idempotente (mesma chave)");

// —— NF-e ——
assert(
  evaluateNfeUndo({
    alreadyUndone: false,
    productsSold: false,
    laterOutbound: false,
    apPaid: false,
    receiptReconciled: false,
    inventoryDepends: false,
    usedInClosing: false,
    tenantMismatch: false,
  }).eligible,
  "NF-e elegível",
);
assert(
  !evaluateNfeUndo({
    alreadyUndone: false,
    productsSold: false,
    laterOutbound: true,
    apPaid: false,
    receiptReconciled: false,
    inventoryDepends: false,
    usedInClosing: false,
    tenantMismatch: false,
  }).eligible,
  "NF-e com saída posterior bloqueada",
);
assert(
  !evaluateNfeUndo({
    alreadyUndone: false,
    productsSold: false,
    laterOutbound: false,
    apPaid: true,
    receiptReconciled: false,
    inventoryDepends: false,
    usedInClosing: false,
    tenantMismatch: false,
  }).eligible,
  "conta a pagar paga bloqueada",
);

// —— Motivo / confirmação ——
try {
  assertReasonRequired("ab");
  assert(false, "motivo curto deveria falhar");
} catch {
  assert(true, "motivo obrigatório");
}
try {
  assertTypedConfirmation({ required: true, typed: "nao", expected: "EXCLUIR" });
  assert(false, "typed deveria falhar");
} catch {
  assert(true, "confirmação EXCLUIR");
}

// —— Summary / preview ——
const summary = summarizeUndoDecisions([
  {
    targetType: "produto",
    targetId: "p1",
    eligible: true,
    action: "soft_delete",
    blockReasons: [],
  },
  {
    targetType: "produto",
    targetId: "p2",
    eligible: false,
    action: "inactivate",
    blockReasons: ["usado_em_os"],
  },
]);
assert(summary.status === "parcialmente_elegivel", "parcialmente elegível");
const preview = buildUndoImpactPreview({ summary });
assert(preview.warning.includes("estoque"), "aviso impacto");
assert(preview.eligibleItems.length === 1, "itens elegíveis");
assert(preview.blockedItems.length === 1, "itens bloqueados");

assert(
  summarizeUndoDecisions([], { alreadyRolledBack: true }).status ===
    "ja_desfeito",
  "já desfeito",
);

// —— Cross-tenant ——
assert(
  evaluateProductUndo({
    usedInSale: false,
    usedInOs: false,
    usedInBudget: false,
    laterMovements: false,
    currentQty: 0,
    reserved: false,
    inInventory: false,
    fiscalOrFinanceLink: false,
    alreadyReverted: false,
    tenantMismatch: true,
  }) === "block",
  "cross-tenant bloqueado",
);

// —— RBAC ——
assert(
  getPermissionsForRole("proprietario").includes("importacoes.rollback"),
  "OWNER rollback",
);
assert(
  getPermissionsForRole("proprietario").includes("importacoes.arquivar"),
  "OWNER arquivar",
);
assert(
  getPermissionsForRole("estoque").includes("importacoes.rollback"),
  "ESTOQUE rollback",
);
assert(
  !getPermissionsForRole("visualizacao").includes("importacoes.rollback"),
  "READ-ONLY sem rollback",
);
assert(
  getPermissionsForRole("visualizacao").includes("importacoes.visualizar"),
  "READ-ONLY visualizar",
);

assert(
  existsSync(join(root, "lib/import-engine/delete/import-history-actions.ts")),
  "actions server",
);
assert(
  readFileSync(
    join(root, "lib/import-engine/delete/import-history-actions.ts"),
    "utf8",
  ).includes("importacoes.rollback"),
  "RBAC server-side",
);
assert(
  !readFileSync(
    join(root, "lib/import-engine/delete/catalog-stock-undo.ts"),
    "utf8",
  ).includes("estoque_atual:"),
  "não atualiza quantidade diretamente no undo de movimento",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
