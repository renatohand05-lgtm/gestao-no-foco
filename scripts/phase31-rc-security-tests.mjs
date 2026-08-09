#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

console.log("\nPhase 31.10 — RC security\n");
const cfg = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");
const envEx = readFileSync(join(root, "apps/mobile/.env.example"), "utf8");
const secure = readFileSync(join(root, "apps/mobile/src/auth/secure-session.ts"), "utf8");
const client = readFileSync(join(root, "apps/mobile/src/api/client.ts"), "utf8");
const logger = readFileSync(join(root, "apps/mobile/src/observability/logger.ts"), "utf8");

check("env example só EXPO_PUBLIC / EAS_PROJECT_ID comentado",
  /EXPO_PUBLIC_/.test(envEx) && !/SERVICE_ROLE/.test(envEx) && !/eyJ/.test(envEx));
check("SecureStore presente", /SecureStore|secure-store|SECURE/.test(secure) || /getAccessToken|saveSession/.test(secure));
check("api client usa Bearer via context", /Authorization|accessToken/.test(client));
check("sanitize logs", /sanitizeForLog/.test(logger));
check("config sem service role", !/SERVICE_ROLE/.test(cfg));
check("updates só com EAS_PROJECT_ID", /EAS_PROJECT_ID/.test(cfg));
check("deep link scheme gof", /scheme:\s*"gof"/.test(cfg));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
