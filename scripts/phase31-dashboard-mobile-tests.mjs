#!/usr/bin/env node
/**
 * Sprint 31.2 — Dashboard mobile: rota API + compose + home screen.
 */
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

console.log("\nPhase 31.2 — dashboard mobile\n");

const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/dashboard/route.ts");
const compose = join(root, "lib/mobile/dashboard-compose.ts");
const home = join(root, "apps/mobile/app/(app)/index.tsx");

check("API route dashboard existe", existsSync(route));
check("compose mobile existe", existsSync(compose));
check("home screen dashboard existe", existsSync(home));

const composeSrc = readFileSync(compose, "utf8");
check("compose usa buildCockpitKpis", /buildCockpitKpis/.test(composeSrc));
check("compose usa buildExecutiveBriefV2", /buildExecutiveBriefV2/.test(composeSrc));
check("compose usa composeExecutiveDecision", /composeExecutiveDecision/.test(composeSrc));
check("compose usa buildCockpitAlerts", /buildCockpitAlerts/.test(composeSrc));
check("compose usa hasExecutiveDashboardAccess", /hasExecutiveDashboardAccess/.test(composeSrc));
check("compose sem inventar faturamento", !/faturamento:\s*\d{3,}/.test(composeSrc));

const homeSrc = readFileSync(home, "utf8");
check("home usa fetchExecutiveDashboard", /fetchExecutiveDashboard/.test(homeSrc));
check("home usa React Query", /useQuery/.test(homeSrc));
check("home trata offline snapshot", /loadDashboardSnapshot|offlineMinutes/.test(homeSrc));
check("home respeita RBAC executivo", /dashboard\.executivo|MOBILE_EXECUTIVE|EXEC_PERMS/.test(homeSrc));

const routeSrc = readFileSync(route, "utf8");
check("route autentica Bearer", /authenticateMobileRequest/.test(routeSrc));
check("route valida membership", /getActiveMembership/.test(routeSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
