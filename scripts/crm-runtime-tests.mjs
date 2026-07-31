#!/usr/bin/env node
/**
 * Sprint 25.7.5 — Runtime wiring CRM (Owner auth + rotas + sem throw em empty).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasCrmViewAccess,
  resolveCrmEffectivePermissions,
} from "../lib/crm/rbac-compat.ts";

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

console.log("\nCRM Runtime Wiring — Sprint 25.7.5\n");

const routes = [
  "app/(app)/[tenant]/crm/page.tsx",
  "app/(app)/[tenant]/crm/executivo/page.tsx",
  "app/(app)/[tenant]/crm/pipeline/page.tsx",
  "app/(app)/[tenant]/crm/agenda/page.tsx",
  "app/(app)/[tenant]/crm/indicadores/page.tsx",
  "app/(app)/[tenant]/crm/integracoes/page.tsx",
];
for (const r of routes) {
  assert(existsSync(join(root, r)), `rota ${r}`);
}

const hub = readFileSync(join(root, "app/(app)/[tenant]/crm/page.tsx"), "utf8");
assert(hub.includes("crm/executivo"), "hub redireciona para executivo");

const execPage = readFileSync(
  join(root, "app/(app)/[tenant]/crm/executivo/page.tsx"),
  "utf8",
);
assert(execPage.includes("getExecutiveCrmDashboard"), "executivo carrega bundle");
assert(
  execPage.includes("Sem permissão") || execPage.includes("sem permissão"),
  "executivo trata permissão controlada",
);

const actions = readFileSync(join(root, "lib/crm/crm-enterprise-actions.ts"), "utf8");
assert(actions.includes("resolveCrmEffectivePermissions"), "RBAC compat no runtime");
assert(actions.includes("emptyCrmEnterpriseSnapshot"), "empty snapshot no runtime");
assert(actions.includes("sourceHealth"), "falhas de fonte isoladas");

const owner = resolveCrmEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(hasCrmViewAccess(owner.permissions), "Owner runtime auth OK");

const errorUi = readFileSync(join(root, "components/layout/route-error.tsx"), "utf8");
assert(errorUi.includes("Tentar novamente"), "retry no error boundary");
assert(errorUi.includes("digest"), "digest de referência");
assert(errorUi.includes("route_error:dev"), "log dev detalhado");

const tenantError = readFileSync(join(root, "app/(app)/[tenant]/error.tsx"), "utf8");
assert(tenantError.includes("RouteError"), "error boundary preservado");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
