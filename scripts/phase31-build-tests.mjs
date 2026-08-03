#!/usr/bin/env node
/**
 * Sprint 31.0.1 — build/typecheck/doctor gates (invoca comandos).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
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

function run(label, cmd, args) {
  console.log(`\n>>> ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  check(label, r.status === 0);
}

console.log("\nPhase 31.0.1 — build gates\n");

check("turbo.json presente", existsSync(join(root, "turbo.json")));
run("mobile:typecheck", "npm", ["run", "mobile:typecheck"]);
run("mobile:doctor 20/20", "npm", ["run", "mobile:doctor"]);
run("turbo typecheck (packages+mobile)", "npx", ["turbo", "run", "typecheck", "--filter=@gof/*"]);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
