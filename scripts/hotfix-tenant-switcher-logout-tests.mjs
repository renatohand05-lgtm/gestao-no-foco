#!/usr/bin/env node
/**
 * Hotfix — Tenant switcher + logout (web).
 * Garante que não usamos render={<Link />} (crash Base UI + Next 16 prod).
 */
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

console.log("\nHotfix — tenant switcher + logout\n");

const switcher = readFileSync(
  join(root, "components/layout/tenant-switcher.tsx"),
  "utf8",
);
const userNav = readFileSync(join(root, "components/layout/user-nav.tsx"), "utf8");
const routeError = readFileSync(
  join(root, "components/layout/route-error.tsx"),
  "utf8",
);
const tenants = readFileSync(join(root, "lib/tenants.ts"), "utf8");
const middleware = readFileSync(join(root, "lib/supabase/middleware.ts"), "utf8");

check("switcher sem import Link", !/\bimport\s+Link\b/.test(switcher));
check("switcher sem render Link JSX", !/render=\{\s*<Link[\s/>]/.test(switcher));
check("switcher usa router.push para troca", /router\.push\(/.test(switcher));
check("switcher trata lista vazia", /Nenhuma empresa vinculada/.test(switcher));
check("switcher mostra papel amigável", /ROLE_LABELS|roleLabel/.test(switcher));
check(
  "switcher sem item criar empresa",
  !/<Plus\b/.test(switcher) && !/href=["']\/onboarding["']/.test(switcher),
);
check("switcher trata erro sem throw", /setError|role="alert"/.test(switcher));
check("switcher idempotente enquanto pending", /switching|pendingSlug/.test(switcher));

check(
  "logout sem router.refresh()",
  !/router\.refresh\s*\(/.test(userNav),
);
check("logout usa window.location.assign", /location\.assign\(\s*["']\/login["']\s*\)/.test(userNav));
check("logout idempotente", /inFlight|signingOut/.test(userNav));
check("logout estado Saindo", /Saindo/.test(userNav));
check("logout try/catch", /try\s*\{[\s\S]*signOut[\s\S]*catch/.test(userNav));
check("logout signOut global", /signOut\(\s*\{\s*scope:\s*["']global["']/.test(userNav));

check("route-error sem render Link", !/render=\{\s*<Link\b/.test(routeError));
check("requireTenant bloqueia sem membership", /tenants\[0\]|fallback/.test(tenants));
check("requireTenant redireciona sem user para login", /if\s*\(\s*!user\s*\)[\s\S]*redirect\(\s*["']\/login["']\s*\)/.test(tenants));
check("middleware bloqueia slug sem membership", /tenantSlugs\.includes\(slug\)/.test(middleware));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
