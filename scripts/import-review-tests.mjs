#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Revisão linha a linha
 */
import {
  applyChangeToSimilarLines,
  assertNoSilentErrorCommit,
  confirmedNumbersFromReview,
  filterReviewLines,
  fromEngineReviewRows,
  ignoreReviewLine,
  paginateReviewLines,
  selectAllReviewLines,
  toggleReviewLine,
} from "../lib/import-engine/review/row-review.ts";
import { STOCK_PRODUCT_IMPORT_FIELDS } from "../lib/import-engine/adapters/stock/fields.ts";

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

console.log("\nImport Review — Sprint 25.4.3\n");

const fields = STOCK_PRODUCT_IMPORT_FIELDS.map((f) => f.key);
assert(fields.includes("lote"), "campo lote");
assert(fields.includes("serie"), "campo série");
assert(fields.includes("validade"), "campo validade");
assert(fields.includes("fabricacao"), "campo fabricação");
assert(fields.includes("estoque_seguranca"), "estoque segurança");
assert(fields.includes("ncm"), "NCM");
assert(fields.includes("deposito"), "depósito");

let lines = fromEngineReviewRows([
  {
    rowNumber: 1,
    values: { nome: "A", sku: "1" },
    classification: { status: "new", confidence: 0.9 },
    issues: [],
  },
  {
    rowNumber: 2,
    values: { nome: "B", sku: "1" },
    classification: { status: "duplicate", confidence: 0.7 },
    issues: [],
  },
  {
    rowNumber: 3,
    values: { nome: "", sku: "3" },
    classification: { status: "error", confidence: 0.2 },
    issues: [{ message: "nome obrigatório" }],
  },
]);

assert(filterReviewLines(lines, "erros").length === 1, "filtro erros");
assert(filterReviewLines(lines, "duplicidades").length === 1, "filtro dup");
assert(filterReviewLines(lines, "novos").length >= 1, "filtro novos");

lines = selectAllReviewLines(lines, true);
assert(lines.every((l) => l.selected), "selecionar todas");

lines = toggleReviewLine(lines, 3, true);
let silent = false;
try {
  assertNoSilentErrorCommit(lines);
} catch {
  silent = true;
}
assert(silent, "bloqueia commit com erro grave selecionado");

lines = ignoreReviewLine(lines, 3);
assert(
  lines.find((l) => l.rowNumber === 3)?.action === "ignore",
  "ignorar linha",
);

const page = paginateReviewLines(lines, 0, 2);
assert(page.rows.length === 2 && page.pageCount === 2, "paginação");

lines = applyChangeToSimilarLines(lines, 1, "sku", "X");
assert(
  lines.filter((l) => l.normalized.sku === "X").length >= 2,
  "aplicar em semelhantes",
);

const confirmed = confirmedNumbersFromReview(
  lines.map((l) =>
    l.rowNumber === 3 ? l : { ...l, selected: l.rowNumber !== 3 },
  ),
);
assert(!confirmed.includes(3), "erro ignorado fora da confirmação");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
