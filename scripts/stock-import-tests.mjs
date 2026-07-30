#!/usr/bin/env node
/**
 * Sprint 25.3 — Stock / product import tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

import {
  buildCatalogPreviewSummary,
  buildProductStockTemplate,
  findProductDuplicates,
  sumFinite,
} from "../lib/catalog-import/index.ts";
import {
  getImportAdapter,
  parseImportFile,
} from "../lib/import-engine/index.ts";

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

console.log("\nStock Import — Sprint 25.3\n");

const tpl = buildProductStockTemplate("xlsx");
assert(tpl.bytes.byteLength > 500, "Modelo XLSX produtos");
assert(tpl.fileName.includes("produtos"), "Nome modelo");

const parsedTpl = parseImportFile({
  fileName: tpl.fileName,
  mimeType: tpl.mimeType,
  bytes: tpl.bytes,
});
assert(parsedTpl.format === "xlsx", "Parse modelo XLSX");
assert(parsedTpl.totalRows >= 1, "Linha exemplo presente");

const csvTpl = buildProductStockTemplate("csv");
assert(csvTpl.mimeType.includes("csv"), "Modelo CSV");

const dups = findProductDuplicates({
  rows: [
    { rowNumber: 1, sku: "SKU-1", barcode: "789", nome: "P1" },
    { rowNumber: 2, sku: "SKU-2", barcode: "789", nome: "P2" },
  ],
  existingBySku: new Map([["SKU-1", "id-1"]]),
  existingByBarcode: new Map([["789", "id-1"]]),
});
assert(dups.some((d) => d.matchType === "sku"), "SKU duplicado");
assert(dups.some((d) => d.matchType === "barcode"), "Barcode duplicado");

const summary = buildCatalogPreviewSummary({
  fileName: "x.xlsx",
  detectedType: "xlsx",
  totalRows: 10,
  newProducts: 7,
  duplicates: 2,
  stockQtyTotal: sumFinite([1, 2, 3]),
  stockValueTotal: sumFinite([10, null, 5]),
  notes: ["sem fictício"],
});
assert(summary.stockQtyTotal === 6, "Soma qty");
assert(summary.stockValueTotal === 15, "Soma valor");
assert(summary.financialTotal == null, "Sem inventar financeiro");

assert(getImportAdapter("stock").requiredPermission === "estoque.importar", "RBAC stock");
assert(
  read("lib/import-engine/parsers/excel-parser.ts").includes("importacao"),
  "Parser prioriza aba Importacao",
);
assert(
  read("lib/catalog-import/commit-products.ts").includes(
    "importacao_saldo_inicial",
  ),
  "Saldo inicial auditável",
);
assert(
  read("lib/catalog-import/commit-products.ts").includes(
    "Serviço não recebe saldo",
  ),
  "Serviço sem estoque",
);
assert(
  read("lib/catalog-import/commit-products.ts").includes(
    "Item sem controle de estoque não recebe saldo",
  ),
  "Sem controle sem saldo",
);

assert(
  existsSync(join(root, "app/(app)/[tenant]/estoque/importar/page.tsx")),
  "UI estoque/importar",
);
assert(read("lib/rbac/permissions.ts").includes("estoque.importar"), "Permissão estoque.importar");
assert(
  read("lib/rbac/permissions.ts").includes("importacoes.rollback"),
  "Permissão rollback",
);

/* XLSX mínimo válido */
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ["sku", "nome", "quantidade_atual", "custo_medio", "tipo"],
    ["T-1", "Peça teste", 5, 10, "produto"],
    ["T-2", "Serviço teste", 0, 0, "servico"],
  ]),
  "Produtos",
);
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const parsed = parseImportFile({
  fileName: "stock.xlsx",
  bytes: new Uint8Array(buf),
});
assert(parsed.totalRows === 2, "Parse stock rows");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
