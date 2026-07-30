#!/usr/bin/env node
/**
 * Fase 24 — CRM Experience tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExecutiveCrmBundle,
  emptyCrmEnterpriseSnapshot,
  getCrmFeatureFlags,
} from "../lib/crm/index.ts";

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

console.log("\nCRM Experience — Fase 24\n");

const pages = [
  "app/(app)/[tenant]/crm/page.tsx",
  "app/(app)/[tenant]/crm/executivo/page.tsx",
  "app/(app)/[tenant]/crm/pipeline/page.tsx",
  "app/(app)/[tenant]/crm/agenda/page.tsx",
  "app/(app)/[tenant]/crm/indicadores/page.tsx",
  "app/(app)/[tenant]/crm/integracoes/page.tsx",
  "components/crm/executive-crm-dashboard.tsx",
  "components/crm/crm-enterprise-navigation.tsx",
  "lib/crm/crm-enterprise-actions.ts",
];

for (const p of pages) {
  assert(existsSync(join(root, p)), `Arquivo: ${p}`);
}

assert(read("package.json").includes("test:crm-experience"), "script experience");
assert(read("config/navigation.ts").includes('title: "CRM"'), "Nav CRM");
assert(read("config/navigation.ts").includes("/crm"), "Nav href /crm");
assert(read(".env.example").includes("CRM_ENTERPRISE_ENABLED"), "Flags .env.example");
assert(read(".env.example").includes("CRM_EXTERNAL_AI_ENABLED=0"), "IA externa off");
assert(
  read(".env.example").includes("CRM_EXTERNAL_INTEGRATIONS_ENABLED=0"),
  "Integrações off",
);

const ui = read("components/crm/executive-crm-dashboard.tsx");
assert(ui.includes("getExecutiveCrmDashboard"), "UI chama server action");
assert(ui.includes("aria-"), "A11y aria");
assert(ui.includes("focus-visible"), "Foco visível");
assert(!ui.includes("Math.random"), "UI sem random");
assert(ui.includes("Dados indisponíveis") || ui.includes("indispon"), "Empty/indisponível");

const actions = read("lib/crm/crm-enterprise-actions.ts");
assert(actions.includes("requireTenant"), "Actions requireTenant");
assert(actions.includes("tenantId do client"), "Rejeita tenantId client");
assert(actions.includes("Cross-tenant"), "Assert cross-tenant");
assert(actions.includes("crm.visualizar"), "RBAC crm.visualizar");
assert(actions.includes("createCrmExecutivoService"), "Reutiliza CRM Executivo");
assert(actions.includes("createCrmDashboardService"), "Reutiliza Dashboard CRM");

assert(
  existsSync(join(root, "app/(app)/[tenant]/clientes/page.tsx")),
  "Cadastro clientes preservado",
);
assert(
  read("lib/crm/index.ts").includes("single_source") ||
    read("lib/crm/enterprise/orchestrator.ts").includes("public.clientes"),
  "Princípio base única",
);

const flags = getCrmFeatureFlags();
assert(flags.enterprise === true || flags.enterprise === false, "Flag readable");

const emptyBundle = buildExecutiveCrmBundle({
  snap: emptyCrmEnterpriseSnapshot("t", "slug"),
});
assert(emptyBundle.empty === true, "Dashboard vazio sem fontes");
assert(
  emptyBundle.kpis.every(
    (k) => k.availability !== "available" || k.value != null,
  ),
  "Sem valores inventados no empty",
);
assert(
  emptyBundle.integrations.connectors.every((c) => c.status !== "live"),
  "Integrações não live",
);

assert(
  read("scripts/release-candidate-tests.mjs").includes(
    "20260812_crm_enterprise_fase24.sql",
  ),
  "RC allowlist migration 20260812",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
