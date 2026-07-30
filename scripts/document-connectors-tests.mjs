#!/usr/bin/env node
/**
 * Sprint 22.8 — Document parsers + connectors tests.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import {
  assertSupportedFormat,
  assertTenantIsolation,
  assertXmlSafeContent,
  allConnectorsPreparing,
  detectCsvInjection,
  extractPdfText,
  getEnterpriseFeatureFlags,
  isCnabSupported,
  isConnectorLive,
  isDuplicateIdempotencyKey,
  listConnectorDefinitions,
  parseClipboardPayload,
  parseFinanceXmlSafe,
  parseImportFile,
  parseOfxText,
  parsePdfBuffer,
  registerIdempotencyKey,
  resetWebhookIdempotencyCache,
  sanitizeCsvCell,
  signWebhookPayload,
  supportedExtensions,
  validateImportFileSecurity,
  validatePdfSignature,
  verifyWebhookSignature,
  XmlSecurityError,
  PdfCorruptedError,
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

function buildSearchablePdf(text = "Hello World") {
  const stream = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Size 6/Root 1 0 R>>
%%EOF`;
  return Buffer.from(body, "latin1");
}

function buildImageOnlyPdf() {
  const stream = "q 100 0 0 100 50 600 cm /Im1 Do Q";
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
trailer<</Size 5/Root 1 0 R>>
%%EOF`;
  return Buffer.from(body, "latin1");
}

console.log("\nSprint 22.8 — Document Parsers & Connectors\n");

const requiredFiles = [
  "lib/import-engine/parsers/pdf-text-extractor.ts",
  "lib/import-engine/parsers/pdf-parser.ts",
  "lib/import-engine/parsers/ofx-parser.ts",
  "lib/import-engine/parsers/xml-finance-parser.ts",
  "lib/import-engine/parsers/cnab-contract.ts",
  "lib/import-engine/parsers/clipboard-input.ts",
  "lib/import-engine/parsers/csv-security.ts",
  "lib/import-engine/connectors/types.ts",
  "lib/import-engine/connectors/registry.ts",
  "lib/import-engine/connectors/webhook-security.ts",
  "lib/import-engine/connectors/api-contract.ts",
  "lib/import-engine/enterprise-feature-flags.ts",
  "app/api/webhooks/import/route.ts",
  "app/api/v1/import/route.ts",
  "app/(app)/[tenant]/integracoes/conectores/page.tsx",
  "components/import-engine/connectors-hub-client.tsx",
];

for (const f of requiredFiles) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

/* ——— PDF ——— */
const searchablePdf = buildSearchablePdf("Conta Corrente 1500,00");
try {
  validatePdfSignature(searchablePdf);
  assert(true, "PDF: assinatura %PDF válida");
} catch {
  assert(false, "PDF: assinatura %PDF válida");
}

const extracted = extractPdfText(searchablePdf);
assert(extracted.status === "ok", "PDF searchable: status ok");
assert(extracted.text.includes("Conta Corrente"), "PDF searchable: texto extraído");

const imagePdf = buildImageOnlyPdf();
const imageExtract = extractPdfText(imagePdf);
assert(imageExtract.status === "image_only", "PDF image-only: status image_only");

let pdfParseOk = false;
try {
  const parsed = parsePdfBuffer(searchablePdf, "extrato.pdf");
  pdfParseOk = parsed.format === "pdf" && parsed.totalRows > 0;
} catch {
  pdfParseOk = false;
}
assert(pdfParseOk, "PDF searchable: parsePdfBuffer produz linhas");

let imageOnlyThrows = false;
try {
  parsePdfBuffer(imagePdf, "scan.pdf");
} catch (e) {
  imageOnlyThrows = String(e?.message ?? e).includes("image-only");
}
assert(imageOnlyThrows, "PDF image-only: parse rejeita sem OCR");

let corruptedThrows = false;
try {
  validatePdfSignature(Buffer.from("NOT-A-PDF"));
} catch (e) {
  corruptedThrows = e instanceof PdfCorruptedError;
}
assert(corruptedThrows, "PDF corrompido: assinatura inválida");

let truncatedThrows = false;
try {
  validatePdfSignature(Buffer.from("%PDF-1.4 truncated"));
} catch (e) {
  truncatedThrows = e instanceof PdfCorruptedError;
}
assert(truncatedThrows, "PDF corrompido: %%EOF ausente");

