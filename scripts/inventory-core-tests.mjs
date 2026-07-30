#!/usr/bin/env node
/**
 * Fase 25 — Inventory Core tests
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertInventoryTransition,
  canTransitionInventory,
  computeInventoryDivergences,
  inventoryNeedsAdjustment,
  INVENTORY_STATUS_TRANSITIONS,
  assertDepositoDraft,
  formatLocationCode,
  parseLocationCode,
  ENTERPRISE_MOVEMENT_KINDS,
  isAuditableMovement,
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

console.log("\nInventory Core — Fase 25\n");

assert(
  existsSync(join(root, "lib/supply/enterprise/inventory-model.ts")),
  "inventory-model",
);
assert(
  existsSync(join(root, "lib/supply/enterprise/warehouse-model.ts")),
  "warehouse-model",
);
assert(ENTERPRISE_MOVEMENT_KINDS.includes("inventario"), "Kind inventário");
assert(isAuditableMovement("perda"), "Perda auditável");

const divs = computeInventoryDivergences([
  { produtoId: "a", saldoSistema: 10, contagem: 8 },
  { produtoId: "b", saldoSistema: 5, contagem: 5 },
  { produtoId: "c", saldoSistema: 1, contagem: null },
]);
assert(divs.length === 1, "Uma divergência");
assert(divs[0].divergencia === -2, "Divergência -2");
assert(inventoryNeedsAdjustment(divs) === true, "Needs adjustment");

assert(canTransitionInventory("aberto", "em_conferencia"), "aberto→conferência");
assert(!canTransitionInventory("fechado", "aberto"), "fechado sem reabrir");

let threw = false;
try {
  assertInventoryTransition("fechado", "aberto");
} catch {
  threw = true;
}
assert(threw, "assertInventoryTransition lança");

assert(
  Object.keys(INVENTORY_STATUS_TRANSITIONS).length === 6,
  "6 status inventário",
);

assert(assertDepositoDraft({ nome: "", codigo: "D1", empresaId: null, filialId: null, ativo: true }).length > 0, "Depósito sem nome");
assert(
  assertDepositoDraft({
    nome: "Central",
    codigo: "DEP01",
    empresaId: null,
    filialId: null,
    ativo: true,
  }).length === 0,
  "Depósito válido",
);

const code = formatLocationCode({
  depositoId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  almoxarifadoId: "11111111-2222-3333-4444-555555555555",
  rua: "A",
  corredor: "01",
  prateleira: "3",
  posicao: "B",
});
assert(code.includes("A"), "Location code");
assert(parseLocationCode("A/01/3/B").rua === "A", "Parse location");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
