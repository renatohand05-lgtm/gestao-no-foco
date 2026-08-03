#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile session refresh (single-flight, no loops).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = join(root, "apps/mobile");
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

console.log("\nPhase 31.1 — mobile refresh\n");

const refreshPath = join(mobileRoot, "src/auth/refresh.ts");
check("refresh.ts exists", existsSync(refreshPath));

const refreshSrc = readFileSync(refreshPath, "utf8");
check(
  "refreshSessionOnce exported",
  /export async function refreshSessionOnce/.test(refreshSrc),
);
check(
  "single-flight via refreshPromise",
  /refreshPromise/.test(refreshSrc),
);
check(
  "single-flight comment or guard",
  /single-flight|if \(refreshPromise\)/i.test(refreshSrc),
);

const sessionSrc = readFileSync(join(mobileRoot, "src/auth/session-store.ts"), "utf8");
const loopPatterns = [
  /while\s*\([^)]*\)[\s\S]{0,200}refreshSessionOnce/,
  /for\s*\([^)]*\)[\s\S]{0,200}refreshSessionOnce/,
  /setInterval\s*\([^)]*refresh/,
  /refreshSessionOnce[\s\S]{0,80}refreshSessionOnce/,
];
for (const pattern of loopPatterns) {
  check(`session-store no refresh loop (${pattern.source.slice(0, 40)}…)`, !pattern.test(sessionSrc));
}
check("session-store no refresh loop in refresh.ts", !/while\s*\(/.test(refreshSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
