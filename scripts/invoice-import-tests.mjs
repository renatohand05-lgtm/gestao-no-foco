#!/usr/bin/env node
/**
 * Sprint 25.3 — Invoice / NF-e import bridge tests
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildInvoiceItemRows,
  canAutoCreateProductFromInvoice,
  NfeParseError,
  parseInvoiceXmlSafe,
  resolveInvoiceItemMatch,
} from "../lib/catalog-import/invoice-bridge.ts";
import { getImportAdapter } from "../lib/import-engine/index.ts";

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

console.log("\nInvoice Import — Sprint 25.3\n");

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35240114200166000187550010000000011000000010">
      <ide>
        <nNF>1</nNF>
        <serie>1</serie>
        <mod>55</mod>
        <dhEmi>2024-01-15T10:00:00-03:00</dhEmi>
        <natOp>Compra</natOp>
      </ide>
      <emit>
        <CNPJ>14200166000187</CNPJ>
        <xNome>Fornecedor Teste LTDA</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>P1</cProd>
          <cEAN>7891000100103</cEAN>
          <xProd>Filtro de oleo</xProd>
          <NCM>84212300</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>50.0000</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>100.00</vProd>
          <vNF>100.00</vNF>
          <vFrete>0</vFrete>
          <vDesc>0</vDesc>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

const bytes = new TextEncoder().encode(sampleXml);
const parsed = parseInvoiceXmlSafe({
  fileName: "nfe.xml",
  mimeType: "application/xml",
  bytes,
});
assert(parsed.chave_acesso.length >= 20, "Chave NF");
assert(parsed.itens.length === 1, "1 item");
assert(parsed.emitente.razao_social?.includes("Fornecedor"), "Emitente");

const rows = buildInvoiceItemRows(parsed);
assert(rows[0].ean === "7891000100103", "EAN item");
assert(rows[0].quantidade === 2, "Qty item");

const matchEan = resolveInvoiceItemMatch({
  ean: "7891000100103",
  codigo: "P1",
  descricao: "Filtro de oleo",
  byEan: new Map([["7891000100103", "prod-1"]]),
  bySku: new Map(),
  bySupplierCode: new Map(),
  byName: new Map(),
});
assert(matchEan.status === "vinculado", "Match EAN");
assert(matchEan.confidence >= 0.9, "Alta confiança EAN");

const matchLow = resolveInvoiceItemMatch({
  ean: null,
  codigo: null,
  descricao: "Produto desconhecido XYZ",
  byEan: new Map(),
  bySku: new Map(),
  bySupplierCode: new Map(),
  byName: new Map(),
});
assert(matchLow.status === "nao_encontrado", "Não encontrado");
assert(canAutoCreateProductFromInvoice(matchLow.confidence) === false, "Sem auto-create baixa confiança");
assert(canAutoCreateProductFromInvoice(0.9) === true, "Auto-create só alta confiança");

let xxeBlocked = false;
try {
  parseInvoiceXmlSafe({
    fileName: "xxe.xml",
    bytes: new TextEncoder().encode(
      `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><a>&xxe;</a>`,
    ),
  });
} catch (e) {
  xxeBlocked = e instanceof NfeParseError || /XXE|DOCTYPE|ENTITY/i.test(String(e));
}
assert(xxeBlocked, "XXE bloqueado");

let invalidBlocked = false;
try {
  parseInvoiceXmlSafe({
    fileName: "bad.xml",
    bytes: new TextEncoder().encode("<not-a-nfe>x</not-a-nfe>"),
  });
} catch {
  invalidBlocked = true;
}
assert(invalidBlocked, "XML inválido rejeitado");

assert(getImportAdapter("invoice").requiredPermission === "compras.receber", "RBAC invoice");
assert(
  read("lib/catalog-import/invoice-bridge.ts").includes("lib/nfe"),
  "Reusa parser NFe",
);
assert(
  read("lib/catalog-import/invoice-import-actions.ts").includes(
    "NfeEntradaService",
  ) ||
    read("lib/catalog-import/invoice-import-actions.ts").includes(
      "notas-fiscais",
    ),
  "Ponte para fluxo NF existente",
);
assert(
  !read("lib/catalog-import/invoice-import-actions.ts").includes("Math.random"),
  "Sem random",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
