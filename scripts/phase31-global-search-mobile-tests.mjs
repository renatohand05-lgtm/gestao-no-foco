#!/usr/bin/env node
import { readFileSync } from "node:fs";
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

console.log("\nPhase 31.9 — global search mobile\n");
const compose = readFileSync(join(root, "lib/mobile/search-compose.ts"), "utf8");
const route = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/search/route.ts"),
  "utf8",
);
const ui = readFileSync(join(root, "apps/mobile/app/(app)/busca.tsx"), "utf8");
const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");

check("reusa MasterDataSearchService", /MasterDataSearchService/.test(compose));
check("RBAC canSeeType", /canSeeType/.test(compose));
check("sanitize ILIKE", /sanitizeIlikeTerm/.test(compose));
check("HARD_LIMIT 50", /HARD_LIMIT = 50/.test(compose));
check("MIN_Q 2", /MIN_Q = 2/.test(compose));
check("route Bearer auth", /authenticateMobileRequest/.test(route));
check("route membership", /getActiveMembership/.test(route));
check("fetchMobileSearch client", /fetchMobileSearch/.test(api));
check("UI debounce", /setTimeout|280/.test(ui));
check("UI useDeferredValue", /useDeferredValue/.test(ui));
check("UI offline cache", /loadSearchCache/.test(ui));
check("UI highlight", /splitHighlight|HighlightTitle/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
