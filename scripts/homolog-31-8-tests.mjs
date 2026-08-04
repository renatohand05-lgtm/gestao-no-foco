#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = [
  "test:phase31-field-mobile",
  "test:phase31-workorder-detail",
  "test:phase31-checklist-mobile",
  "test:phase31-photo-upload",
  "test:phase31-gallery",
  "test:phase31-signature",
  "test:phase31-attachments",
  "test:phase31-field-rbac",
  "test:phase31-field-offline",
  "test:phase31-field-api",
];

let fail = 0;
console.log("\nHomolog 31.8 (estática)\n");
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
console.log(`\nHomolog 31.8: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("Android/iOS device QA: NÃO EXECUTADO\n");
process.exit(fail > 0 ? 1 : 0);
