#!/usr/bin/env node
/**
 * Sprint 29.10 — Tenant isolation contract (CRM + Compras) — estático.
 */
import { readFileSync } from "node:fs";
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

console.log("\nPhase 29.10 — Tenant isolation contract\n");

const clienteSvc = readFileSync(join(root, "lib/clientes/cliente-service.ts"), "utf8");
assert(clienteSvc.includes("tenant_id: this.tenantId"), "create cliente seta tenant_id");
assert(clienteSvc.includes('.eq("tenant_id", this.tenantId)'), "update/list filtra tenant_id");

const purchase = readFileSync(
  join(root, "lib/supply/enterprise/purchase-service.ts"),
  "utf8",
);
assert(purchase.includes('.eq("tenant_id", tenantId)'), "compras filtra tenant_id");

const ensure = readFileSync(
  join(root, "supabase/migrations/20260814_phase29_10_crm_compras_ensure.sql"),
  "utf8",
);
assert(ensure.includes("tenant_id uuid not null"), "tabelas ensure com tenant_id NOT NULL");
assert(ensure.includes("tenant_members"), "RLS via tenant_members");
assert(ensure.includes("auth.uid()"), "RLS auth.uid()");

const m813 = readFileSync(
  join(root, "supabase/migrations/20260813_supply_chain_enterprise_fase25.sql"),
  "utf8",
);
assert(m813.includes("enable row level security"), "60813 RLS");
assert(m813.includes("tm.tenant_id = compras_pedidos.tenant_id"), "60813 policy tenant compras");

const m802 = readFileSync(
  join(root, "supabase/migrations/20260802_phase28_crm_rbac_fields.sql"),
  "utf8",
);
assert(m802.includes("tm.tenant_id = crm_oportunidades.tenant_id"), "60802 policy tenant oportunidades");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
