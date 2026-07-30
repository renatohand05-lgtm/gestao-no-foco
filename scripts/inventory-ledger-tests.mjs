#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Ledger lote / série / validade
 */
import {
  applyLotQuantityDelta,
  assertLotLedgerCloses,
  pickLotsFefo,
  lotMovementIdempotencyKey,
} from "../lib/supply/enterprise/lot-ledger.ts";
import {
  assertSerialNotDoubleSold,
  assertSerialTransition,
  assertSerialUnique,
  canTransitionSerial,
} from "../lib/supply/enterprise/serial-ledger.ts";
import {
  assertNotExpiredForSale,
  classifyValidityAlert,
  daysUntilExpiry,
} from "../lib/supply/enterprise/validity-control.ts";
import {
  inventoryCountMutatesStock,
  resolveDisplayedExpectedQty,
} from "../lib/supply/enterprise/inventory-model.ts";

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

console.log("\nInventory Ledger — Sprint 25.4.3\n");

const neg = applyLotQuantityDelta({
  quantidadeAtual: 2,
  tipo: "saida",
  quantidade: 5,
});
assert(Boolean(neg.error), "lote negativo bloqueado");

const ok = applyLotLedgerClose();
function applyLotLedgerClose() {
  const r = assertLotLedgerCloses({
    quantidadeInicial: 10,
    movimentos: [
      { tipo: "entrada", quantidade: 5 },
      { tipo: "saida", quantidade: 3 },
    ],
    quantidadeAtual: 12,
  });
  return r;
}
assert(ok.ok === true, "ledger fecha");

const fefo = pickLotsFefo(
  [
    {
      id: "a",
      produtoId: "p",
      numeroLote: "L1",
      quantidadeAtual: 5,
      validade: "2026-12-01",
      status: "disponivel",
      bloqueado: false,
    },
    {
      id: "b",
      produtoId: "p",
      numeroLote: "L2",
      quantidadeAtual: 5,
      validade: "2026-08-01",
      status: "disponivel",
      bloqueado: false,
    },
  ],
  4,
  "2026-07-27",
);
assert(fefo.allocations[0]?.loteId === "b", "FEFO prioriza validade próxima");

assert(
  lotMovementIdempotencyKey({
    tenantId: "t",
    loteId: "l",
    tipo: "entrada",
    referenciaId: "r1",
  }).includes("lote:t:l:entrada:r1"),
  "idempotência lote",
);

assert(canTransitionSerial("disponivel", "vendido"), "série disponível→vendido");
let soldTwice = false;
try {
  assertSerialNotDoubleSold("vendido");
} catch {
  soldTwice = true;
}
assert(soldTwice, "série não vende duas vezes");

let dup = false;
try {
  assertSerialUnique({
    existing: [{ tenantId: "t", produtoId: "p", numeroSerie: "ABC" }],
    tenantId: "t",
    produtoId: "p",
    numeroSerie: "abc",
  });
} catch {
  dup = true;
}
assert(dup, "série única por tenant/produto");

let badTrans = false;
try {
  assertSerialTransition("baixado", "disponivel");
} catch {
  badTrans = true;
}
assert(badTrans, "transição série inválida bloqueada");

assert(daysUntilExpiry("2026-08-03", "2026-07-27") === 7, "dias até vencer");
assert(
  classifyValidityAlert("2026-07-20", "2026-07-27", true) === "vencido",
  "alerta vencido",
);
assert(
  classifyValidityAlert("2026-08-01", "2026-07-27", false) === null,
  "sem controle de validade = sem alerta",
);

let expired = false;
try {
  assertNotExpiredForSale({
    controlaValidade: true,
    validadeIso: "2026-07-01",
    todayIso: "2026-07-27",
  });
} catch {
  expired = true;
}
assert(expired, "bloqueia venda vencida");

assert(inventoryCountMutatesStock("aberto") === false, "inventário: sem mutate na contagem");
assert(
  resolveDisplayedExpectedQty({
    contagemCega: true,
    contagem: null,
    saldoSistema: 10,
  }) === null,
  "contagem cega oculta esperado",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
