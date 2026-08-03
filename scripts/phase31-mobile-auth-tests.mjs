#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile auth (real Supabase login + API routes).
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

console.log("\nPhase 31.1 — mobile auth\n");

check("supabase/client.ts exists", existsSync(join(mobileRoot, "src/supabase/client.ts")));

const sessionSrc = readFileSync(join(mobileRoot, "src/auth/session-store.ts"), "utf8");
check("session-store exports login", /\blogin\s*:\s*async/.test(sessionSrc));
check(
  "session-store login uses signInWithPassword",
  /signInWithPassword/.test(sessionSrc),
);
check(
  "session-store does not export mockLogin",
  !/\bmockLogin\b/.test(sessionSrc),
);

const secureSrc = readFileSync(join(mobileRoot, "src/auth/secure-session.ts"), "utf8");
check("secure-session exports saveSession", /export async function saveSession/.test(secureSrc));
check(
  "secure-session isProductionMode rejects mock tokens",
  /isProductionMode\(\)[\s\S]*?isMockToken/.test(secureSrc),
);

const loginSrc = readFileSync(join(mobileRoot, "app/(auth)/login.tsx"), "utf8");
check("login.tsx uses session login", /\bs\.login\b|\(\s*s\s*\)\s*=>\s*s\.login/.test(loginSrc));
check("login.tsx does not call mockLogin", !/\bmockLogin\b/.test(loginSrc));

check(
  "API route app/api/mobile/v1/me",
  existsSync(join(root, "app/api/mobile/v1/me/route.ts")),
);
check(
  "API route app/api/mobile/v1/memberships",
  existsSync(join(root, "app/api/mobile/v1/memberships/route.ts")),
);

const authRequestSrc = readFileSync(join(root, "lib/mobile/auth-request.ts"), "utf8");
check("auth-request uses getUser", /\.auth\.getUser\(\)/.test(authRequestSrc));
check(
  "auth-request never uses SERVICE_ROLE",
  !/SERVICE_ROLE/i.test(authRequestSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
