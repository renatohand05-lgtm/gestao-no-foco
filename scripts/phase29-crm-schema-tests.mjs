#!/usr/bin/env node
/**
 * Sprint 29.10 — Contrato schema CRM (código × migrations × types).
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

console.log("\nPhase 29.10 — CRM schema contract\n");

const files = {
  m726: "supabase/migrations/20260726_crm_enterprise.sql",
  m812: "supabase/migrations/20260812_crm_enterprise_fase24.sql",
  m802: "supabase/migrations/20260802_phase28_crm_rbac_fields.sql",
  m814: "supabase/migrations/20260814_phase29_10_crm_compras_ensure.sql",
};

for (const [k, rel] of Object.entries(files)) {
  assert(existsSync(join(root, rel)), `${k} existe (${rel})`);
}

const sql812 = readFileSync(join(root, files.m812), "utf8");
const sql802 = readFileSync(join(root, files.m802), "utf8");
const sql814 = readFileSync(join(root, files.m814), "utf8");
const sql726 = readFileSync(join(root, files.m726), "utf8");

const createCols = [
  "valor_estimado",
  "probabilidade",
  "data_prevista_fechamento",
  "motivo_perda",
  "empresa_id",
  "filial_id",
  "estagio_funil",
];
for (const col of createCols) {
  assert(
    sql812.includes(col) || sql726.includes(col) || sql814.includes(col),
    `coluna create ${col} coberta por migration`,
  );
}

assert(sql812.includes("add column if not exists valor_estimado"), "60812 valor_estimado IF NOT EXISTS");
assert(sql812.includes("idx_cliente_contatos_one_principal"), "60812 índice principal contatos");
assert(
  sql812.includes("add column if not exists ativo") ||
    sql812.includes("information_schema.columns"),
  "60812 índice principal defensivo (ativo / information_schema)",
);
assert(sql802.includes("consentimento_contato"), "60802 consentimento_contato");
assert(sql814.includes("valor_estimado"), "29.10 ensure cobre valor_estimado");
assert(sql814.includes("to_regclass('public.clientes')"), "29.10 ensure defensivo clientes");
assert(sql814.includes("add column if not exists"), "29.10 ensure idempotente ADD COLUMN");

const m8101 = "supabase/migrations/20260818_phase29_10_1_fix_cliente_contatos_ativo.sql";
assert(existsSync(join(root, m8101)), "29.10.1 fix cliente_contatos.ativo existe");
const sql8101 = readFileSync(join(root, m8101), "utf8");
assert(sql8101.includes("add column if not exists ativo"), "29.10.1 ADD COLUMN ativo");
assert(sql8101.includes("idx_cliente_contatos_one_principal"), "29.10.1 recria índice");
assert(sql8101.includes("information_schema"), "29.10.1 defensivo information_schema");
assert(!/drop table/i.test(sql8101), "29.10.1 sem DROP TABLE");

const mapper = readFileSync(join(root, "lib/clientes/mappers.ts"), "utf8");
assert(mapper.includes("valor_estimado"), "mapper envia valor_estimado");
assert(mapper.includes("estagio_funil"), "mapper envia estagio_funil");
assert(!mapper.includes("consentimento_contato"), "mapper não exige consentimento no create (ok)");

const types = readFileSync(join(root, "types/database.ts"), "utf8");
assert(types.includes("valor_estimado"), "types/database clientes.valor_estimado");
assert(types.includes("consentimento_contato"), "types/database consentimento_contato");
assert(types.includes("crm_oportunidades"), "types/database crm_oportunidades");

const friendly = readFileSync(join(root, "lib/supabase/friendly-error.ts"), "utf8");
assert(friendly.includes("coluna ausente"), "friendly-error mapeia coluna ausente");

assert(sql814.includes("crm_oportunidades"), "ensure crm_oportunidades");
assert(!sql814.toLowerCase().includes("drop table"), "ensure sem DROP TABLE");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