/* ——— OFX ——— */
const ofxSgml = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>341
<ACCTID>99999
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260115000000
<TRNAMT>-50.00
<FITID>FIT-001
<NAME>PIX OUT
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260116000000
<TRNAMT>100.00
<FITID>FIT-001
<NAME>DUP CREDIT
</OFX>`;

const ofxParsed = parseOfxText(ofxSgml, "extrato.ofx");
assert(ofxParsed.format === "ofx", "OFX: formato");
assert(ofxParsed.totalRows === 2, "OFX: duas transações");
assert(
  ofxParsed.warnings.some((w) => w.includes("FITID duplicado")),
  "OFX: FITID duplicado detectado",
);
assert(ofxParsed.rows[0].bank_id === "341", "OFX: bank_id mapeado");

/* ——— XML ——— */
const safeXml = `<?xml version="1.0"?><FinanceExport><account>123</account><balance>100.50</balance></FinanceExport>`;
const xmlParsed = parseFinanceXmlSafe(safeXml);
assert(xmlParsed.root != null, "XML: parse seguro OK");

let xxeBlocked = false;
try {
  assertXmlSafeContent(`<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root/>`);
} catch (e) {
  xxeBlocked = e instanceof XmlSecurityError;
}
assert(xxeBlocked, "XML: XXE bloqueado (DOCTYPE/ENTITY)");

const xmlImport = parseImportFile({
  fileName: "dados.xml",
  bytes: Buffer.from(safeXml, "utf8"),
});
assert(xmlImport.format === "xml", "XML: parseImportFile formato xml");

/* ——— CSV injection ——— */
assert(detectCsvInjection("=CMD()"), "CSV injection: detecta =");
assert(sanitizeCsvCell("=1+1") === "1+1", "CSV injection: sanitize remove =");
const injCsv = Buffer.from("Desc,Valor\n=CMD(),10\n", "utf8");
const injParsed = parseImportFile({ fileName: "inj.csv", bytes: injCsv });
assert(
  injParsed.warnings.some((w) => w.includes("injection")),
  "CSV injection: warning no parseImportFile",
);

/* ——— Excel multi-sheet ——— */
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["A", "B"], [1, 2]]), "Sheet1");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["X"]]), "Sheet2");
const multiBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const multiParsed = parseImportFile({ fileName: "multi.xlsx", bytes: multiBuf });
assert(
  multiParsed.warnings.some((w) => w.includes("Sheet1") && w.includes("Sheet2")),
  "Excel: multi-sheet listado no warning",
);

/* ——— Clipboard ——— */
const clip = parseClipboardPayload({
  kind: "table",
  content: "Nome\tValor\nTeste\t100\n",
});
assert(clip.totalRows === 1, "Clipboard table: 1 linha");

const clipJson = parseClipboardPayload({
  kind: "json",
  content: '[{"nome":"=evil","valor":1}]',
});
assert(clipJson.rows[0].nome === "evil", "Clipboard JSON: injection neutralizada");

/* ——— CNAB contract ——— */
assert(isCnabSupported() === false, "CNAB: isCnabSupported false");

/* ——— Connectors ——— */
assert(allConnectorsPreparing(), "Connectors: todos em preparing");
assert(!isConnectorLive("erp_omie"), "Connectors: Omie não live");
assert(!isConnectorLive("erp_conta_azul"), "Connectors: Conta Azul não live");
assert(!isConnectorLive("erp_bling"), "Connectors: Bling não live");
const defs = listConnectorDefinitions();
assert(defs.some((d) => d.id === "webhook"), "Connectors: webhook registrado");

/* ——— Webhook security ——— */
resetWebhookIdempotencyCache();
const secret = "test-webhook-secret-123456";
const body = JSON.stringify({ records: [{ id: 1 }] });
const ts = Math.floor(Date.now() / 1000);
const sig = signWebhookPayload(secret, body, ts);
const ok = verifyWebhookSignature(secret, body, sig, String(ts));
assert(ok.valid, "Webhook: assinatura válida");

const replay = verifyWebhookSignature(secret, body, sig, String(ts - 9999));
assert(!replay.valid && replay.reason === "timestamp_skew", "Webhook: replay bloqueado (skew)");

registerIdempotencyKey("key-abc");
assert(isDuplicateIdempotencyKey("key-abc"), "Webhook: idempotency duplicate");

/* ——— Tenant isolation ——— */
const isoOk = assertTenantIsolation("tenant-a", "tenant-a");
assert(isoOk.ok, "Tenant isolation: match OK");
const isoBad = assertTenantIsolation("tenant-a", "tenant-b");
assert(!isoBad.ok, "Tenant isolation: mismatch bloqueado");

/* ——— Feature flags default false ——— */
const flags = getEnterpriseFeatureFlags();
assert(!flags.webhooks && !flags.importApi && !flags.ocr, "Feature flags: defaults false");

/* ——— assertSupportedFormat ——— */
let pdfFormatOk = false;
try {
  assertSupportedFormat("pdf");
  pdfFormatOk = true;
} catch {
  pdfFormatOk = false;
}
assert(pdfFormatOk, "assertSupportedFormat: pdf permitido");

let cnabBlocked = false;
try {
  assertSupportedFormat("cnab");
} catch {
  cnabBlocked = true;
}
assert(cnabBlocked, "assertSupportedFormat: cnab bloqueado");

assert(
  supportedExtensions().includes(".pdf") && supportedExtensions().includes(".ofx"),
  "supportedExtensions inclui pdf/ofx/xml",
);

/* ——— RBAC page ——— */
assert(
  read("app/(app)/[tenant]/integracoes/conectores/page.tsx").includes("requireTenant"),
  "Conectores page: requireTenant",
);
assert(
  read("components/import-engine/connectors-hub-client.tsx").includes("Em preparação"),
  "Connectors hub: status Em preparação",
);

/* ——— API routes structure ——— */
assert(
  read("app/api/webhooks/import/route.ts").includes("WEBHOOK_IMPORT_ENABLED") ||
    read("app/api/webhooks/import/route.ts").includes("isWebhooksEnabled"),
  "Webhook route: feature flag",
);
assert(
  read("app/api/v1/import/route.ts").includes("IMPORT_API_ENABLED") ||
    read("app/api/v1/import/route.ts").includes("isImportApiEnabled"),
  "Import API route: feature flag",
);

/* ——— Security PDF now processable ——— */
const pdfSec = validateImportFileSecurity({
  fileName: "extrato.pdf",
  mimeType: "application/pdf",
  bytes: searchablePdf,
});
assert(pdfSec.safe, "Segurança: PDF searchable considerado seguro");

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
