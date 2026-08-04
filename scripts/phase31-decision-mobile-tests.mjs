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

console.log("\nPhase 31.7 — decision mobile\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/decision/route.ts");
const screen = readFileSync(join(root, "apps/mobile/app/(app)/inteligencia/index.tsx"), "utf8");

check("rota decision existe", existsSync(route));
check("inclui decision do cockpit (composeExecutiveDecision via dashboard)", /decision:/.test(compose));
check("inclui analyticsDecision", /analyticsDecision/.test(compose));
check("gargalos/riscos/oportunidades", /bottlenecks/.test(compose) && /risks/.test(compose) && /opportunities/.test(compose));
check("sem IA generativa", !/openai|generative|gpt-|anthropic/i.test(compose));
check("screen renderiza DecisionSection + AnalyticsDecision", /DecisionSection/.test(screen) && /AnalyticsDecisionSection/.test(screen));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
