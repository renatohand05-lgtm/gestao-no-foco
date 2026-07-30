#!/usr/bin/env node
/**
 * Sprint 22.5 / 22.5.1 — Import Engine tests (Excel/CSV + RBAC surface).
 * 22.5.1: engine consolidada — segurança, classificação multi-domínio,
 * adapters (Financeiro/Vendas/OS) e Central de Integrações.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import {
  assertSupportedFormat,
  classifyDescription,
  createMemoryImportEngine,
  detectFormatFromFileName,
  parseBrazilianOrAmericanNumber,
  parseFlexibleDate,
  parseImportFile,
  suggestColumnMapping,
  validateMapping,
  validateImportFileSecurity,
  rulesForDomain,
  getImportAdapter,
  listImportAdapters,
  FINANCE_IMPORT_ADAPTER,
  SALES_IMPORT_ADAPTER,
  SERVICE_ORDERS_IMPORT_ADAPTER,
  SALES_IMPORT_FIELDS,
  SERVICE_ORDERS_IMPORT_FIELDS,
  MemoryImportHistoryStore,
  MemoryImportMappingStore,
  MemoryImportRollbackStore,
  MemoryImportStagingStore,
  MemoryImportLearningStore,
  MemoryImportRunItemsStore,
  classifyRowsWithLearning,
  computeMappingConfidence,
  ImportEngineService,
} from "../lib/import-engine/index.ts";

import {
  resolveFinanceEffectivePermissions,
  financePermissionSatisfied,
} from "../lib/finance/index.ts";
import {
  FINANCE_MOVEMENT_IMPORT_FIELDS,
} from "../lib/finance/import/finance-import-fields.ts";

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

console.log("\nEnterprise Import Engine — Sprint 22.5\n");

const requiredFiles = [
  "lib/import-engine/index.ts",
  "lib/import-engine/parsers/csv-parser.ts",
  "lib/import-engine/parsers/excel-parser.ts",
  "lib/import-engine/validators/row-validator.ts",
  "lib/import-engine/mapping/auto-map.ts",
  "lib/import-engine/preview/build-preview.ts",
  "lib/import-engine/importers/commit-pipeline.ts",
  "lib/finance/import/import-actions.ts",
  "app/(app)/[tenant]/financeiro/importar/page.tsx",
  "components/finance/import/import-wizard-client.tsx",
  // Sprint 22.5.1 — segurança
  "lib/import-engine/security/file-security.ts",
  "lib/import-engine/security/antivirus.ts",
  "lib/import-engine/security/index.ts",
  // Sprint 22.5.1 — classificação consolidada (classifiers/ mantido como
  // reexport de compatibilidade)
  "lib/import-engine/classification/rule-classifier.ts",
  "lib/import-engine/classification/provider.ts",
  "lib/import-engine/classifiers/rule-classifier.ts",
  // Sprint 22.5.1 — histórico + rollback
  "lib/import-engine/history/import-history-store.ts",
  "lib/import-engine/rollback/rollback-store.ts",
  // Sprint 22.5.1 — adapters de módulo
  "lib/import-engine/adapters/shared/module-adapter.ts",
  "lib/import-engine/adapters/shared/require-import-access.ts",
  "lib/import-engine/adapters/registry.ts",
  "lib/import-engine/adapters/finance/fields.ts",
  "lib/import-engine/adapters/finance/adapter.ts",
  "lib/import-engine/adapters/sales/fields.ts",
  "lib/import-engine/adapters/sales/adapter.ts",
  "lib/import-engine/adapters/sales/sales-import-actions.ts",
  "lib/import-engine/adapters/service-orders/fields.ts",
  "lib/import-engine/adapters/service-orders/adapter.ts",
  "lib/import-engine/adapters/service-orders/os-import-actions.ts",
  // Sprint 22.5.1 — staging genérico
  "lib/import-engine/shared/staging-store.ts",
  "lib/import-engine/shared/wizard-session-store.ts",
  // Sprint 22.5.1 — UI compartilhada
  "components/import-engine/upload-zone.tsx",
  "components/import-engine/history-table.tsx",
  "components/import-engine/sales-import-wizard-client.tsx",
  "components/import-engine/os-import-wizard-client.tsx",
  // Sprint 22.5.1 — Central de Integrações
  "app/(app)/[tenant]/integracoes/page.tsx",
  "app/(app)/[tenant]/integracoes/importar/page.tsx",
  "app/(app)/[tenant]/integracoes/importar/financeiro/page.tsx",
  "app/(app)/[tenant]/integracoes/importar/vendas/page.tsx",
  "app/(app)/[tenant]/integracoes/importar/ordens/page.tsx",
  // Sprint 22.6 — persistência/aprendizado/rollback
  "supabase/migrations/20260809_enterprise_import_intelligence.sql",
  "lib/import-engine/learning/learning-store.ts",
  "lib/import-engine/learning/apply-learning.ts",
  "lib/import-engine/history/run-items-store.ts",
  "lib/import-engine/mapping/mapping-confidence.ts",
  "lib/import-engine/persistence/supabase-history-store.ts",
  "lib/import-engine/persistence/supabase-mapping-store.ts",
  "lib/import-engine/persistence/supabase-learning-store.ts",
  "lib/import-engine/persistence/supabase-run-items-store.ts",
  "lib/import-engine/persistence/supabase-rollback-store.ts",
  "lib/import-engine/persistence/create-supabase-import-engine.ts",
  "lib/import-engine/persistence/create-import-engine.ts",
  "lib/import-engine/intelligence/intelligence-actions.ts",
  // Sprint 22.6 — UI Mapping Studio + Centro de Inteligência
  "components/import-engine/mapping-studio-client.tsx",
  "components/import-engine/intelligence-history-client.tsx",
  "app/(app)/[tenant]/integracoes/mapeamentos/page.tsx",
  "app/(app)/[tenant]/integracoes/historico/page.tsx",
  "app/(app)/[tenant]/integracoes/perfis/page.tsx",
  // Sprint 22.6.1 — Polimento Central de Inteligência (UI only)
  "components/import-engine/intelligence-presentation.ts",
  "components/import-engine/intelligence-kpi-panel.tsx",
  "components/import-engine/intelligence-timeline-panel.tsx",
  "components/import-engine/intelligence-health-card.tsx",
  "components/import-engine/intelligence-learning-panel.tsx",
];

for (const f of requiredFiles) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(
  read("app/(app)/[tenant]/integracoes/page.tsx").includes(
    "Centro de Inteligência de Dados",
  ),
  "Hub: Centro de Inteligência de Dados",
);
assert(
  read("app/(app)/[tenant]/integracoes/page.tsx").includes(
    "IntelligenceKpiPanel",
  ),
  "Hub 22.6.1: KPI panel",
);
assert(
  read("app/(app)/[tenant]/integracoes/page.tsx").includes(
    "IntelligenceHealthCard",
  ),
  "Hub 22.6.1: Health Score",
);
assert(
  read("app/(app)/[tenant]/integracoes/page.tsx").includes(
    "IntelligenceTimelinePanel",
  ),
  "Hub 22.6.1: Timeline Enterprise",
);
assert(
  read("app/(app)/[tenant]/integracoes/mapeamentos/page.tsx").includes(
    "MappingStudioClient",
  ),
  "UI: Data Mapping Studio",
);
assert(
  read("app/(app)/[tenant]/integracoes/perfis/page.tsx").includes(
    "IntelligenceLearningPanel",
  ),
  "UI 22.6.1: Painel de Aprendizado",
);
assert(
  read("components/import-engine/intelligence-history-client.tsx").includes(
    "Filtros Enterprise",
  ),
  "UI 22.6.1: Histórico com filtros",
);

assert(
  read("components/finance/finance-navigation.tsx").includes('href: "importar"'),
  "Nav: Importar Dados",
);
assert(
  read("app/(app)/[tenant]/financeiro/importar/page.tsx").includes(
    "requireFinancePagePermission",
  ),
  "Página com RBAC",
);
assert(
  read("app/(app)/[tenant]/financeiro/importar/page.tsx").includes(
    "financeiro.criar",
  ),
  "RBAC: financeiro.criar",
);

/* ——— Sprint 22.5.1 — Central de Integrações: nav + sidebar ——— */
assert(
  read("config/navigation.ts").includes("/integracoes"),
  "Nav: item Integrações",
);
assert(
  read("components/layout/app-sidebar.tsx").includes('byHref("/integracoes")'),
  "Sidebar: grupo Gestão inclui /integracoes",
);
assert(
  read("app/(app)/[tenant]/integracoes/importar/vendas/page.tsx").includes(
    "canAccessModuleImport",
  ),
  "Página Vendas com verificação de acesso",
);
assert(
  read("app/(app)/[tenant]/integracoes/importar/ordens/page.tsx").includes(
    "canAccessModuleImport",
  ),
  "Página OS com verificação de acesso",
);

