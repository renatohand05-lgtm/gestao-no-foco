#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile offline + push foundation contracts.
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

console.log("\nPhase 31.0 — mobile offline contracts\n");

const offlineSrc = readFileSync(
  join(mobileRoot, "src/offline/contracts.ts"),
  "utf8",
);
check(
  "OfflineFoundation mutationsAllowedOffline false",
  /mutationsAllowedOffline:\s*false/.test(offlineSrc),
);
check(
  "OfflineFoundation financialMutationsOffline false",
  /financialMutationsOffline:\s*false/.test(offlineSrc),
);

const pushSrc = readFileSync(join(mobileRoot, "src/push/contracts.ts"), "utf8");
check(
  "PushFoundation permissionRequested false",
  /permissionRequested:\s*false/.test(pushSrc),
);

const domainSrc = readFileSync(join(root, "packages/domain/src/index.ts"), "utf8");
check(
  "domain OfflineFoundation mutationsAllowedOffline false",
  /mutationsAllowedOffline:\s*false/.test(domainSrc),
);
check(
  "domain PushFoundation permissionRequested false",
  /permissionRequested:\s*false/.test(domainSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
