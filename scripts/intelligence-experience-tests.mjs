#!/usr/bin/env node
/**
 * Sprint 22.9 — Experiência Premium e Inteligência Executiva
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDataQualitySummary,
  buildHealthScore,
  buildIntelligenceKpis,
} from "../components/import-engine/intelligence-presentation.ts";

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

console.log("\nSprint 22.9 — Experiência Premium e Inteligência Executiva\n");

const requiredFiles = [
  "components/import-engine/intelligence-hub-nav.tsx",
  "components/import-engine/intelligence-journey.tsx",
  "components/import-engine/premium-preview-tabs.tsx",
  "components/import-engine/intelligence-drilldown.tsx",
  "components/import-engine/data-quality-panel.tsx",
  "app/(app)/[tenant]/integracoes/page.tsx",
  "app/(app)/[tenant]/integracoes/qualidade/page.tsx",
  "app/(app)/[tenant]/integracoes/auditoria/page.tsx",
  "scripts/intelligence-experience-tests.mjs",
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Arquivo: ${file}`);
}

assert(
  read("package.json").includes("test:intelligence-experience"),
  "package.json script test:intelligence-experience",
);

/* ——— Navigation ——— */
console.log("\nNavigation\n");

const navSrc = read("components/import-engine/intelligence-hub-nav.tsx");
const navLabels = [
  "Visão Geral",
  "Importar",
  "Revisar",
  "Conciliação",
  "Histórico",
  "Mapeamentos",
  "Regras Aprendidas",
  "Conectores",
  "Qualidade dos Dados",
  "Auditoria",
];
for (const label of navLabels) {
  assert(navSrc.includes(label), `Hub nav inclui: ${label}`);
}
assert(
  navSrc.includes("/financeiro/conciliacao"),
  "Conciliação → financeiro/conciliacao",
);

const hubPage = read("app/(app)/[tenant]/integracoes/page.tsx");
assert(hubPage.includes("IntelligenceHubNav"), "Hub page: IntelligenceHubNav");
assert(hubPage.includes("IntelligenceJourney"), "Hub page: IntelligenceJourney");
assert(hubPage.includes("DataQualityPanel"), "Hub page: DataQualityPanel");
assert(hubPage.includes("PremiumPreviewTabs"), "Hub page: PremiumPreviewTabs");
assert(hubPage.includes("IntelligenceDrilldown"), "Hub page: IntelligenceDrilldown");

const hubNavSrc = navSrc;
assert(
  hubNavSrc.includes('aria-label="Navegação da Central de Inteligência"'),
  "Nav: aria-label",
);
assert(hubNavSrc.includes("overflow-x-auto"), "Nav: scrollable mobile");
assert(hubNavSrc.includes("focus-visible:ring"), "Nav: focus-visible");

/* ——— Journey ——— */
console.log("\nJourney\n");

const journeySrc = read("components/import-engine/intelligence-journey.tsx");
assert(
  journeySrc.includes("INTELLIGENCE_JOURNEY_STEPS") &&
    journeySrc.split("label:").length >= 8,
  "Journey: 7 etapas definidas",
);
const journeyLabels = [
  "Enviar",
  "Detectar",
  "Mapear",
  "Classificar",
  "Revisar",
  "Confirmar",
  "Acompanhar",
];
for (const label of journeyLabels) {
  assert(journeySrc.includes(label), `Journey label: ${label}`);
}
assert(journeySrc.includes("data-intelligence-journey"), "Journey: data attribute");

/* ——— Premium preview tabs ——— */
console.log("\nPremium preview\n");

const premiumSrc = read("components/import-engine/premium-preview-tabs.tsx");
const tabIds = [
  "resumo",
  "dados",
  "baixa-confianca",
  "erros",
  "duplicidades",
  "validacoes",
  "mapeamento",
  "impacto",
  "auditoria",
];
for (const id of tabIds) {
  assert(premiumSrc.includes(`"${id}"`), `Premium tab: ${id}`);
}
assert(premiumSrc.includes("PREMIUM_PREVIEW_TABS"), "Premium: tabs export");
assert(premiumSrc.includes('role="tablist"'), "Premium: tablist a11y");
assert(premiumSrc.includes("Aguardando run"), "Premium: empty/disabled state");
assert(premiumSrc.includes("gofMotion"), "Premium: gofMotion");

