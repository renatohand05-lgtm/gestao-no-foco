#!/usr/bin/env node
/**
 * Homologação estática Sprint 31.2 — não inventa Android/iOS device QA.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = [
  "test:phase31-dashboard-mobile",
  "test:phase31-kpis-mobile",
  "test:phase31-executive-brief",
  "test:phase31-decision-center-mobile",
  "test:phase31-alerts-mobile",
  "test:phase31-quick-actions",
];

let fail = 0;
console.log("\nHomolog 31.2 (estática)\n");
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

console.log(`\nHomolog 31.2: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("Android/iOS device QA: NÃO EXECUTADO nesta sessão\n");
process.exit(fail > 0 ? 1 : 0);
