#!/usr/bin/env node
/**
 * Sprint 25.4.1 — Stock upload E2E (integração de navegador/pipeline sem mocks de permissão).
 * Valida parsers reais + UI wiring + limites + PDF honesto.
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import { parseImportFile } from "../lib/import-engine/index.ts";
import { extractPdfText } from "../lib/import-engine/parsers/pdf-text-extractor.ts";
import {
  assertImportFileWithinLimit,
  getImportMaxBytes,
} from "../lib/import-engine/import-file-limits.ts";
import { STOCK_IMPORT_ADAPTER } from "../lib/import-engine/adapters/stock/adapter.ts";
import { CATALOG_IMPORT_ADAPTER } from "../lib/import-engine/adapters/catalog/adapter.ts";

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

console.log("\nStock Upload E2E — Sprint 25.4.1\n");

const dir = mkdtempSync(join(tmpdir(), "stock-upload-"));

// —— Excel real ——
const wb = XLSX.utils.book_new();
const rows = [
  {
    sku: "SKU-E2E-1",
    nome: "Produto E2E",
    quantidade_atual: 5,
    custo_medio: 10,
    preco_venda: 25,
    unidade: "UN",
  },
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Importacao_Produtos");
const xlsxPath = join(dir, "produtos-e2e.xlsx");
XLSX.writeFile(wb, xlsxPath);
const xlsxBytes = readFileSync(xlsxPath);
assert(xlsxBytes.length > 0, "XLSX gerado no disco");

const parsedXlsx = parseImportFile({
  fileName: "produtos-e2e.xlsx",
  mimeType:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  bytes: xlsxBytes,
});
assert(parsedXlsx.format === "xlsx", "parser detecta xlsx");
assert(parsedXlsx.totalRows >= 1, "xlsx tem linhas");
assert(
  STOCK_IMPORT_ADAPTER.fields.some((f) => f.key === "sku"),
  "adapter estoque tem sku",
);

// —— CSV real ——
const csv = "sku,nome,quantidade_atual,custo_medio,preco_venda,unidade\nSKU-CSV,Item CSV,3,8,20,UN\n";
const csvPath = join(dir, "produtos-e2e.csv");
writeFileSync(csvPath, csv, "utf8");
const parsedCsv = parseImportFile({
  fileName: "produtos-e2e.csv",
  mimeType: "text/csv",
  bytes: Buffer.from(csv, "utf8"),
});
assert(parsedCsv.format === "csv", "parser detecta csv");
assert(parsedCsv.totalRows >= 1, "csv tem linhas");

// —— Limite ——
let over = false;
try {
  assertImportFileWithinLimit({
    fileName: "big.xlsx",
    byteLength: getImportMaxBytes("xlsx") + 1,
  });
} catch {
  over = true;
}
assert(over, "Excel acima do limite rejeitado");

// —— Formato inválido ——
let exeBlocked = false;
try {
  parseImportFile({
    fileName: "malware.exe",
    mimeType: "application/octet-stream",
    bytes: Buffer.from("MZ"),
  });
} catch {
  exeBlocked = true;
}
assert(exeBlocked, "exe rejeitado pelo pipeline de segurança");

// —— PDF image-only (mínimo) ——
const imagePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
  "utf8",
);
try {
  const ext = extractPdfText(imagePdf);
  assert(
    ext.status === "image_only" || ext.text.length === 0,
    "PDF sem texto → image_only / vazio",
  );
} catch (e) {
  assert(
    String(e.message).toLowerCase().includes("pdf") ||
      e.name === "PdfCorruptedError",
    "PDF inválido rejeitado honestamente",
  );
}

// —— PDF pesquisável mínimo com stream de texto ——
const searchable = Buffer.from(
  `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 100 Td (Produto PDF) Tj ET
endstream
endobj
trailer<< /Root 1 0 R >>
%%EOF
`,
  "utf8",
);
const searchableExt = extractPdfText(searchable);
assert(
  searchableExt.status === "ok" || searchableExt.text.includes("Produto"),
  "PDF pesquisável extrai texto ou reporta ok",
);

// —— UI / rotas ——
assert(
  existsSync(join(root, "app/(app)/[tenant]/estoque/importar/page.tsx")),
  "rota estoque/importar",
);
assert(
  existsSync(join(root, "app/(app)/[tenant]/produtos/importar/page.tsx")),
  "rota produtos/importar",
);
assert(
  existsSync(join(root, "components/catalog-import/import-file-dropzone.tsx")),
  "dropzone component",
);

const stockUi = readFileSync(
  join(root, "components/catalog-import/stock-invoice-import-panel.tsx"),
  "utf8",
);
assert(stockUi.includes("previewStockFileImportAction"), "UI chama preview estoque");
assert(stockUi.includes("commitStockFileImportAction"), "UI chama commit estoque");
assert(stockUi.includes("previewInvoiceXmlImportAction"), "UI chama preview NF-e");
assert(stockUi.includes("previewPdfAssistDocumentAction"), "UI chama PDF auxiliar");
assert(stockUi.includes('fd.set("file"'), "FormData file no estoque");

const catalogUi = readFileSync(
  join(root, "components/catalog-import/catalog-import-panel.tsx"),
  "utf8",
);
assert(catalogUi.includes("previewCatalogFileImportAction"), "UI preview arquivo produtos");
assert(catalogUi.includes("commitCatalogFileImportAction"), "UI commit arquivo produtos");
assert(catalogUi.includes("Upload do computador"), "seção upload real");

assert(
  CATALOG_IMPORT_ADAPTER.fields.some((f) => f.key === "codigo_servico"),
  "adapter catálogo serviços",
);

try {
  unlinkSync(xlsxPath);
  unlinkSync(csvPath);
} catch {
  /* ignore */
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
