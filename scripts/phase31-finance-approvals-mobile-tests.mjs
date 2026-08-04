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

console.log("\nPhase 31.3 — finance approvals mobile\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const screen = join(root, "apps/mobile/app/(app)/financeiro/aprovacoes.tsx");
check("composeFinanceApprovals", /composeFinanceApprovals/.test(compose));
check("honesto available:false", /available:\s*false/.test(compose));
check("webHref aprovacoes", /aprovacoes\/runtime/.test(compose));
check("tela aprovacoes", existsSync(screen));
check(
  "API route",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/financeiro/approvals/route.ts")),
);
const ui = readFileSync(screen, "utf8");
check("bloqueia mutação offline", /Offline|bloqueadas offline/i.test(ui));
check("sem aprovar local falso", !/approveApproval\(|POST.*approve/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
