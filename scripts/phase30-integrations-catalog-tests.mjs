#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Marketplace catalog integrity.
 */
import {
  MARKETPLACE_CATALOG,
  assertCatalogIntegrity,
} from "../lib/integracoes/marketplace-catalog.ts";

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

const REQUIRED_CATEGORIES = [
  "erp",
  "marketplace",
  "whatsapp",
  "email",
  "sms",
  "pagamento",
  "bancos",
  "fiscal",
  "google",
  "microsoft",
  "webhook_tech",
];

console.log("\nPhase 30.8.1 — integrations catalog\n");

const integrity = assertCatalogIntegrity();
check("assertCatalogIntegrity ok", integrity.ok === true);
check("MARKETPLACE_CATALOG length 48", MARKETPLACE_CATALOG.length === 48);

const ids = MARKETPLACE_CATALOG.map((e) => e.id);
check("ids únicos", new Set(ids).size === ids.length);

check(
  "active false + status catalog",
  MARKETPLACE_CATALOG.every((e) => e.active === false && e.status === "catalog"),
);

const categories = new Set(MARKETPLACE_CATALOG.map((e) => e.category));
for (const cat of REQUIRED_CATEGORIES) {
  check(`categoria ${cat}`, categories.has(cat));
}

check(
  "authExpected + capabilities>=1",
  MARKETPLACE_CATALOG.every(
    (e) => Boolean(e.authExpected) && e.capabilities.length >= 1,
  ),
);

check(
  "sem https:// nas descrições",
  MARKETPLACE_CATALOG.every((e) => !e.description.includes("https://")),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
