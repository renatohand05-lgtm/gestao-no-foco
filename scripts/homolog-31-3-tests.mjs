#!/usr/bin/env node
/**
 * Homologação estática Sprint 31.3 — não inventa Android/iOS device QA.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = [
  "test:phase31-finance-mobile",
  "test:phase31-finance-summary-mobile",
  "test:phase31-accounts-payable-mobile",
  "test:phase31-accounts-receivable-mobile",
  "test:phase31-cash-flow-mobile",
  "test:phase31-dre-mobile",
  "test:phase31-finance-approvals-mobile",
  "test:phase31-finance-rbac-mobile",
  "test:phase31-finance-tenant-isolation",
  "test:phase31-finance-offline-mobile",
  "test:phase31-finance-api-contracts",
];

let fail = 0;
console.log("\nHomolog 31.3 (estática)\n");
for (const script of suites) {
  const r = spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  const ok = r.status === 0;
  console.log(ok ? `  PASS ${script}` : `  FAIL ${script}`);
  if (!ok) {
    fail += 1;
    if (r.stdout) console.log(r.stdout.slice(-500));
    if (r.stderr) console.log(r.stderr.slice(-500));
  }
}

console.log(`\nHomolog 31.3: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("Android/iOS device QA: NÃO EXECUTADO nesta sessão\n");
process.exit(fail > 0 ? 1 : 0);
