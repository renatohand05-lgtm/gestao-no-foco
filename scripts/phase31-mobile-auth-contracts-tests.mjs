#!/usr/bin/env node
/**
 * Phase 31.0/31.1 — Mobile auth contracts (domain + session).
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

console.log("\nPhase 31.0/31.1 — mobile auth contracts\n");

const REQUIRED_STATES = [
  "booting",
  "unauthenticated",
  "authenticating",
  "authenticated_without_tenant",
  "authenticated_without_branch",
  "authenticated",
  "refreshing",
  "expired",
  "revoked",
  "offline_limited",
  "error",
];

const domainSrc = readFileSync(join(root, "packages/domain/src/index.ts"), "utf8");
for (const state of REQUIRED_STATES) {
  check(`AuthSessionState includes ${state}`, new RegExp(`"${state}"`).test(domainSrc));
}

const secureSrc = readFileSync(join(mobileRoot, "src/auth/secure-session.ts"), "utf8");
check("secure-session uses SecureStore", /SecureStore|safeSecure/.test(secureSrc));
check("secure-session exports saveSession", /export async function saveSession/.test(secureSrc));
check(
  "isProductionMode rejects mock tokens",
  /isProductionMode\(\)[\s\S]*?isMockToken/.test(secureSrc),
);

const sessionSrc = readFileSync(join(mobileRoot, "src/auth/session-store.ts"), "utf8");
for (const state of [
  "booting",
  "unauthenticated",
  "authenticating",
  "authenticated",
  "authenticated_without_branch",
  "revoked",
]) {
  check(`session-store references ${state}`, new RegExp(`"${state}"`).test(sessionSrc));
}
check("session-store exports login (real auth)", /\blogin\s*:\s*async/.test(sessionSrc));
check("session-store login uses signInWithPassword", /signInWithPassword/.test(sessionSrc));
check("session-store does not export mockLogin", !/\bmockLogin\b/.test(sessionSrc));

const loginSrc = readFileSync(join(mobileRoot, "app/(auth)/login.tsx"), "utf8");
check("login uses session store login", /\bs\.login\b|\(\s*s\s*\)\s*=>\s*s\.login/.test(loginSrc));
check("login does not call mockLogin", !/\bmockLogin\b/.test(loginSrc));
check("login does not fetch http directly", !/\bfetch\s*\(/.test(loginSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
