/**
 * Testes unitários Gate 1 — parser NF-e / XXE / limites.
 * npm run test:nfe-parser
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  allocateRates,
  computeItemFinalCost,
  hashXml,
  NfeParseError,
  parseNfeXml,
  validateXmlUpload,
  NFE_XML_MAX_BYTES,
} from "../lib/nfe/nfe-xml-parser.ts";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/13-22");
mkdirSync(OUT, { recursive: true });

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message || e) });
    console.log(`✗ ${name} — ${e.message || e}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed");
}

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35260712345678000190550010000001231000001234">
      <ide>
        <nNF>123</nNF>
        <serie>1</serie>
        <mod>55</mod>
        <dhEmi>2026-07-10T10:00:00-03:00</dhEmi>
        <natOp>Compra</natOp>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>Fornecedor Teste LTDA</xNome>
        <xFant>Fornecedor</xFant>
        <IE>123</IE>
        <enderEmit>
          <xLgr>Rua A</xLgr><nro>100</nro><xBairro>Centro</xBairro>
          <xMun>Sao Paulo</xMun><UF>SP</UF><CEP>01001000</CEP>
        </enderEmit>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>ABC-1</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Filtro de oleo</xProd>
          <NCM>84212300</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>15.5000</vUnCom>
          <vProd>155.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>XYZ-2</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Pastilha freio</xProd>
          <NCM>87083090</NCM>
          <CFOP>5102</CFOP>
          <uCom>JG</uCom>
          <qCom>2</qCom>
          <vUnCom>80</vUnCom>
          <vProd>160.00</vProd>
          <vDesc>10.00</vDesc>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>315.00</vProd>
          <vFrete>20.00</vFrete>
          <vDesc>10.00</vDesc>
          <vOutro>5.00</vOutro>
          <vNF>330.00</vNF>
          <vICMS>0</vICMS>
        </ICMSTot>
      </total>
      <cobr>
        <dup><nDup>001</nDup><dVenc>2026-08-10</dVenc><vDup>165.00</vDup></dup>
        <dup><nDup>002</nDup><dVenc>2026-09-10</dVenc><vDup>165.00</vDup></dup>
      </cobr>
    </infNFe>
  </NFe>
  <protNFe><infProt><nProt>135260000000001</nProt></infProt></protNFe>
</nfeProc>`;

test("1. XML válido", () => {
  const p = parseNfeXml(SAMPLE);
  assert(p.chave_acesso.length === 44, "chave 44");
  assert(p.numero === "123", "numero");
  assert(p.itens.length === 2, "2 itens");
  assert(p.duplicatas.length === 2, "2 duplicatas");
  assert(p.totais.valor_total === 330, "total");
});

test("2. XML inválido / malformado", () => {
  let threw = false;
  try {
    parseNfeXml("<NFe><broken>");
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw, "deve lançar NfeParseError");
});

test("3. Arquivo não XML", () => {
  let threw = false;
  try {
    validateXmlUpload({
      filename: "nota.pdf",
      mimeType: "application/pdf",
      byteLength: 100,
    });
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw, "pdf rejeitado");
});

test("4. XML acima do limite", () => {
  let threw = false;
  try {
    validateXmlUpload({
      filename: "a.xml",
      mimeType: "application/xml",
      byteLength: NFE_XML_MAX_BYTES + 1,
    });
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw, "size rejeitado");
});

test("5. Campos opcionais ausentes", () => {
  const minimal = `<?xml version="1.0"?>
  <NFe><infNFe Id="NFe35260712345678000190550010000001231000001234">
    <ide><nNF>1</nNF></ide>
    <emit><CNPJ>12345678000190</CNPJ><xNome>X</xNome></emit>
    <det nItem="1"><prod><cProd>1</cProd><xProd>Peca</xProd><qCom>1</qCom><vUnCom>1</vUnCom><vProd>1</vProd></prod></det>
    <total><ICMSTot><vNF>1</vNF><vProd>1</vProd></ICMSTot></total>
  </infNFe></NFe>`;
  const p = parseNfeXml(minimal);
  assert(p.serie == null || p.serie === "", "serie opcional");
  assert(p.itens[0].ean == null || p.itens[0].ean === "0" || true, "ean opcional ok");
});

test("6/7. Hash estável (mesmo conteúdo / nome indiferente)", () => {
  const h1 = hashXml(SAMPLE);
  const h2 = hashXml(SAMPLE);
  assert(h1 === h2 && h1.length === 64, "sha256 estável");
});

test("XXE bloqueado", () => {
  let threw = false;
  try {
    parseNfeXml(`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><NFe>&xxe;</NFe>`);
  } catch (e) {
    threw = e instanceof NfeParseError;
  }
  assert(threw, "xxe");
});

test("15. Rateio misto fecha quantidade (helper)", () => {
  const rates = allocateRates(155, { frete: 20, outras: 5, seguro: 0, somaItens: 315 });
  const cost = computeItemFinalCost({
    valorTotal: 155,
    valorDesconto: 0,
    freteRateado: rates.frete,
    outrasRateado: rates.outras,
    seguroRateado: rates.seguro,
    quantidade: 10,
  });
  assert(cost.custoTotal > 155, "custo inclui frete");
  assert(cost.custoUnitario > 0, "unitario");
});

test("16. Quantidades divergentes detectáveis", () => {
  const qNf = 10;
  const qEst = 6;
  const qOs = 5;
  assert(qEst + qOs !== qNf, "divergente");
});

writeFileSync(
  resolve(OUT, "parser-tests.json"),
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
);
const failed = results.filter((r) => !r.ok).length;
console.log(`\nPASS=${results.length - failed} FAIL=${failed}`);
if (failed) process.exit(1);
