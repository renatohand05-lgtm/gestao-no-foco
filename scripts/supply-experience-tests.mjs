#!/usr/bin/env node
/**
 * Fase 25 — Supply Experience (rotas, nav, flags, sem git/SQL runtime)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

console.log("\nSupply Experience — Fase 25\n");

const pages = [
  "app/(app)/[tenant]/compras/page.tsx",
  "app/(app)/[tenant]/compras/executivo/page.tsx",
  "app/(app)/[tenant]/compras/pedidos/page.tsx",
  "app/(app)/[tenant]/compras/almoxarifado/page.tsx",
  "app/(app)/[tenant]/compras/inventario/page.tsx",
  "app/(app)/[tenant]/compras/indicadores/page.tsx",
  "app/(app)/[tenant]/compras/inteligencia/page.tsx",
];
for (const p of pages) {
  assert(existsSync(join(root, p)), `Rota ${p}`);
}

assert(
  existsSync(join(root, "components/supply/executive-supply-dashboard.tsx")),
  "Dashboard executivo",
);
assert(
  existsSync(join(root, "components/supply/supply-enterprise-navigation.tsx")),
  "Nav enterprise",
);
assert(
  existsSync(join(root, "docs/architecture/SUPPLY_ENTERPRISE_25.md")),
  "Doc arquitetura",
);

const nav = read("config/navigation.ts");
assert(nav.includes('href: `${base}/compras`'), "Nav Compras");
assert(nav.includes("Truck"), "Ícone Truck");

const env = read(".env.example");
assert(env.includes("SUPPLY_ENTERPRISE_ENABLED"), "Flag SUPPLY_ENTERPRISE");
assert(env.includes("SUPPLY_EXTERNAL_AI_ENABLED=0"), "IA externa off");

const pkg = read("package.json");
assert(pkg.includes("test:supply-core"), "npm test:supply-core");
assert(pkg.includes("test:inventory-core"), "npm test:inventory-core");
assert(pkg.includes("test:purchase-core"), "npm test:purchase-core");
assert(pkg.includes("test:supply-experience"), "npm test:supply-experience");

const actions = read("lib/supply/supply-enterprise-actions.ts");
assert(actions.includes("createRbacSupabaseAdapter"), "RBAC adapter");
assert(actions.includes("tenantId do client é rejeitado"), "Tenant isolation");
assert(actions.includes("estoque.visualizar"), "Permissão estoque");
assert(actions.includes("compras.visualizar"), "Permissão compras");

assert(
  !actions.includes("Math.random"),
  "Actions sem random",
);
assert(
  read("lib/supply/index.ts").includes("lib/produtos") ||
    read("docs/architecture/SUPPLY_ENTERPRISE_25.md").includes("produtos"),
  "Reusa produtos",
);

const mig = read(
  "supabase/migrations/20260813_supply_chain_enterprise_fase25.sql",
);
assert(mig.includes("create table if not exists public.compras_pedidos"), "Tabela pedidos");
assert(mig.includes("estoque_depositos"), "Tabela depósitos");
assert(mig.includes("estoque_inventarios"), "Tabela inventários");
assert(!mig.includes("create table public.produtos"), "Não duplica produtos");
assert(!mig.includes("create table public.fornecedores"), "Não duplica fornecedores");

const rc = read("scripts/release-candidate-tests.mjs");
assert(
  rc.includes("20260813_supply_chain_enterprise_fase25.sql"),
  "RC allowlist migration 25",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
