#!/usr/bin/env node
/**
 * Sprint 29.10 — RBAC surface contract ligado a CRM/Compras schema.
 * Reusa asserts estáticos; não altera matriz RBAC de produto.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nPhase 29.10 — RBAC schema surface\n");

assert(existsSync(join(root, "scripts/rbac-tests.mjs")), "rbac-tests.mjs existe");

const roles = readFileSync(join(root, "lib/rbac/roles.ts"), "utf8");
assert(roles.includes("proprietario") || roles.includes("owner"), "roles enterprise presentes");

const ensure = readFileSync(
  join(root, "supabase/migrations/20260814_phase29_10_crm_compras_ensure.sql"),
  "utf8",
);
assert(ensure.includes("tenant_members"), "RLS membership-based (não bypass)");
assert(!ensure.toLowerCase().includes("using (true)"), "policies sem using(true)");

const r = spawnSync(
  process.execPath,
  ["--experimental-strip-types", join(root, "scripts/rbac-tests.mjs")],
  { encoding: "utf8", cwd: root },
);
const out = `${r.stdout || ""}\n${r.stderr || ""}`;
assert(r.status === 0, `test:rbac EXIT 0 (status=${r.status})`);
assert(/FAIL:\s*0|0 FAIL|FAIL 0/i.test(out) || r.status === 0, "rbac suite sem falha");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