/* ——— detect / normalize ——— */
assert(detectFormatFromFileName("a.CSV") === "csv", "Detect CSV");
assert(detectFormatFromFileName("a.xlsx") === "xlsx", "Detect XLSX");
assert(detectFormatFromFileName("a.xls") === "xls", "Detect XLS");
assert(detectFormatFromFileName("a.pdf") === "pdf", "Detect PDF (futuro)");

let threw = false;
try {
  assertSupportedFormat("pdf");
} catch {
  threw = true;
}
assert(!threw, "PDF permitido em assertSupportedFormat (Sprint 22.8)");

assert(parseBrazilianOrAmericanNumber("1.234,56").value === 1234.56, "Número BR");
assert(parseBrazilianOrAmericanNumber("1,234.56").value === 1234.56, "Número US");
assert(parseFlexibleDate("15/03/2026").value === "2026-03-15", "Data BR");
assert(parseFlexibleDate("2026-03-15").value === "2026-03-15", "Data ISO");
assert(parseFlexibleDate("32/13/2026").value == null, "Data inválida");

/* ——— CSV válido ——— */
const csv = Buffer.from(
  "Descrição,Valor,Data,Categoria\nENEL SP,150,01/02/2026,Utilidades\nSABESP,\"1.200,50\",02/02/2026,\nPIX JOÃO,80,03/02/2026,\n",
  "utf8",
);
const csvParsed = parseImportFile({
  fileName: "despesas.csv",
  mimeType: "text/csv",
  bytes: csv,
});
assert(csvParsed.format === "csv", "CSV válido: formato");
assert(csvParsed.totalRows === 3, "CSV válido: linhas");
assert(csvParsed.columns.some((c) => c.key.includes("descricao") || c.label.toLowerCase().includes("descri")), "CSV: cabeçalho descrição");

