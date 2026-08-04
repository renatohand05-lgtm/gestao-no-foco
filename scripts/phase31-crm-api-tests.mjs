#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 31.4 — CRM API contracts\n");

const routes = [
  "dashboard",
  "pipeline",
  "clients",
  "clients/[id]",
  "timeline",
  "followups",
  "opportunities",
  "forecast",
  "ranking",
  "alerts",
];

for (const r of routes) {
  const p = join(root, `app/api/mobile/v1/tenants/[tenantId]/crm/${r}/route.ts`);
  check(`rota ${r}`, existsSync(p));
  if (existsSync(p)) {
    const src = readFileSync(p, "utf8");
    check(`${r} autentica`, /authorizeCrmRoute/.test(src));
  }
}

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
for (const fn of [
  "fetchCrmDashboard",
  "fetchCrmPipeline",
  "fetchCrmClients",
  "fetchCrmClientDetail",
  "fetchCrmTimeline",
  "fetchCrmFollowups",
  "fetchCrmForecast",
  "fetchCrmOpportunities",
  "fetchCrmRanking",
  "fetchCrmAlerts",
]) {
  check(fn, new RegExp(fn).test(api));
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
