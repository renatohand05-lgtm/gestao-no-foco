#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile API client contracts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
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

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

console.log("\nPhase 31.0 — mobile API client\n");

const clientSrc = readFileSync(join(mobileRoot, "src/api/client.ts"), "utf8");
check("api client timeout", /timeoutMs|DEFAULT_REQUEST_TIMEOUT_MS/.test(clientSrc));
check("api client requestId", /requestId|createRequestId/.test(clientSrc));
check("api client tenant header", /API_HEADERS\.tenant|x-gof-tenant-id/.test(clientSrc));
check("api client MAX_GET_RETRIES", /MAX_GET_RETRIES/.test(clientSrc));

const contractsSrc = readFileSync(
  join(root, "packages/api-contracts/src/index.ts"),
  "utf8",
);
check("MAX_GET_RETRIES exported", /export const MAX_GET_RETRIES/.test(contractsSrc));

const apiDir = join(mobileRoot, "src/api");
const forbiddenHits = [];
for (const file of collectFiles(apiDir)) {
  const src = readFileSync(file, "utf8");
  if (/service_role|SUPABASE_SERVICE/i.test(src)) {
    forbiddenHits.push(file.replace(root + "\\", "").replace(root + "/", ""));
  }
}
check("no service_role / SUPABASE_SERVICE in api", forbiddenHits.length === 0);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
