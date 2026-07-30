#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Undo NF-e (elegibilidade / plano / bloqueios)
 */
import {
  assertNfeUndoExecutable,
  buildNfeUndoPlan,
  classifyNfeUndoState,
} from "../lib/catalog-import/nfe-undo.ts";
import { blockDestructiveIfUnverified } from "../lib/import-engine/delete/dependency-probe.ts";

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

console.log("\nInvoice Undo — Sprint 25.4.3\n");

const clean = {
  alreadyUndone: false,
  productsSold: false,
  laterOutbound: false,
  apPaid: false,
  receiptReconciled: false,
  inventoryDepends: false,
  usedInClosing: false,
  tenantMismatch: false,
};

assert(
  classifyNfeUndoState(clean) === "totalmente_elegivel",
  "totalmente elegível",
);

assert(
  classifyNfeUndoState({ ...clean, apPaid: true }) === "exige_compensacao",
  "conta paga exige compensação",
);
assert(
  classifyNfeUndoState({ ...clean, receiptReconciled: true }) ===
    "exige_compensacao",
  "conciliada exige compensação",
);

assert(
  classifyNfeUndoState({ ...clean, laterOutbound: true, productsSold: true }) ===
    "parcialmente_elegivel",
  "saída/venda posterior = parcial",
);

assert(
  classifyNfeUndoState({ ...clean, alreadyUndone: true }) === "ja_desfeito",
  "já desfeito",
);

const planPaid = buildNfeUndoPlan({ ...clean, apPaid: true });
assert(
  planPaid.items.find((i) => i.kind === "estorno_financeiro")?.eligible ===
    false,
  "estorno não auto-elegível",
);
assert(
  planPaid.items.find((i) => i.kind === "cancelar_ap")?.eligible === false,
  "não cancela AP paga",
);

let blockedExec = false;
try {
  assertNfeUndoExecutable("exige_compensacao");
} catch {
  blockedExec = true;
}
assert(blockedExec, "executor bloqueia exige_compensacao");

let unverified = false;
try {
  blockDestructiveIfUnverified({ dependenciesUnverified: true });
} catch {
  unverified = true;
}
assert(unverified, "deps não verificáveis bloqueiam");

const planOk = buildNfeUndoPlan(clean);
assert(
  planOk.items.some((i) => i.kind === "marcar_nfe_desfeita" && i.eligible),
  "marca NF desfeita preservando chave",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
