#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile route guards (boot routes + deep link paths).
 */
import { readFileSync } from "node:fs";
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

console.log("\nPhase 31.1 — mobile route guards\n");

const guardsSrc = readFileSync(join(mobileRoot, "src/auth/guards.ts"), "utf8");
check("resolveBootRoute exported", /export function resolveBootRoute/.test(guardsSrc));

for (const [state, route] of [
  ["authenticated_without_branch", "/(auth)/branch"],
  ["revoked", "/(auth)/login"],
  ["offline_limited", "/offline"],
  ["expired", "/(auth)/login"],
]) {
  check(
    `resolveBootRoute ${state} → ${route}`,
    new RegExp(`case "${state}"[\\s\\S]*?${route.replace(/[()]/g, "\\$&")}`).test(guardsSrc),
  );
}

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check("_layout handles auth/reset deep link", /auth\/reset/.test(layoutSrc));
check(
  "_layout references auth/callback or reset handler",
  /auth\/callback|handleAuthDeepLink/.test(layoutSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
