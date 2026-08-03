#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile tenant selector (API memberships, not mock-only).
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

console.log("\nPhase 31.1 — mobile tenant selector\n");

const tenantSrc = readFileSync(join(mobileRoot, "app/(auth)/tenant.tsx"), "utf8");
const apiSrc = readFileSync(join(mobileRoot, "src/api/mobile-api.ts"), "utf8");

check("tenant.tsx imports fetchMemberships", /fetchMemberships/.test(tenantSrc));
check("mobile-api exports fetchMemberships", /export async function fetchMemberships/.test(apiSrc));
check(
  "tenant.tsx calls fetchMemberships in queryFn",
  /queryFn[\s\S]*fetchMemberships/.test(tenantSrc),
);
check(
  "tenant.tsx does not use MOCK_TENANTS as sole source",
  !/MOCK_TENANTS/.test(tenantSrc),
);
check(
  "tenant.tsx uses memberships query key",
  /memberships/.test(tenantSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
