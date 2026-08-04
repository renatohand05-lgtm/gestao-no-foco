#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = [
  "test:phase31-productivity-mobile",
  "test:phase31-global-search-mobile",
  "test:phase31-command-palette-mobile",
  "test:phase31-scanner-mobile",
  "test:phase31-deep-links-mobile",
  "test:phase31-favorites-mobile",
  "test:phase31-recent-items-mobile",
  "test:phase31-adaptive-home-mobile",
  "test:phase31-context-actions-mobile",
  "test:phase31-productivity-rbac",
  "test:phase31-productivity-tenant-isolation",
  "test:phase31-productivity-offline",
  "test:phase31-productivity-api",
];

let fail = 0;
console.log("\nHomolog 31.9 (estática)\n");
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
console.log(`\nHomolog 31.9: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("Android/iOS device QA (câmera/scanner): NÃO EXECUTADO\n");
process.exit(fail > 0 ? 1 : 0);
