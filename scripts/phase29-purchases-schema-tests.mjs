#!/usr/bin/env node
/**
 * Sprint 29.10 — Contrato schema Compras / Supply (código × migrations × types).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nPhase 29.10 — Purchases schema contract\n");

const m813 = "supabase/migrations/20260813_supply_chain_enterprise_fase25.sql";
const m814 = "supabase/migrations/20260814_phase29_10_crm_compras_ensure.sql";
assert(existsSync(join(root, m813)), "20260813 existe");
assert(existsSync(join(root, m814)), "20260814 ensure existe");

const sql813 = readFileSync(join(root, m813), "utf8");
const sql814 = readFileSync(join(root, m814), "utf8");

const tables = [
  "compras_pedidos",
  "compras_pedido_itens",
  "compras_cotacoes",
  "compras_eventos",
  "compras_cotacao_itens",
  "compras_recebimentos",
  "compras_recebimento_itens",
  "estoque_depositos",
];
for (const t of tables) {
  assert(
    sql813.includes(`create table if not exists public.${t}`),
    `60813 define ${t}`,
  );
  assert(sql814.includes(t), `29.10 ensure menciona ${t}`);
}

assert(sql813.includes("enable row level security"), "60813 RLS");
assert(sql814.includes("Membros gerenciam compras_pedidos"), "29.10 policy pedidos");
assert(sql814.includes("to_regclass('public.compras_pedidos')") || sql814.includes("compras_pedidos"), "ensure pedidos");

const purchase = readFileSync(
  join(root, "lib/supply/enterprise/purchase-service.ts"),
  "utf8",
);
assert(purchase.includes('from("compras_pedidos")'), "probe usa compras_pedidos");
assert(purchase.includes("probePurchaseSchema"), "probePurchaseSchema exportado");
assert(purchase.includes("schema cache") || purchase.includes("does not exist"), "detecta schema ausente");

const page = readFileSync(
  join(root, "app/(app)/[tenant]/compras/pedidos/page.tsx"),
  "utf8",
);
assert(page.includes("Schema pendente"), "UI Schema pendente");
assert(page.includes("20260813_supply_chain_enterprise_fase25.sql"), "UI aponta migration 60813");

const types = readFileSync(join(root, "types/database.ts"), "utf8");
assert(types.includes("compras_pedidos:"), "types compras_pedidos");
assert(types.includes("estoque_depositos:"), "types estoque_depositos");

assert(!sql814.toLowerCase().includes("drop table"), "ensure sem DROP TABLE");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
