#!/usr/bin/env node
/**
 * Fase 23 — Analytics Experience tests (estrutura + RBAC + rotas)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExecutiveAnalyticsBundle,
  getAnalyticsFeatureFlags,
  isAnalyticsEnabled,
  METRIC_CATALOG,
} from "../lib/analytics/index.ts";

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

console.log("\nAnalytics Experience — Fase 23\n");

const routes = [
  "app/(app)/[tenant]/analytics/page.tsx",
  "app/(app)/[tenant]/analytics/executivo/page.tsx",
  "app/(app)/[tenant]/analytics/financeiro/page.tsx",
  "app/(app)/[tenant]/analytics/vendas/page.tsx",
  "app/(app)/[tenant]/analytics/clientes/page.tsx",
  "app/(app)/[tenant]/analytics/operacoes/page.tsx",
  "app/(app)/[tenant]/analytics/estoque/page.tsx",
  "app/(app)/[tenant]/analytics/tributario/page.tsx",
  "app/(app)/[tenant]/analytics/metas/page.tsx",
  "app/(app)/[tenant]/analytics/alertas/page.tsx",
  "app/(app)/[tenant]/analytics/relatorios/page.tsx",
  "app/(app)/[tenant]/analytics/configuracoes/page.tsx",
  "components/analytics/executive-analytics-dashboard.tsx",
  "components/analytics/analytics-navigation.tsx",
  "lib/analytics/analytics-actions.ts",
  "lib/analytics/snapshot-loader.ts",
];

for (const f of routes) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(read("package.json").includes("test:analytics-experience"), "script experience");
assert(read("config/navigation.ts").includes("/analytics"), "Nav Analytics");
assert(read("lib/rbac/permissions.ts").includes("analytics.visualizar"), "RBAC analytics");
assert(read("lib/rbac/types.ts").includes('"analytics"'), "PermissionModule analytics");
assert(read(".env.example").includes("ANALYTICS_ENABLED"), "Flags no .env.example");

assert(isAnalyticsEnabled() === true, "Analytics enabled default");
assert(getAnalyticsFeatureFlags().externalAi === false, "IA externa off");
assert(getAnalyticsFeatureFlags().exportExcel === false, "Excel off");
assert(getAnalyticsFeatureFlags().exportPdf === false, "PDF off");

const ui = read("components/analytics/executive-analytics-dashboard.tsx");
assert(ui.includes("getExecutiveAnalyticsDashboard"), "UI chama server action");
assert(!ui.includes("Math.random"), "UI sem random");
assert(ui.includes("sr-only"), "Acessibilidade sr-only");
assert(ui.includes("Em preparação") || ui.includes("preparing"), "Export preparing na UI");

assert(
  read("lib/analytics/analytics-actions.ts").includes("requireTenant"),
  "Actions com tenant",
);
assert(
  read("lib/analytics/snapshot-loader.ts").includes("createFinancialIntelligenceService") ||
    read("lib/analytics/snapshot-loader.ts").includes("financial-intelligence"),
  "Loader reutiliza FI",
);
assert(
  read("lib/analytics/snapshot-loader.ts").includes("cash-intelligence"),
  "Loader reutiliza Cash",
);
assert(
  !existsSync(join(root, "supabase/migrations/20260812_enterprise_analytics.sql")),
  "Sem migration desnecessária de métricas",
);

const emptyBundle = buildExecutiveAnalyticsBundle({
  snap: { tenantId: "t", tenantSlug: "s", asOf: "2026-07-29" },
  permissions: ["analytics.visualizar", "analytics.executivo"],
});
assert(emptyBundle.empty === true, "Dashboard vazio sem fontes");
assert(
  emptyBundle.metrics.every((m) => m.availability !== "available" || m.value != null),
  "Sem valores inventados no empty",
);

const matrixAreas = ["financeiro", "vendas", "clientes", "operacoes", "estoque", "tributario"];
for (const area of matrixAreas) {
  assert(
    METRIC_CATALOG.some((m) => m.area === area),
    `Catálogo cobre área ${area}`,
  );
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
