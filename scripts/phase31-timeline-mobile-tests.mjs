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

console.log("\nPhase 31.4 — timeline mobile\n");
check(
  "rota timeline",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/timeline/route.ts")),
);
check("tela timeline", existsSync(join(root, "apps/mobile/app/(app)/crm/timeline.tsx")));
const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("ClienteTimelineService", /ClienteTimelineService/.test(compose));
check("composeCrmTimeline", /composeCrmTimeline/.test(compose));
const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchCrmTimeline", /fetchCrmTimeline/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
