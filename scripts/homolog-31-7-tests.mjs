#!/usr/bin/env node
/**
 * Homologação estática Sprint 31.7 — não inventa Android/iOS device QA.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = [
  "test:phase31-intelligence-mobile",
  "test:phase31-dashboard-operational",
  "test:phase31-alert-center",
  "test:phase31-decision-mobile",
  "test:phase31-kpi-health-mobile",
  "test:phase31-goals-mobile",
  "test:phase31-smart-actions",
  "test:phase31-notification-center",
  "test:phase31-offline-snapshot",
  "test:phase31-intelligence-rbac",
  "test:phase31-intelligence-api",
];

let fail = 0;
console.log("\nHomolog 31.7 (estática)\n");
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
    if (r.stdout) console.log(r.stdout.slice(-800));
    if (r.stderr) console.log(r.stderr.slice(-400));
  }
}

console.log(`\nHomolog 31.7: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("Android/iOS device QA: NÃO EXECUTADO nesta sessão\n");
process.exit(fail > 0 ? 1 : 0);
