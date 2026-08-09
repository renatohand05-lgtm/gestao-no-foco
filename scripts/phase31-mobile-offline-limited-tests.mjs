#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile offline limited mode (TTL, no mutations, messaging).
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

console.log("\nPhase 31.1 — mobile offline limited\n");

const gateSrc = readFileSync(join(mobileRoot, "src/auth/offline-gate.ts"), "utf8");
check("offline-gate defines OFFLINE_SESSION_TTL_MS", /OFFLINE_SESSION_TTL_MS/.test(gateSrc));
check(
  "offline-gate evaluates lastValidatedAt TTL",
  /lastValidatedAt/.test(gateSrc),
);
check(
  "offline-gate exports evaluateOfflineGate",
  /export async function evaluateOfflineGate/.test(gateSrc),
);

const contractsSrc = readFileSync(join(mobileRoot, "src/offline/contracts.ts"), "utf8");
check(
  "mutationsAllowedOffline false",
  /mutationsAllowedOffline:\s*false/.test(contractsSrc),
);
check(
  "financialMutationsOffline false",
  /financialMutationsOffline:\s*false/.test(contractsSrc),
);

const offlineSrc = readFileSync(join(mobileRoot, "app/offline.tsx"), "utf8");
check(
  "offline.tsx mentions offline limited mode",
  /offline limitado|Modo offline/i.test(offlineSrc),
);
check(
  "offline.tsx references TTL / validação",
  /validação|OFFLINE_SESSION_TTL_MS|ttlHours/.test(offlineSrc),
);
check(
  "offline.tsx offers reconnect action",
  /Tentar novamente|Tentar reconectar|boot/.test(offlineSrc),
);
check(
  "offline.tsx offers Voltar para o login",
  /Voltar para o login/.test(offlineSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
