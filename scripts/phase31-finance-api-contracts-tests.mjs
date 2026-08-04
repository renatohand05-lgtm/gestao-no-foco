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

console.log("\nPhase 31.3 — finance API contracts\n");

const routes = [
  "summary",
  "cash-flow",
  "accounts-payable",
  "accounts-receivable",
  "dre",
  "approvals",
  "transactions/[id]",
];

for (const r of routes) {
  const p = join(
    root,
    `app/api/mobile/v1/tenants/[tenantId]/financeiro/${r}/route.ts`,
  );
  check(`rota ${r}`, existsSync(p));
  if (existsSync(p)) {
    const src = readFileSync(p, "utf8");
    check(`${r} autentica`, /authorizeFinanceRoute|authenticateMobileRequest/.test(src));
  }
}

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchFinanceSummary", /fetchFinanceSummary/.test(api));
check("fetchAccountsPayable", /fetchAccountsPayable/.test(api));
check("fetchAccountsReceivable", /fetchAccountsReceivable/.test(api));
check("fetchCashFlow", /fetchCashFlow/.test(api));
check("fetchDreMobile", /fetchDreMobile/.test(api));
check("fetchFinanceApprovals", /fetchFinanceApprovals/.test(api));
check("fetchFinanceDetail", /fetchFinanceDetail/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
