#!/usr/bin/env node
/**
 * Sprint 25.4.1 — Upload pipeline tests (limites, FormData field, mensagens).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertImportFileWithinLimit,
  buildFileTooLargeMessage,
  detectImportFormatLimitKey,
  getImportMaxBytes,
  getImportMaxFileSizeMb,
  IMPORT_LIMIT_MB_CLIENT_DEFAULTS,
} from "../lib/import-engine/import-file-limits.ts";
import { validateImportFileSecurity } from "../lib/import-engine/security/file-security.ts";
import { NFE_XML_MAX_BYTES, validateXmlUpload } from "../lib/nfe/nfe-xml-parser.ts";
import {
  isCatalogImportEnabled,
  isNfeXmlImportEnabled,
  isPdfOcrImportEnabled,
  isPdfSearchableImportEnabled,
  isStockCsvImportEnabled,
  isStockExcelImportEnabled,
} from "../lib/catalog-import/catalog-upload-flags.ts";

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

console.log("\nUpload Pipeline — Sprint 25.4.1\n");

const mb = getImportMaxFileSizeMb();
assert(mb.xml === 10, "XML default 10 MB");
assert(mb.csv === 20, "CSV default 20 MB");
assert(mb.xlsx === 25, "Excel default 25 MB");
assert(mb.pdf === 20, "PDF default 20 MB");
assert(NFE_XML_MAX_BYTES === getImportMaxBytes("xml"), "NFE_XML_MAX_BYTES alinhado");
assert(NFE_XML_MAX_BYTES > 2 * 1024 * 1024, "XML > 2 MB antigo");

assert(detectImportFormatLimitKey("a.xlsx") === "xlsx", "detect xlsx");
assert(detectImportFormatLimitKey("a.CSV") === "csv", "detect csv");
assert(detectImportFormatLimitKey("nfe.xml") === "xml", "detect xml");

const msg = buildFileTooLargeMessage({ fileBytes: 12 * 1024 * 1024, format: "xml" });
assert(msg.includes("12"), "mensagem contém tamanho do arquivo");
assert(msg.includes("10 MB"), "mensagem contém limite do formato");
assert(
  msg.startsWith("Este arquivo possui"),
  "mensagem canónica de tamanho",
);

let threw = false;
try {
  assertImportFileWithinLimit({
    fileName: "huge.xml",
    byteLength: 11 * 1024 * 1024,
  });
} catch (e) {
  threw = true;
  assert(
    String(e.message).includes("limite permitido para este formato"),
    "assertImportFileWithinLimit mensagem clara",
  );
}
assert(threw, "arquivo XML acima do limite rejeitado");

try {
  validateXmlUpload({
    filename: "nfe.xml",
    mimeType: "application/xml",
    byteLength: 11 * 1024 * 1024,
  });
  assert(false, "validateXmlUpload deveria falhar");
} catch (e) {
  assert(
    String(e.message).includes("Este arquivo possui"),
    "validateXmlUpload usa mensagem canónica",
  );
}

const sec = validateImportFileSecurity({
  fileName: "big.csv",
  mimeType: "text/csv",
  bytes: Buffer.alloc(21 * 1024 * 1024, 0x61),
});
assert(
  sec.issues.some((i) => i.code === "size_limit_exceeded"),
  "file-security rejeita CSV > 20 MB",
);
assert(
  sec.issues.some((i) => i.message.includes("Este arquivo possui")),
  "file-security mensagem canónica",
);

const tiny = validateImportFileSecurity({
  fileName: "ok.csv",
  mimeType: "text/csv",
  bytes: Buffer.from("sku,nome\nA,Item\n"),
});
assert(tiny.ok || tiny.issues.every((i) => i.severity !== "error"), "CSV pequeno ok");

assert(isCatalogImportEnabled(), "catálogo ON por default");
assert(isStockExcelImportEnabled(), "excel estoque ON");
assert(isStockCsvImportEnabled(), "csv estoque ON");
assert(isNfeXmlImportEnabled(), "nfe xml ON");
assert(isPdfSearchableImportEnabled(), "pdf pesquisável ON");
assert(!isPdfOcrImportEnabled(), "OCR OFF por default");

assert(IMPORT_LIMIT_MB_CLIENT_DEFAULTS.xml === 10, "client defaults xml");

const envExample = readFileSync(join(root, ".env.example"), "utf8");
assert(envExample.includes("IMPORT_MAX_XML_MB"), ".env.example XML MB");
assert(envExample.includes("IMPORT_MAX_EXCEL_MB"), ".env.example Excel MB");
assert(envExample.includes("IMPORT_CATALOG_ENABLED"), ".env.example catalog flag");
assert(envExample.includes("IMPORT_OCR_ENABLED=0"), ".env.example OCR off");

const actions = readFileSync(
  join(root, "lib/catalog-import/catalog-import-actions.ts"),
  "utf8",
);
assert(actions.includes("formData.get(\"file\")"), "campo FormData file");
assert(actions.includes("assertImportFileWithinLimit"), "actions validam limite");
assert(actions.includes("previewCatalogFileImportAction"), "preview arquivo real");
assert(actions.includes("commitCatalogFileImportAction"), "commit arquivo real");

const panel = readFileSync(
  join(root, "components/catalog-import/catalog-import-panel.tsx"),
  "utf8",
);
assert(panel.includes("ImportFileDropzone"), "UI dropzone produtos");
assert(panel.includes("fd.set(\"file\""), "UI anexa file ao FormData");
assert(!panel.includes("Content-Type"), "UI não força Content-Type multipart");

const stockPanel = readFileSync(
  join(root, "components/catalog-import/stock-invoice-import-panel.tsx"),
  "utf8",
);
assert(stockPanel.includes("produtos_excel"), "central estoque excel");
assert(stockPanel.includes("produtos_csv"), "central estoque csv");
assert(stockPanel.includes("saldo_inicial"), "central saldo");
assert(stockPanel.includes("nfe_xml"), "central nfe");
assert(stockPanel.includes("pdf_auxiliar"), "central pdf");
assert(stockPanel.includes("commitStockFileImportAction"), "estoque confirma commit");

const dropzone = readFileSync(
  join(root, "components/catalog-import/import-file-dropzone.tsx"),
  "utf8",
);
assert(dropzone.includes("type=\"file\""), "input file real");
assert(dropzone.includes("onDrop"), "drag and drop");
assert(dropzone.includes("onChange"), "onChange no input");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
