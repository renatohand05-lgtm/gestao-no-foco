#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile env + app.config contracts.
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

console.log("\nPhase 31.0 — mobile env\n");

const envExample = readFileSync(join(mobileRoot, ".env.example"), "utf8");
check(".env.example EXPO_PUBLIC_API_BASE_URL", /EXPO_PUBLIC_API_BASE_URL=/.test(envExample));
check(".env.example EXPO_PUBLIC_APP_ENV", /EXPO_PUBLIC_APP_ENV=/.test(envExample));
check(".env.example sem sk_", !/\bsk_/.test(envExample));
check(".env.example sem service_role", !/service_role/i.test(envExample));
check(".env.example sem password=", !/password=/i.test(envExample));

const appConfig = readFileSync(join(mobileRoot, "app.config.ts"), "utf8");
check("app.config scheme gof", /scheme:\s*["']gof["']/.test(appConfig));
check(
  "app.config ios bundleIdentifier",
  /bundleIdentifier:\s*["']com\.gestaonofoco\.app["']/.test(appConfig),
);
check(
  "app.config android package",
  /package:\s*["']com\.gestaonofoco\.app["']/.test(appConfig),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
