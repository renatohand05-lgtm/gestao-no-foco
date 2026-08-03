#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile RBAC (permissions route + PermissionGate).
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

console.log("\nPhase 31.1 — mobile rbac\n");

check(
  "permissions API route exists",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/permissions/route.ts")),
);

const gateSrc = readFileSync(join(mobileRoot, "src/permissions/gate.ts"), "utf8");
check("permissions gate exports hasPermission", /hasPermission/.test(gateSrc));
check("permissions gate exports useHasPermission", /useHasPermission/.test(gateSrc));

const componentsSrc = readFileSync(join(mobileRoot, "src/design/components/index.tsx"), "utf8");
check("PermissionGate component exists", /export function PermissionGate/.test(componentsSrc));
check(
  "PermissionGate uses useHasPermission",
  /PermissionGate[\s\S]*useHasPermission/.test(componentsSrc),
);

const apiSrc = readFileSync(join(mobileRoot, "src/api/mobile-api.ts"), "utf8");
check("mobile-api exports fetchPermissions", /fetch async function fetchPermissions/.test(apiSrc) || /export async function fetchPermissions/.test(apiSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
