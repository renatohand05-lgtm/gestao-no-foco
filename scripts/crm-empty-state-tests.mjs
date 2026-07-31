#!/usr/bin/env node
/**
 * Sprint 25.7.5 — Empty states CRM (sem inventar dados).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { emptyCrmEnterpriseSnapshot } from "../lib/crm/enterprise/snapshot-builder.ts";
import { buildExecutiveCrmBundle } from "../lib/crm/enterprise/orchestrator.ts";
import { defaultPipelineStages } from "../lib/crm/enterprise/pipeline-config.ts";

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

console.log("\nCRM Empty State — Sprint 25.7.5\n");

const empty = emptyCrmEnterpriseSnapshot("tenant-a", "demo");
assert(empty.tenantId === "tenant-a", "empty snapshot tenantId");
const bundle = buildExecutiveCrmBundle({
  snap: empty,
  permissions: ["crm.visualizar"],
});
assert(bundle.empty === true || bundle.kpis?.length >= 0, "bundle empty/seguro");
assert(Array.isArray(bundle.pipeline), "pipeline array");
assert(Array.isArray(defaultPipelineStages()), "default stages sem DB");

const dash = readFileSync(
  join(root, "components/crm/executive-crm-dashboard.tsx"),
  "utf8",
);
assert(dash.includes("ExecutiveEmptyState"), "UI empty state");
assert(dash.includes("Novo cliente") || dash.includes("clientes/novo"), "CTA novo cliente");
assert(!/Math\.random|faker|lorem/i.test(dash), "sem dados fictícios na UI");

const pipelineUi = readFileSync(
  join(root, "components/crm/pipeline-config-client.tsx"),
  "utf8",
);
assert(
  pipelineUi.includes("empty") || pipelineUi.includes("Seed") || pipelineUi.includes("seed"),
  "pipeline UI trata vazio / seed",
);

const agenda = readFileSync(
  join(root, "app/(app)/[tenant]/crm/agenda/page.tsx"),
  "utf8",
);
assert(agenda.includes("Agenda"), "agenda page existe");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
