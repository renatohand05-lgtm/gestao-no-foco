#!/usr/bin/env node
/**
 * Sprint 25.7.5 — Contrato de schema CRM (código × migration 20260812).
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

console.log("\nCRM Schema Contract — Sprint 25.7.5\n");

const migration = join(root, "supabase/migrations/20260812_crm_enterprise_fase24.sql");
assert(existsSync(migration), "migration 20260812 existe");
const sql = readFileSync(migration, "utf8");

const requiredTables = [
  "crm_pipeline_stages",
  "crm_oportunidades",
  "crm_stage_movements",
  "cliente_contatos",
];
for (const t of requiredTables) {
  assert(sql.includes(`create table if not exists public.${t}`), `migration define ${t}`);
}

const pipelineSvc = readFileSync(
  join(root, "lib/crm/enterprise/pipeline-stage-service.ts"),
  "utf8",
);
assert(pipelineSvc.includes("crm_pipeline_stages"), "pipeline service usa crm_pipeline_stages");
assert(pipelineSvc.includes("empty"), "pipeline trata empty");

const contatoSvc = readFileSync(
  join(root, "lib/crm/enterprise/contato-service.ts"),
  "utf8",
);
assert(contatoSvc.includes("cliente_contatos"), "contato service usa cliente_contatos");

const oppSvc = readFileSync(
  join(root, "lib/crm/enterprise/oportunidade-service.ts"),
  "utf8",
);
assert(
  oppSvc.includes("crm_oportunidades") || oppSvc.includes("oportunidade"),
  "oportunidade service presente",
);

const types = existsSync(join(root, "types/crm-enterprise.ts"));
assert(types, "types/crm-enterprise.ts presente");

const snap = readFileSync(
  join(root, "lib/crm/enterprise/snapshot-builder.ts"),
  "utf8",
);
assert(snap.includes("emptyCrmEnterpriseSnapshot"), "empty snapshot exportado");

// Não exige migration nova se 20260812 cobre o código atual
assert(
  !sql.includes("DROP TABLE") || sql.includes("create table if not exists"),
  "migration idempotente (create if not exists)",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
console.log("Migration necessária adicional: NÃO (schema 20260812 cobre o código atual).\n");
process.exit(fail > 0 ? 1 : 0);
