#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Limitações internas elimináveis (gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyStockFieldTransform,
  parseBrazilianNumber,
  parseFlexibleDateBr,
} from "../lib/import-engine/mapping/stock-transforms.ts";
import {
  assertWithinVolumeLimits,
  createCancellableBatchRunner,
  getImportVolumeLimits,
} from "../lib/import-engine/import-volume-limits.ts";
import {
  assertOcrAllowed,
  mockOcrExtractText,
  resolveOcrProvider,
} from "../lib/import-engine/ocr/ocr-provider-contract.ts";
import { blockDestructiveIfUnverified } from "../lib/import-engine/delete/dependency-probe.ts";
import { inventoryCountMutatesStock } from "../lib/supply/enterprise/inventory-model.ts";

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

console.log("\nSupply Limitations — Sprint 25.4.3\n");

assert(parseBrazilianNumber("1.234,56") === 1234.56, "número BR");
assert(parseFlexibleDateBr("31/12/2026") === "2026-12-31", "data BR");
assert(
  applyStockFieldTransform("preco_venda", "R$ 10,50") === 10.5,
  "transform preço",
);

assert(inventoryCountMutatesStock("aberto") === false, "contagem não altera estoque");

const limits = getImportVolumeLimits({ IMPORT_MAX_ROWS: "1000" });
assert(limits.maxRows === 1000, "limites configuráveis");
let blocked = false;
try {
  assertWithinVolumeLimits({ rowCount: 2000, columnCount: 10, limits });
} catch {
  blocked = true;
}
assert(blocked, "acima do limite bloqueia");

const runner = createCancellableBatchRunner();
runner.cancel();
const r = await runner.runBatches([1, 2, 3, 4], 2, async () => {});
assert(r.cancelled === true, "cancelamento seguro de lote");

const ocrOff = resolveOcrProvider({ IMPORT_OCR_ENABLED: "0" });
assert(ocrOff.configured === false, "OCR desligado sem provider");
let ocrBlocked = false;
try {
  assertOcrAllowed({ consent: true, provider: ocrOff });
} catch {
  ocrBlocked = true;
}
assert(ocrBlocked, "OCR sem provider bloqueia");

process.env.NODE_ENV = "test";
const mock = mockOcrExtractText(new Uint8Array([1]));
assert(mock.provider === "mock_test", "mock OCR só em teste");

let destBlocked = false;
try {
  blockDestructiveIfUnverified({
    dependenciesUnverified: true,
    unverifiedTables: ["estoque_reservas"],
  });
} catch (e) {
  destBlocked = /Não foi possível verificar/.test(String(e.message));
}
assert(destBlocked, "dependência não verificável bloqueia destruição");

const mig = join(
  root,
  "supabase/migrations/20260815_inventory_ledger_lote_serie_fase2543.sql",
);
assert(existsSync(mig), "migration 20260815 presente");
const sql = readFileSync(mig, "utf8");
assert(sql.includes("estoque_lotes"), "SQL lotes");
assert(sql.includes("estoque_series"), "SQL séries");

const formHint = readFileSync(
  join(root, "components/catalog-import/stock-invoice-import-panel.tsx"),
  "utf8",
);
assert(
  formHint.includes("OCR requer provedor configurado"),
  "UI OCR sem botão falso",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
