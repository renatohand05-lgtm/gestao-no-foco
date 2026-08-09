#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suites = ["test:phase31-ios-build"];

let fail = 0;
console.log("\nHomolog 31.11.1 (iOS RC readiness)\n");
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
  }
}
console.log(`\nHomolog 31.11.1: ${suites.length - fail} PASS · ${fail} FAIL`);
console.log("EAS Build iOS: BLOQUEADO sem login");
console.log("TestFlight submit: NÃO EXECUTADO\n");
process.exit(fail > 0 ? 1 : 0);
