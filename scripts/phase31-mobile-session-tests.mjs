#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile session lifecycle (states, boot/login/logout, validation).
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

console.log("\nPhase 31.1 — mobile session\n");

const domainSrc = readFileSync(join(root, "packages/domain/src/index.ts"), "utf8");
for (const state of [
  "authenticated_without_branch",
  "revoked",
  "expired",
  "offline_limited",
]) {
  check(`AuthSessionState includes ${state}`, new RegExp(`"${state}"`).test(domainSrc));
}

const sessionSrc = readFileSync(join(mobileRoot, "src/auth/session-store.ts"), "utf8");
for (const fn of ["boot", "login", "logout"]) {
  check(`session-store exports ${fn}`, new RegExp(`\\b${fn}\\s*:`).test(sessionSrc));
}

const secureSrc = readFileSync(join(mobileRoot, "src/auth/secure-session.ts"), "utf8");
check(
  "secure-session exports touchLastValidatedAt",
  /export async function touchLastValidatedAt/.test(secureSrc),
);
check(
  "secure-session stores lastValidatedAt key",
  /lastValidatedAt/.test(secureSrc),
);
check(
  "session-store calls touchLastValidatedAt on boot",
  /touchLastValidatedAt/.test(sessionSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
