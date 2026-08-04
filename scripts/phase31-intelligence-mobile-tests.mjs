#!/usr/bin/env node
/**
 * Sprint 31.7 — Inteligência Mobile (pack + screen + builders).
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

console.log("\nPhase 31.7 — intelligence mobile\n");

const compose = join(root, "lib/mobile/intelligence-compose.ts");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/route.ts");
const screen = join(root, "apps/mobile/app/(app)/inteligencia/index.tsx");

check("compose intelligence existe", existsSync(compose));
check("API inteligencia existe", existsSync(route));
check("screen inteligencia existe", existsSync(screen));

const src = readFileSync(compose, "utf8");
check("reusa composeMobileExecutiveDashboard", /composeMobileExecutiveDashboard/.test(src));
check("reusa composeDecisionCenterPack / Analytics", /composeDecisionCenterPack|buildExecutiveAnalyticsBundle/.test(src));
check("reusa buildExecutiveBriefV2 via dashboard", /composeMobileExecutiveDashboard/.test(src));
check("sem service_role no client", !/SERVICE_ROLE|service_role/.test(src));
check("sem inventar faturamento numérico", !/faturamento:\s*\d{3,}/.test(src));
check("RBAC executivo", /hasExecutiveDashboardAccess/.test(src));

const screenSrc = readFileSync(screen, "utf8");
check("screen usa fetchIntelligencePack", /fetchIntelligencePack/.test(screenSrc));
check("screen usa React Query", /useQuery/.test(screenSrc));
check("screen offline snapshot", /loadIntelligenceSnapshot|saveIntelligenceSnapshot/.test(screenSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
