#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Integration Hub RBAC wiring.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { INTEGRATION_PERMISSIONS } from "../lib/integracoes/guards.ts";

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

const REQUIRED_KEYS = [
  "integracoes.visualizar",
  "integracoes.configurar",
  "integracoes.administrar",
  "api.visualizar",
  "api.administrar",
  "api.documentar",
  "webhook.visualizar",
  "webhook.administrar",
  "webhook.configurar",
  "scheduler.visualizar",
  "scheduler.administrar",
  "scheduler.configurar",
  "eventbus.visualizar",
  "eventbus.administrar",
  "eventbus.configurar",
  "logs.visualizar",
  "monitor.visualizar",
  "monitor.administrar",
];

console.log("\nPhase 30.8.1 — integrations RBAC\n");

const permSrc = readFileSync(join(root, "lib/rbac/permissions.ts"), "utf8");
for (const key of REQUIRED_KEYS) {
  check(`permissions.ts ${key}`, permSrc.includes(`"${key}"`));
}

for (const key of REQUIRED_KEYS) {
  check(
    `INTEGRATION_PERMISSIONS inclui ${key}`,
    INTEGRATION_PERMISSIONS.includes(key),
  );
}

const pageSrc = readFileSync(
  join(root, "app/(app)/[tenant]/integracoes/page.tsx"),
  "utf8",
);
check(
  "integracoes page usa requireIntegracoesAccess",
  /requireIntegracoesAccess/.test(pageSrc),
);

const navSrc = readFileSync(join(root, "config/navigation.ts"), "utf8");
check(
  "navigation.ts integracoes.visualizar",
  /integracoes\.visualizar/.test(navSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