/* ——— Drill-down ——— */
console.log("\nDrill-down\n");

const drillSrc = read("components/import-engine/intelligence-drilldown.tsx");
assert(
  drillSrc.includes("buildDrillHref") &&
    drillSrc.includes("/historico?run="),
  "Drill-down: import href builder",
);
assert(
  drillSrc.includes("/auditoria"),
  "Drill-down: audit href",
);
assert(drillSrc.includes("data-intelligence-drilldown"), "Drill-down: data attribute");
assert(drillSrc.includes("data-drill-level"), "Drill-down: level markers");

/* ——— Dashboard KPIs — real data, no fictitious ——— */
console.log("\nDashboard KPIs (sem fictícios)\n");

const emptyKpis = buildIntelligenceKpis([], 0);
assert(
  emptyKpis.find((k) => k.key === "total")?.value === "0",
  "KPI vazio: total = 0",
);
const autoKpi = emptyKpis.find((k) => k.key === "autoClassify");
assert(autoKpi?.placeholder === true, "KPI autoClassify: placeholder explícito");
assert(autoKpi?.value === "—", "KPI autoClassify: sem número inventado");

const emptyHealth = buildHealthScore([]);
assert(emptyHealth.placeholder === true, "Health vazio: placeholder");
assert(emptyHealth.percent == null, "Health vazio: percent null");

const sampleRuns = [
  {
    id: "r1",
    tenantId: "t1",
    userId: "u1",
    userLabel: "Test",
    module: "financeiro",
    fileName: "planilha.csv",
    format: "csv",
    status: "completed",
    totalRows: 100,
    importedRows: 95,
    rejectedRows: 5,
    errorCount: 2,
    durationMs: 1200,
    createdAt: "2026-07-01T10:00:00.000Z",
    errorsSample: [],
  },
  {
    id: "r2",
    tenantId: "t1",
    userId: "u1",
    userLabel: "Test",
    module: "financeiro",
    fileName: "falha.csv",
    format: "csv",
    status: "failed",
    totalRows: 10,
    importedRows: 0,
    rejectedRows: 10,
    errorCount: 3,
    durationMs: 500,
    createdAt: "2026-07-02T10:00:00.000Z",
    errorsSample: ["Erro linha 2"],
  },
];

const realKpis = buildIntelligenceKpis(sampleRuns, 2);
assert(realKpis.find((k) => k.key === "total")?.value === "2", "KPI real: total");
assert(realKpis.find((k) => k.key === "completed")?.value === "1", "KPI real: completed");
assert(realKpis.find((k) => k.key === "errors")?.value === "1", "KPI real: errors");

const quality = buildDataQualitySummary(sampleRuns, 2);
assert(quality.totalRuns === 2, "Quality: totalRuns");
assert(quality.totalRows === 110, "Quality: totalRows soma real");
assert(quality.importedRows === 95, "Quality: importedRows");
assert(quality.empty === false, "Quality: not empty");

const emptyQuality = buildDataQualitySummary([], 0);
assert(emptyQuality.empty === true, "Quality empty state");

/* ——— Data quality panel ——— */
console.log("\nData quality panel\n");

const dqSrc = read("components/import-engine/data-quality-panel.tsx");
assert(dqSrc.includes("EmptyState"), "Quality panel: EmptyState");
assert(dqSrc.includes("data-data-quality-panel"), "Quality panel: marker");
assert(
  !dqSrc.match(/value:\s*"\d{2,}"/) && !dqSrc.includes("fake"),
  "Quality panel: sem números hardcoded",
);

/* ——— Clipboard formats ——— */
console.log("\nClipboard paste\n");

assert(
  hubPage.includes("clipboard-input") || hubPage.includes("Parser clipboard"),
  "Hub: clipboard parser referenciado",
);
assert(
  !hubPage.includes('label: "Tabela", icon: TableIcon, comingSoon: true'),
  "Hub: Tabela não é comingSoon",
);
assert(
  hubPage.includes("integracoes/importar") &&
    hubPage.includes("Texto estruturado"),
  "Hub: paste formats linkam importar",
);

/* ——— Batch review ——— */
console.log("\nBatch review\n");

