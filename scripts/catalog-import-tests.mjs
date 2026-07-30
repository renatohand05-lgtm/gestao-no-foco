#!/usr/bin/env node
/**
 * Sprint 25.3 — Catalog import tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildServiceCatalogExport,
  catalogFileExists,
  computeServicePrice,
  filterCatalogServices,
  findServiceDuplicates,
  loadPlatformServiceCatalog,
  materializeCatalogPrices,
  previewPriceRecalc,
  CATALOG_REFERENCE_HOUR_RATES,
} from "../lib/catalog-import/index.ts";
import {
  CATALOG_IMPORT_ADAPTER,
  getImportAdapter,
  listImportAdapters,
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

console.log("\nCatalog Import — Sprint 25.3\n");

assert(catalogFileExists(), "Catálogo XLSX presente");
assert(
  existsSync(join(root, "data/catalogs/servicos-zona-sul-sp.xlsx")),
  "Path data/catalogs",
);

const catalog = loadPlatformServiceCatalog();
assert(catalog.services.length >= 400, `≥400 serviços (got ${catalog.services.length})`);
assert(catalog.categories.length > 0, "Categorias carregadas");
assert(catalog.rates.popular > 0, "Premissa popular carregada");
assert(
  catalog.rates.economico === CATALOG_REFERENCE_HOUR_RATES.economico ||
    catalog.rates.economico > 0,
  "Premissa econômica",
);

const aOnly = filterCatalogServices({ prioridade: "A" }, catalog);
assert(aOnly.length > 0 && aOnly.length < catalog.services.length, "Filtro prioridade A");

const priced = materializeCatalogPrices(aOnly.slice(0, 5), "popular", catalog.rates);
assert(
  priced.every((r) => r.preco_venda == null || Number.isFinite(r.preco_venda)),
  "Preços finitos",
);
assert(
  priced.some((r) => r.preco_venda != null && r.preco_venda > 0),
  "Preço calculado a partir de hora×tempo",
);

const calc = computeServicePrice({
  tempoPadraoH: 2,
  band: "economico",
  rates: { economico: 110, popular: 145, estruturado: 180, especializado: 240 },
});
assert(calc.price === 220, "2h × 110 = 220");

const recalc = previewPriceRecalc({
  band: "estruturado",
  rates: catalog.rates,
  rows: priced.map((r) => ({
    codigo: r.codigo_servico,
    nome: r.nome_servico,
    tempoPadraoH: r.tempo_padrao_h,
    priceBefore: r.preco_venda,
  })),
});
assert(recalc.affectedCount >= 0, "Recálculo preview");
assert(recalc.hourRate === catalog.rates.estruturado, "Hora estruturada");

const xlsx = buildServiceCatalogExport({
  format: "xlsx",
  filter: { prioridade: "A" },
  band: "popular",
  rates: catalog.rates,
});
assert(xlsx.bytes.byteLength > 1000, "XLSX real gerado");
assert(xlsx.mimeType.includes("spreadsheet"), "MIME XLSX");
assert(xlsx.rowCount === aOnly.length, "Row count XLSX");

const csv = buildServiceCatalogExport({
  format: "csv",
  filter: { emptyTemplate: true },
  band: "popular",
});
assert(csv.fileName.endsWith(".csv"), "CSV gerado");
assert(csv.rowCount === 0, "Modelo vazio 0 linhas");

const dups = findServiceDuplicates({
  rows: [
    { rowNumber: 1, codigo: "SER-1", nome: "A" },
    { rowNumber: 2, codigo: "SER-1", nome: "B" },
    { rowNumber: 3, codigo: "SER-2", nome: "C" },
  ],
  existingByCode: new Map([["SER-2", "uuid-1"]]),
});
assert(dups.length === 2, "Duplicidade exata + existente");
assert(dups.every((d) => d.decisionRequired === true), "Nunca sobrescreve silencioso");

assert(getImportAdapter("catalog").requiredPermission === "servicos.importar", "RBAC adapter");
assert(CATALOG_IMPORT_ADAPTER.fields.some((f) => f.key === "codigo_servico"), "Campo código");
assert(listImportAdapters().some((a) => a.id === "catalog"), "Registry catalog");

assert(read("lib/rbac/permissions.ts").includes("servicos.importar"), "Permissão serviços");
assert(read("lib/rbac/permissions.ts").includes("produtos.importar"), "Permissão produtos");
assert(
  existsSync(join(root, "app/(app)/[tenant]/produtos/importar/page.tsx")),
  "UI produtos/importar",
);
assert(
  read("components/catalog-import/catalog-import-panel.tsx").includes(
    "Baixar catálogo de serviços",
  ),
  "Botão download",
);
assert(
  !read("components/catalog-import/catalog-import-panel.tsx").toLowerCase().includes("pdf"),
  "Sem PDF falso",
);
assert(
  read("components/catalog-import/catalog-import-panel.tsx").includes("Filtrar por categoria"),
  "Filtro categoria UI",
);
assert(
  read("lib/catalog-import/price-bands.ts").includes("assertValidHourRates"),
  "Validação hora técnica",
);

/* Arquivo de referência multi-aba: deve ler Importacao, não Resumo */
{
  const refPath = join(root, "data/catalogs/servicos-zona-sul-sp.xlsx");
  if (existsSync(refPath)) {
    const bytes = new Uint8Array(readFileSync(refPath));
    const parsed = parseImportFile({
      fileName: "Catalogo_ref.xlsx",
      bytes,
    });
    assert(parsed.totalRows >= 400, `Ref parse ≥400 (got ${parsed.totalRows})`);
    assert(
      parsed.columns.some((c) => c.key.includes("codigo_servico")),
      "Ref mapeia codigo_servico",
    );
    assert(
      parsed.warnings.some((w) => w.includes("Importacao")),
      "Aviso indica aba Importacao",
    );
  }
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
