#!/usr/bin/env node
/**
 * Sprint 30.8 — API Center: catálogo interno, sem tokens reais.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  INTERNAL_API_CATALOG,
  assertApiCenterNonOperational,
  assertNoRealApiTokens,
} from "../lib/integracoes/api-center.ts";

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

console.log("\nPhase 30.8 — api-center\n");

const REQUIRED_MODULES = [
  "Financeiro",
  "CRM",
  "Estoque",
  "Agenda",
  "Compras",
  "Analytics",
  "Automações",
  "Equipe",
  "Dashboard",
  "Onboarding",
];

check("arquivo api-center.ts", existsSync(join(root, "lib/integracoes/api-center.ts")));
check("INTERNAL_API_CATALOG >= 10", INTERNAL_API_CATALOG.length >= 10);

for (const mod of REQUIRED_MODULES) {
  check(
    `módulo ${mod}`,
    INTERNAL_API_CATALOG.some((a) => a.module === mod),
  );
}

check("assertNoRealApiTokens", assertNoRealApiTokens());
check("assertApiCenterNonOperational", assertApiCenterNonOperational());
check(
  "operational false (todos)",
  INTERNAL_API_CATALOG.every((a) => a.operational === false),
);
check(
  "endpoints internos /api/internal",
  INTERNAL_API_CATALOG.every((a) => a.endpoint.startsWith("/api/internal/")),
);
check(
  "environment sandbox",
  INTERNAL_API_CATALOG.every((a) => a.environment === "sandbox"),
);

const src = readFileSync(join(root, "lib/integracoes/api-center.ts"), "utf8");
check("sem bearer sk_live", !/sk_live|sk_test_[a-z0-9]{10,}/i.test(src));
check("sem jwt eyJ", !/eyJ[a-zA-Z0-9_-]{10,}/.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