const reviewSrc = read("components/import-engine/assisted-review-queue-client.tsx");
assert(reviewSrc.includes("window.confirm"), "Review: confirmação antes do lote");
assert(reviewSrc.includes("data-batch-confirm"), "Review: batch marker");
assert(reviewSrc.includes("data-review-filters"), "Review: filtros");
assert(reviewSrc.includes("data-keyboard-hints"), "Review: keyboard hints");
assert(reviewSrc.includes("Filtrar por"), "Review: aria filter labels");

/* ——— Empty / loading structural ——— */
console.log("\nEmpty & loading structural\n");

assert(
  read("app/(app)/[tenant]/integracoes/auditoria/page.tsx").includes(
    "ExecutiveEmptyState",
  ),
  "Auditoria: empty state",
);
assert(
  premiumSrc.includes("ExecutiveEmptyState"),
  "Premium: ExecutiveEmptyState",
);
assert(
  hubPage.includes("Sem pendências") || hubPage.includes("failedOrPartial === 0"),
  "Hub: empty pendências",
);

/* ——— RBAC requireTenant ——— */
console.log("\nRBAC requireTenant\n");

const tenantPages = [
  "app/(app)/[tenant]/integracoes/page.tsx",
  "app/(app)/[tenant]/integracoes/qualidade/page.tsx",
  "app/(app)/[tenant]/integracoes/auditoria/page.tsx",
  "app/(app)/[tenant]/integracoes/revisar/page.tsx",
  "app/(app)/[tenant]/integracoes/historico/page.tsx",
];

for (const page of tenantPages) {
  assert(read(page).includes("requireTenant"), `requireTenant: ${page}`);
}

/* ——— Reused components ——— */
console.log("\nReused components\n");

assert(hubPage.includes("ExecutivePage"), "Hub: ExecutivePage");
assert(hubPage.includes("ExecutiveSection"), "Hub: ExecutiveSection");
assert(hubPage.includes("IntelligenceKpiPanel"), "Hub: IntelligenceKpiPanel");
assert(hubPage.includes("Button"), "Hub: Button");
assert(hubPage.includes("Card"), "Hub: Card");
assert(hubPage.includes("Badge"), "Hub: Badge");
assert(hubPage.includes("Breadcrumbs"), "Hub: Breadcrumbs");

/* ——— Responsive structural ——— */
console.log("\nResponsive structural\n");

assert(
  read("components/import-engine/intelligence-journey.tsx").includes("overflow-x-auto"),
  "Journey: overflow-x-auto",
);
assert(premiumSrc.includes("overflow-x-auto"), "Premium tabs: overflow-x-auto");

/* ——— Accessibility structural ——— */
console.log("\nAccessibility\n");

assert(hubNavSrc.includes('role="tab"'), "Nav: role tab");
assert(premiumSrc.includes("aria-selected"), "Premium: aria-selected");
assert(
  read("components/import-engine/intelligence-journey.tsx").includes(
    'aria-current={current ? "step"',
  ),
  "Journey: aria-current step",
);

/* ——— No constructor parameter properties in new files ——— */
console.log("\nTypeScript style\n");

const newFiles = [
  "components/import-engine/intelligence-hub-nav.tsx",
  "components/import-engine/intelligence-journey.tsx",
  "components/import-engine/premium-preview-tabs.tsx",
  "components/import-engine/intelligence-drilldown.tsx",
  "components/import-engine/data-quality-panel.tsx",
];

for (const f of newFiles) {
  const src = read(f);
  assert(
    !src.match(/constructor\s*\(\s*(public|private|protected|readonly)\s+/),
    `Sem parameter properties: ${f}`,
  );
}

/* ——— Sub-routes ——— */
console.log("\nSub-routes\n");

assert(
  read("app/(app)/[tenant]/integracoes/qualidade/page.tsx").includes(
    "IntelligenceHubNav",
  ),
  "Qualidade: hub nav",
);
assert(
  read("app/(app)/[tenant]/integracoes/auditoria/page.tsx").includes(
    "IntelligenceHubNav",
  ),
  "Auditoria: hub nav",
);

console.log(`\n${"=".repeat(48)}`);
console.log(`PASS: ${pass}  FAIL: ${fail}`);
console.log(`${"=".repeat(48)}\n`);

process.exit(fail > 0 ? 1 : 0);