/* ——— Excel válido ——— */
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["Descrição", "Valor", "Competência"],
  ["ALUGUEL LOJA", 3500, "10/01/2026"],
  ["FOLHA JANEIRO", 12000, "05/01/2026"],
  ["DARF IRRF", 900, "20/01/2026"],
]);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const xlsxBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const xlsxParsed = parseImportFile({
  fileName: "mov.xlsx",
  mimeType:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  bytes: xlsxBuf,
});
assert(xlsxParsed.format === "xlsx", "Excel válido: formato");
assert(xlsxParsed.totalRows === 3, "Excel válido: linhas");

/* ——— PDF searchable (Sprint 22.8) ——— */
function buildMinimalSearchablePdf(text = "Import Test Line") {
  const stream = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  return Buffer.from(
    `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Size 6/Root 1 0 R>>
%%EOF`,
    "latin1",
  );
}

const searchablePdfBuf = buildMinimalSearchablePdf();
let pdfParsedOk = false;
try {
  const pdfParsed = parseImportFile({
    fileName: "doc.pdf",
    mimeType: "application/pdf",
    bytes: searchablePdfBuf,
  });
  pdfParsedOk = pdfParsed.format === "pdf" && pdfParsed.totalRows > 0;
} catch {
  pdfParsedOk = false;
}
assert(pdfParsedOk, "PDF searchable parseia via parseImportFile");

let imageOnlyPdfFail = false;
try {
  parseImportFile({
    fileName: "scan.pdf",
    mimeType: "application/pdf",
    bytes: Buffer.from(
      `%PDF-1.4
3 0 obj<</Type/Page/Contents 4 0 R>>endobj
4 0 obj<</Length 20>>stream
q /Im1 Do Q
endstream
endobj
%%EOF`,
      "latin1",
    ),
  });
} catch (e) {
  imageOnlyPdfFail = String(e?.message ?? e).includes("image-only");
}
assert(imageOnlyPdfFail, "PDF image-only rejeitado (sem OCR)");

/* ——— arquivo inválido ——— */
let invalid = false;
try {
  parseImportFile({
    fileName: "x.pdf",
    mimeType: "application/pdf",
    bytes: Buffer.from("NOTPDF"),
  });
} catch {
  invalid = true;
}
assert(invalid, "PDF inválido / assinatura rejeitada");

let emptyFail = false;
try {
  parseImportFile({
    fileName: "vazio.csv",
    bytes: Buffer.from("\n\n"),
  });
} catch {
  emptyFail = true;
}
assert(emptyFail, "CSV vazio rejeitado");

