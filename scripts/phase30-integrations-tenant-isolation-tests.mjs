#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Integration Hub tenant isolation.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { composeIntegrationHubSnapshot } from "../lib/integracoes/compose-hub.ts";
import { assertTenantIsolationSnapshots } from "../lib/integracoes/security.ts";
import { MARKETPLACE_CATALOG } from "../lib/integracoes/marketplace-catalog.ts";

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

console.log("\nPhase 30.8.1 — integrations tenant isolation\n");

const snapA = composeIntegrationHubSnapshot("tenant-a");
const snapB = composeIntegrationHubSnapshot("tenant-b");

check(
  "assertTenantIsolationSnapshots tenant-a/tenant-b",
  assertTenantIsolationSnapshots("tenant-a", "tenant-b") === true,
);
check("snapshot A tenantId tenant-a", snapA.tenantId === "tenant-a");
check("snapshot B tenantId tenant-b", snapB.tenantId === "tenant-b");
check("tenantIds diferentes", snapA.tenantId !== snapB.tenantId);
check(
  "marketplace mesmo tamanho",
  snapA.marketplace.length === snapB.marketplace.length &&
    snapA.marketplace.length === MARKETPLACE_CATALOG.length,
);

const composeSrc = readFileSync(join(root, "lib/integracoes/compose-hub.ts"), "utf8");
check(
  "getCachedIntegrationHubSnapshot exportado",
  /export const getCachedIntegrationHubSnapshot/.test(composeSrc),
);
check(
  "getCachedIntegrationHubSnapshot usa cache(",
  /getCachedIntegrationHubSnapshot\s*=\s*cache\s*\(/.test(composeSrc),
);

check(
  "logs todos tenantScoped true",
  snapA.logs.every((l) => l.tenantScoped === true) &&
    snapB.logs.every((l) => l.tenantScoped === true),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
