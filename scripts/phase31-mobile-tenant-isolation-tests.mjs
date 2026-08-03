#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile tenant isolation (query keys + store).
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

console.log("\nPhase 31.0 — mobile tenant isolation\n");

const domainSrc = readFileSync(join(root, "packages/domain/src/index.ts"), "utf8");
check("buildQueryKey includes tenantId", /tenantId/.test(domainSrc));
check("buildQueryKey includes branchId", /branchId/.test(domainSrc));

const tenantSrc = readFileSync(join(mobileRoot, "src/tenant/context-store.ts"), "utf8");
check("tenant setTenant clears queryClient", /setTenant[\s\S]*?queryClient\.clear/.test(tenantSrc));
check("tenant clearTenant clears queryClient", /clearTenant[\s\S]*?queryClient\.clear/.test(tenantSrc));

const configSrc = readFileSync(join(root, "packages/config/src/index.ts"), "utf8");
check("MOCK_TENANTS in config", /export const MOCK_TENANTS/.test(configSrc));

const keysSrc = readFileSync(join(mobileRoot, "src/query/keys.ts"), "utf8");
check("query keys use buildQueryKey", /buildQueryKey/.test(keysSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
