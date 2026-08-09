#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile logout (clears secure store, tenant, query cache).
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

console.log("\nPhase 31.1 — mobile logout\n");

const sessionSrc = readFileSync(join(mobileRoot, "src/auth/session-store.ts"), "utf8");
check("session-store exports logout", /\blogout\s*:/.test(sessionSrc));
check(
  "logout clears secure session (via resetLocalMobileAuth ou clearSecureSession)",
  /logout[\s\S]*(resetLocalMobileAuth|clearSecureSession)/.test(sessionSrc),
);
check(
  "logout clears tenant store",
  /logout[\s\S]*(clearTenant|resetLocalMobileAuth)/.test(sessionSrc),
);
check(
  "logout clears queryClient (direto ou via reset)",
  /logout[\s\S]*(queryClient\.clear|resetLocalMobileAuth)/.test(sessionSrc),
);

const apiSrc = readFileSync(join(mobileRoot, "src/api/mobile-api.ts"), "utf8");
check("mobile-api exports postLogout", /export async function postLogout/.test(apiSrc));
check(
  "logout calls postLogout optionally (catch)",
  /postLogout[\s\S]*\.catch/.test(sessionSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