/* ——— mapping + preview ——— */
const engine = createMemoryImportEngine();
const mapping = suggestColumnMapping(
  csvParsed.columns.map((c) => c.key),
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
assert(mapping.description, "Mapeamento: descrição");
assert(mapping.amount, "Mapeamento: valor");
assert(mapping.date, "Mapeamento: data");

const missingMap = validateMapping(
  { description: null, amount: null, date: null },
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
assert(
  missingMap.some((i) => i.code === "missing_column"),
  "Colunas ausentes: erro de mapeamento",
);

const preview = await engine.buildPreview({
  tenantId: "t1",
  module: "financeiro",
  targetEntity: "movimentacoes",
  parsed: csvParsed,
  targetFields: FINANCE_MOVEMENT_IMPORT_FIELDS,
});
assert(preview.totalRows === 3, "Preview: totalRows");
assert(preview.firstRows.length > 0, "Preview: primeiras linhas");

await engine.saveMapping({
  tenantId: "t1",
  module: "financeiro",
  targetEntity: "movimentacoes",
  mapping,
});
const saved = await new MemoryImportMappingStore();
assert(true, "Mapping store instanciável");

const normalized = engine.normalize(
  csvParsed,
  mapping,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
assert(normalized.length === 3, "Normalize: 3 linhas");

const badCsv = Buffer.from(
  "Descrição,Valor,Data\nTeste,abc,não-é-data\n",
  "utf8",
);
const badParsed = parseImportFile({ fileName: "bad.csv", bytes: badCsv });
const badMap = suggestColumnMapping(
  badParsed.columns.map((c) => c.key),
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
const badNorm = engine.normalize(
  badParsed,
  badMap,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
assert(
  badNorm[0].issues.some((i) => i.code === "invalid_number" || i.code === "invalid_date" || i.code === "required"),
  "Valores/datas inválidos geram issues",
);

/* ——— duplicidade ——— */
const dupCsv = Buffer.from(
  "Descrição,Valor,Data\nX,10,01/01/2026\nX,10,01/01/2026\n",
  "utf8",
);
const dupParsed = parseImportFile({ fileName: "dup.csv", bytes: dupCsv });
const dupMap = suggestColumnMapping(
  dupParsed.columns.map((c) => c.key),
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
const dupNorm = engine.normalize(
  dupParsed,
  dupMap,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
);
assert(
  dupNorm.some((r) => r.issues.some((i) => i.code === "duplicate")),
  "Duplicidade detectada",
);

/* ——— classifier ——— */
assert(
  classifyDescription("ENEL SP CENTRO").categorySuggested === "Energia Elétrica",
  "Classificador: ENEL",
);
assert(
  classifyDescription("SABESP REF 123").categorySuggested === "Água",
  "Classificador: SABESP",
);
assert(
  classifyDescription("ALUGUEL SALA").categorySuggested === "Aluguel",
  "Classificador: ALUGUEL",
);
assert(
  classifyDescription("FOLHA FEVEREIRO").categorySuggested ===
    "Folha de Pagamento",
  "Classificador: FOLHA",
);
assert(
  classifyDescription("FGTS COMPETENCIA").categorySuggested === "Encargos",
  "Classificador: FGTS",
);
assert(
  classifyDescription("DARF IRRF").categorySuggested === "Impostos",
  "Classificador: DARF",
);
assert(
  classifyDescription("PIX JOÃO").status === "unclassified",
  "Classificador: PIX JOÃO não identificado",
);

const review = engine.buildReview(normalized);
assert(review.length === 3, "Review: linhas");
assert(
  review.some(
    (r) =>
      r.description.toUpperCase().includes("ENEL") &&
      (r.classification.categorySuggested === "Energia Elétrica" ||
        r.classification.categorySuggested === "Utilidades"),
  ),
  "Review: linha ENEL classificada",
);

/* ——— commit pipeline + history (sem criar movimentos reais) ——— */
const history = new MemoryImportHistoryStore();
const svc = new ImportEngineService(new MemoryImportMappingStore(), history);
let committed = 0;
const commitRes = await svc.commit({
  userLabel: "tester",
  request: {
    tenantId: "t1",
    userId: "u1",
    module: "financeiro",
    targetEntity: "movimentacoes",
    fileName: "despesas.csv",
    format: "csv",
    mapping,
    rows: review.map((r) => ({
      ...r,
      issues: r.issues.filter((i) => i.severity !== "error"),
    })),
    confirmedRowNumbers: [review[0].rowNumber],
  },
  onCommitRow: async () => {
    committed += 1;
  },
});
assert(committed === 1, "Commit: 1 linha confirmada");
assert(commitRes.imported === 1, "Commit: imported");
const hist = await history.list("t1", "financeiro");
assert(hist.length === 1, "Histórico registado");

/* ——— Sprint 22.5.1 — Segurança: extensões, executáveis, macros ——— */
let exeExtensionBlocked = false;
try {
  parseImportFile({
    fileName: "virus.exe",
    mimeType: "application/x-msdownload",
    bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
  });
} catch {
  exeExtensionBlocked = true;
}
assert(exeExtensionBlocked, "Segurança: .exe bloqueado por extensão");

let peSignatureBlocked = false;
try {
  parseImportFile({
    fileName: "fatura.csv",
    mimeType: "text/csv",
    bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
  });
} catch {
  peSignatureBlocked = true;
}
assert(peSignatureBlocked, "Segurança: assinatura PE/MZ bloqueada mesmo com extensão CSV");

const pdfSecurity = validateImportFileSecurity({
  fileName: "extrato.pdf",
  mimeType: "application/pdf",
  bytes: buildMinimalSearchablePdf(),
});
assert(
  pdfSecurity.safe &&
    pdfSecurity.detectedFormat === "pdf" &&
    !pdfSecurity.issues.some((i) => i.code === "format_not_supported_yet"),
  "Segurança: PDF com assinatura %PDF válida é processável",
);

const macroWb = XLSX.utils.book_new();
const macroWs = XLSX.utils.aoa_to_sheet([["Descrição", "Valor"], ["TESTE", 10]]);
XLSX.utils.book_append_sheet(macroWb, macroWs, "Sheet1");
const macroBuf = Buffer.concat([
  XLSX.write(macroWb, { type: "buffer", bookType: "xlsx" }),
  Buffer.from("xl/vbaProject.bin"),
]);
let macroBlocked = false;
try {
  parseImportFile({ fileName: "planilha_macro.xlsx", bytes: macroBuf });
} catch {
  macroBlocked = true;
}
assert(macroBlocked, "Segurança: macro (vbaProject.bin) em xlsx bloqueada");

const cleanSecurity = validateImportFileSecurity({
  fileName: "ok.csv",
  mimeType: "text/csv",
  bytes: Buffer.from("Descrição,Valor,Data\nX,10,01/01/2026\n", "utf8"),
});
assert(cleanSecurity.safe, "Segurança: CSV válido considerado seguro");

/* ——— Sprint 22.5.1 — Adapters de módulo ——— */
assert(FINANCE_IMPORT_ADAPTER.requiredPermission === "financeiro.criar", "Adapter Financeiro: RBAC");
assert(FINANCE_IMPORT_ADAPTER.classificationDomain === "finance", "Adapter Financeiro: domínio");

assert(
  SALES_IMPORT_FIELDS.some((f) => f.key === "client") &&
    SALES_IMPORT_FIELDS.some((f) => f.key === "amount") &&
    SALES_IMPORT_FIELDS.some((f) => f.key === "payment_method"),
  "Adapter Vendas: campos-alvo",
);
assert(SALES_IMPORT_ADAPTER.requiredPermission === "vendas.criar", "Adapter Vendas: RBAC vendas.criar");
assert(SALES_IMPORT_ADAPTER.classificationDomain === "sales", "Adapter Vendas: domínio sales");

assert(
  SERVICE_ORDERS_IMPORT_FIELDS.some((f) => f.key === "os_number") &&
    SERVICE_ORDERS_IMPORT_FIELDS.some((f) => f.key === "plate") &&
    SERVICE_ORDERS_IMPORT_FIELDS.some((f) => f.key === "mechanic"),
  "Adapter OS: campos-alvo",
);
assert(
  SERVICE_ORDERS_IMPORT_ADAPTER.requiredPermission === "os.criar",
  "Adapter OS: RBAC os.criar",
);
assert(
  SERVICE_ORDERS_IMPORT_ADAPTER.classificationDomain === "service-orders",
  "Adapter OS: domínio service-orders",
);

/* ——— Sprint 22.5.1 — Registry ——— */
assert(listImportAdapters().length === 3, "Registry: 3 adapters registados");
assert(getImportAdapter("finance").moduleKey === "financeiro", "Registry: finance");
assert(getImportAdapter("sales").id === "sales", "Registry: sales");
assert(getImportAdapter("service-orders").id === "service-orders", "Registry: service-orders");

/* ——— Sprint 22.5.1 — Classificação multi-domínio ——— */
assert(
  classifyDescription("PIX RECEBIDO CLIENTE", { domain: "sales" }).categorySuggested === "PIX",
  "Classificação Vendas: PIX",
);
assert(
  classifyDescription("PAGAMENTO NO CARTAO", { domain: "sales" }).categorySuggested === "Cartão",
  "Classificação Vendas: Cartão",
);
assert(
  classifyDescription("TROCA DE OLEO DO MOTOR", { domain: "service-orders" }).categorySuggested ===
    "Troca de Óleo",
  "Classificação OS: Troca de Óleo",
);
assert(
  classifyDescription("REVISAO DOS 10 MIL KM", { domain: "service-orders" }).categorySuggested ===
    "Revisão",
  "Classificação OS: Revisão",
);
assert(rulesForDomain("sales").length > 0, "Classificação: regras de vendas carregadas");
assert(rulesForDomain("service-orders").length > 0, "Classificação: regras de OS carregadas");
assert(
  classifyDescription("ENEL SP CENTRO", { domain: "finance" }).categorySuggested === "Energia Elétrica",
  "Classificação Financeiro: inalterada (domínio explícito)",
);

/* ——— Sprint 22.6 — Rollback funcional: caso trivial (run inexistente) ——— */
const rollbackStoreBasic = new MemoryImportRollbackStore();
assert(
  (await rollbackStoreBasic.canRollback("t1", "imp_inexistente")) === false,
  "Rollback: run inexistente não é elegível",
);
const rollbackPlanBasic = await rollbackStoreBasic.prepareRollback("t1", "imp_inexistente");
assert(
  rollbackPlanBasic.status === "not_supported",
  "Rollback: plano de run inexistente sinaliza not_supported",
);

/* ——— Sprint 22.5.1 — Staging genérico (Vendas/OS) ——— */
const staging = new MemoryImportStagingStore();
await staging.stage({
  tenantId: "t1",
  module: "sales",
  logId: "batch_1",
  row: review[0],
});
const stagedRows = await staging.list("t1", "sales");
assert(stagedRows.length === 1, "Staging: linha registada para módulo Vendas");

/* ——— RBAC matrix ——— */
const leitura = resolveFinanceEffectivePermissions({
  membershipRole: "member",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  !financePermissionSatisfied(leitura.permissions, "financeiro.criar"),
  "RBAC: Leitura sem financeiro.criar",
);
const owner = resolveFinanceEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  financePermissionSatisfied(owner.permissions, "financeiro.criar"),
  "RBAC: Owner com financeiro.criar",
);

/* ═══════════════════════ Sprint 22.6 — Persistência/Aprendizado/Rollback ═══════════════════════ */

/* ——— Aprendizado: upsert por confirmação + prioridade na classificação ——— */
const learningStore = new MemoryImportLearningStore();
const learnedFirst = await learningStore.upsertFromConfirmation({
  tenantId: "t1",
  module: "financeiro",
  description: "PIX JOÃO SILVA",
  category: "Repasse Sócio",
});
assert(learnedFirst.hitCount === 1, "Aprendizado: primeira confirmação cria regra com hitCount 1");
assert(learnedFirst.source === "user_confirm", "Aprendizado: origem user_confirm na criação");

const learnedAgain = await learningStore.upsertFromConfirmation({
  tenantId: "t1",
  module: "financeiro",
  description: "PIX JOÃO SILVA",
  category: "Repasse Sócio",
});
assert(learnedAgain.hitCount === 2, "Aprendizado: confirmação repetida incrementa hitCount");
assert(learnedAgain.id === learnedFirst.id, "Aprendizado: confirmação repetida reutiliza a mesma regra (ruleKey)");

const learnedEdit = await learningStore.upsertFromConfirmation({
  tenantId: "t1",
  module: "financeiro",
  description: "PIX JOÃO SILVA",
  category: "Distribuição de Lucros",
});
assert(learnedEdit.source === "user_edit", "Aprendizado: categoria alterada marca origem user_edit");
assert(
  learnedEdit.categorySuggested === "Distribuição de Lucros",
  "Aprendizado: categoria atualizada refletida na regra",
);

const learnedRules = await learningStore.list("t1", "financeiro");
assert(learnedRules.length === 1, "Aprendizado: list retorna regras ativas do tenant/módulo");

const matches = await learningStore.findMatches(
  "t1",
  "financeiro",
  "Pagamento PIX para João Silva ref 123",
);
assert(
  matches.length === 1 && matches[0].categorySuggested === "Distribuição de Lucros",
  "Aprendizado: findMatches reconhece descrição semelhante por padrão parcial",
);

assert(
  classifyDescription("PIX JOÃO", { domain: "finance" }).categorySuggested !==
    "Distribuição de Lucros",
  "Aprendizado: motor de regras estático não conhece 'Distribuição de Lucros' (só a regra aprendida sabe)",
);

const learnedClassification = classifyRowsWithLearning(
  [{ rowNumber: 1, description: "PIX JOÃO" }],
  "finance",
  learnedRules,
);
assert(
  learnedClassification[0].categorySuggested === "Distribuição de Lucros",
  "Aprendizado: classifyRowsWithLearning dá prioridade à regra aprendida",
);

// Integração completa: ImportEngineService.buildReview com learnedRules tem prioridade
// sobre a classificação estática para a mesma linha (PIX JOÃO, do CSV original).
const reviewWithLearning = engine.buildReview(normalized, { learnedRules });
const learnedRow = reviewWithLearning.find((r) =>
  r.description.toUpperCase().includes("PIX"),
);
assert(
  learnedRow?.classification.categorySuggested === "Distribuição de Lucros",
  "Aprendizado: buildReview() aplica regra aprendida com prioridade sobre o motor estático",
);

/* ——— Perfis de mapeamento: duplicate / remove / touchUsage ——— */
const profileStore = new MemoryImportMappingStore();
const originalProfile = await profileStore.save({
  tenantId: "t1",
  module: "financeiro",
  targetEntity: "movimentacoes",
  name: "perfil-banco-x",
  mapping: { description: "Descrição", amount: "Valor", date: "Data" },
  makeDefault: true,
});
assert(originalProfile.isDefault === true, "Perfil: save com makeDefault marca isDefault");

const duplicatedProfile = await profileStore.duplicate(
  "t1",
  originalProfile.id,
  "perfil-banco-x-copia",
);
assert(
  duplicatedProfile.id !== originalProfile.id &&
    duplicatedProfile.name === "perfil-banco-x-copia" &&
    duplicatedProfile.isDefault === false,
  "Perfil: duplicate cria cópia independente, nunca como padrão",
);

const foundDuplicate = await profileStore.getById("t1", duplicatedProfile.id);
assert(!!foundDuplicate, "Perfil: getById localiza perfil por id");

await profileStore.touchUsage("t1", originalProfile.id);
const touchedProfile = await profileStore.getById("t1", originalProfile.id);
assert(
  touchedProfile.importCount === 1 && Boolean(touchedProfile.lastUsedAt),
  "Perfil: touchUsage incrementa importCount e define lastUsedAt",
);

await profileStore.remove("t1", duplicatedProfile.id);
const removedProfile = await profileStore.getById("t1", duplicatedProfile.id);
assert(removedProfile === null, "Perfil: remove exclui o perfil da store");

/* ——— Confiança do mapeamento ——— */
const confidenceFields = [
  { key: "description", label: "Descrição", required: true, type: "string" },
  { key: "amount", label: "Valor", required: true, type: "currency" },
  { key: "cost_center", label: "Centro de custo", required: false, type: "string" },
];
const confidenceMapping = {
  description: "Descrição",
  amount: "Valor Total do Lançamento",
  cost_center: null,
};
const confidenceResult = computeMappingConfidence(
  confidenceMapping,
  ["Descrição", "Valor Total do Lançamento"],
  confidenceFields,
);
assert(
  confidenceResult.find((c) => c.fieldKey === "description")?.status === "recognized",
  "Confiança: alias exato reconhecido com alta confiança",
);
assert(
  confidenceResult.find((c) => c.fieldKey === "amount")?.status === "needs_confirmation",
  "Confiança: correspondência difusa pede confirmação",
);
assert(
  confidenceResult.find((c) => c.fieldKey === "cost_center")?.status === "unrecognized",
  "Confiança: campo sem coluna mapeada é não reconhecido",
);

/* ——— Histórico: paginação, getById, markRolledBack, isolamento por tenant ——— */
const isoHistory = new MemoryImportHistoryStore();
await isoHistory.append({
  tenantId: "tenant-a",
  userId: "u1",
  userLabel: "Tester A",
  module: "financeiro",
  fileName: "a.csv",
  format: "csv",
  status: "completed",
  totalRows: 1,
  importedRows: 1,
  rejectedRows: 0,
  errorCount: 0,
  durationMs: 5,
  errorsSample: [],
});
await isoHistory.append({
  tenantId: "tenant-b",
  userId: "u2",
  userLabel: "Tester B",
  module: "financeiro",
  fileName: "b.csv",
  format: "csv",
  status: "completed",
  totalRows: 1,
  importedRows: 1,
  rejectedRows: 0,
  errorCount: 0,
  durationMs: 5,
  errorsSample: [],
});
const listTenantA = await isoHistory.list("tenant-a", "financeiro");
assert(
  listTenantA.length === 1 && listTenantA[0].fileName === "a.csv",
  "Histórico: list isolado por tenant",
);
const pageTenantB = await isoHistory.listPage("tenant-b", { module: "financeiro" });
assert(
  pageTenantB.total === 1 && pageTenantB.items[0]?.fileName === "b.csv",
  "Histórico: listPage isolado por tenant",
);
assert(
  (await isoHistory.getById("tenant-a", listTenantA[0].id)) !== null &&
    (await isoHistory.getById("tenant-b", listTenantA[0].id)) === null,
  "Histórico: getById respeita o tenant informado",
);

/* ——— Rollback: bloqueado com importação posterior / bem-sucedido sem posterior ——— */
const rbHistory = new MemoryImportHistoryStore();
const rbRunItems = new MemoryImportRunItemsStore();
const rbStore = new MemoryImportRollbackStore({ history: rbHistory, runItems: rbRunItems });

const run1 = await rbHistory.append({
  tenantId: "t2",
  userId: "u1",
  userLabel: "Tester",
  module: "financeiro",
  fileName: "run1.csv",
  format: "csv",
  status: "completed",
  totalRows: 2,
  importedRows: 2,
  rejectedRows: 0,
  errorCount: 0,
  durationMs: 10,
  errorsSample: [],
  createdAt: "2026-01-01T00:00:00.000Z",
});
await rbRunItems.appendMany([
  { tenantId: "t2", runId: run1.id, rowNumber: 1, targetType: "cash_movement", targetId: "mv_1" },
  { tenantId: "t2", runId: run1.id, rowNumber: 2, targetType: "cash_movement", targetId: "mv_2" },
]);

const run2 = await rbHistory.append({
  tenantId: "t2",
  userId: "u1",
  userLabel: "Tester",
  module: "financeiro",
  fileName: "run2.csv",
  format: "csv",
  status: "completed",
  totalRows: 1,
  importedRows: 1,
  rejectedRows: 0,
  errorCount: 0,
  durationMs: 10,
  errorsSample: [],
  createdAt: "2026-01-02T00:00:00.000Z",
});
await rbRunItems.appendMany([
  { tenantId: "t2", runId: run2.id, rowNumber: 1, targetType: "cash_movement", targetId: "mv_3" },
]);

assert(
  (await rbStore.canRollback("t2", run1.id)) === false,
  "Rollback: bloqueado — existe importação posterior no mesmo módulo",
);
const planRun1Blocked = await rbStore.prepareRollback("t2", run1.id);
assert(
  planRun1Blocked.status === "not_supported",
  "Rollback: plano do run mais antigo sinaliza not_supported enquanto houver run posterior",
);

assert(
  (await rbStore.canRollback("t2", run2.id)) === true,
  "Rollback: elegível — nenhuma importação posterior no mesmo módulo",
);

const revertedIds = [];
const executed = await rbStore.executeRollback("t2", run2.id, "u1", async (item) => {
  revertedIds.push(item.targetId);
});
assert(executed.status === "done", "Rollback: execução do run mais recente concluída com sucesso");
assert(
  revertedIds.length === 1 && revertedIds[0] === "mv_3",
  "Rollback: onRevertItem chamado para o item pendente correto",
);

const run2AfterRollback = await rbHistory.getById("t2", run2.id);
assert(
  run2AfterRollback.status === "rolled_back" && Boolean(run2AfterRollback.rolledBackAt),
  "Rollback: histórico marcado como rolled_back com timestamp",
);

assert(
  (await rbStore.canRollback("t2", run1.id)) === true,
  "Rollback: run mais antigo torna-se elegível depois que o posterior foi revertido",
);

const secondExecuteAttempt = await rbStore.executeRollback("t2", run2.id, "u1", async () => {});
assert(
  secondExecuteAttempt.status !== "eligible",
  "Rollback: não é possível reverter novamente um run já revertido",
);

/* ——— Persistência Supabase: factories da engine ——— */
assert(
  typeof (await import("../lib/import-engine/persistence/create-import-engine.ts")).createImportEngine ===
    "function",
  "Persistência: createImportEngine() exportado",
);
assert(
  typeof (
    await import("../lib/import-engine/persistence/create-supabase-import-engine.ts")
  ).createSupabaseImportEngine === "function",
  "Persistência: createSupabaseImportEngine() exportado",
);

// avoid unused
void saved;

console.log(`\nImport Engine — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
