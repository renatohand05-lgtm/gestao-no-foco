#!/usr/bin/env node
/**
 * Sprint 29.10 — Contrato de ordem/idempotência das migrations CRM+Compras.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

console.log("\nPhase 29.10 — Migrations contract\n");

const required = [
  "20260726_crm_enterprise.sql",
  "20260802_phase28_crm_rbac_fields.sql",
  "20260812_crm_enterprise_fase24.sql",
  "20260813_supply_chain_enterprise_fase25.sql",
  "20260814_phase29_10_crm_compras_ensure.sql",
  "20260818_phase29_10_1_fix_cliente_contatos_ativo.sql",
];

const migDir = join(root, "supabase/migrations");
const listed = readdirSync(migDir).filter((f) => f.endsWith(".sql"));
for (const f of required) {
  assert(listed.includes(f), `arquivo ${f} no diretório migrations`);
}

// Ordem lexicográfica por prefixo de data (como o Supabase CLI aplica)
const ordered = [...required].sort();
assert(
  ordered[0] === "20260726_crm_enterprise.sql",
  "ordem: 20260726 primeiro entre o pacote",
);
assert(
  ordered.includes("20260802_phase28_crm_rbac_fields.sql") &&
    ordered.indexOf("20260802_phase28_crm_rbac_fields.sql") <
      ordered.indexOf("20260812_crm_enterprise_fase24.sql"),
  "ordem: 20260802 antes de 20260812 (self-heal oportunidades cobre gap)",
);
assert(
  ordered.indexOf("20260813_supply_chain_enterprise_fase25.sql") <
    ordered.indexOf("20260814_phase29_10_crm_compras_ensure.sql"),
  "ordem: 20260813 antes do ensure 20260814",
);

const ensure = readFileSync(
  join(migDir, "20260814_phase29_10_crm_compras_ensure.sql"),
  "utf8",
);
assert(ensure.includes("IF NOT EXISTS") || ensure.includes("if not exists"), "ensure IF NOT EXISTS");
assert(ensure.includes("to_regclass"), "ensure to_regclass");
assert(ensure.includes("information_schema"), "ensure information_schema");
assert(ensure.includes("pg_constraint") || ensure.includes("pg_policies"), "ensure pg_constraint/policies");
assert(!/drop table/i.test(ensure), "ensure sem DROP TABLE");
assert(/NÃO executar automaticamente|NAO executar automaticamente|manual/i.test(ensure), "ensure marcado manual");

const docs = join(root, "docs/architecture/PHASE_29_10_MIGRATIONS.md");
assert(existsSync(docs), "PHASE_29_10_MIGRATIONS.md presente");
const doc = readFileSync(docs, "utf8");
assert(doc.includes("20260812_crm_enterprise_fase24.sql"), "doc cita 60812");
assert(doc.includes("20260813_supply_chain_enterprise_fase25.sql"), "doc cita 60813");
assert(doc.includes("20260814_phase29_10_crm_compras_ensure.sql"), "doc cita ensure");
assert(doc.includes("Reload schema") || doc.includes("reload schema"), "doc pede reload schema");

const rc = readFileSync(join(root, "scripts/release-candidate-tests.mjs"), "utf8");
assert(rc.includes("20260812_crm_enterprise_fase24.sql"), "RC lista 60812");
assert(rc.includes("20260813_supply_chain_enterprise_fase25.sql"), "RC lista 60813");
assert(rc.includes("20260814_phase29_10_crm_compras_ensure.sql"), "RC lista 60814");
assert(
  rc.includes("20260818_phase29_10_1_fix_cliente_contatos_ativo.sql"),
  "RC lista 60818 fix 29.10.1",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
