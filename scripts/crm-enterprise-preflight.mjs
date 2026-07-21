/**
 * Sprint 14 — CRM Enterprise preflight (offline).
 *
 * Uso: npm run test:crm
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const requiredFiles = [
  "lib/crm/constants.ts",
  "lib/crm/actions.ts",
  "lib/crm/cliente-360-service.ts",
  "lib/crm/cliente-timeline-service.ts",
  "lib/crm/cliente-tarefa-service.ts",
  "lib/crm/cliente-agenda-service.ts",
  "lib/crm/crm-funnel-service.ts",
  "types/crm.ts",
  "components/clientes/cliente-workspace.tsx",
  "components/crm/crm-funil-board.tsx",
  "components/crm/crm-dashboard.tsx",
  "app/(app)/[tenant]/clientes/funil/page.tsx",
  "app/(app)/[tenant]/clientes/dashboard/page.tsx",
  "lib/crm/cliente-documento-storage-service.ts",
  "lib/crm/cliente-timeline-merge.ts",
  "components/crm/cliente-documentos-panel.tsx",
  "components/crm/crm-score-badges.tsx",
  "components/crm/crm-rich-editor.tsx",
  "supabase/migrations/20260726_crm_enterprise.sql",
  "docs/architecture/CRM_ENTERPRISE_14.md",
];

let pass = 0;
let fail = 0;

function ok(msg) {
  pass += 1;
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  fail += 1;
  console.error(` FAIL ${msg}`);
}

console.log("CRM Enterprise — preflight\n");

for (const rel of requiredFiles) {
  if (existsSync(resolve(root, rel))) ok(rel);
  else bad(`missing: ${rel}`);
}

const migration = readFileSync(
  resolve(root, "supabase/migrations/20260726_crm_enterprise.sql"),
  "utf8",
);

for (const table of ["cliente_eventos", "cliente_tarefas", "cliente_agendamentos"]) {
  if (migration.includes(`create table if not exists public.${table}`)) {
    ok(`migration table ${table}`);
  } else {
    bad(`migration missing table ${table}`);
  }
}

for (const col of ["classificacao", "score", "consultor_id", "estagio_funil"]) {
  if (migration.includes(col)) ok(`migration column clientes.${col}`);
  else bad(`migration missing column ${col}`);
}

const constants = readFileSync(resolve(root, "lib/crm/constants.ts"), "utf8");
for (const stage of ["lead", "contato", "proposta", "negociacao", "fechado", "perdido"]) {
  if (constants.includes(`"${stage}"`)) ok(`funil stage ${stage}`);
  else bad(`missing funil stage ${stage}`);
}

for (const tag of ["vip", "garantia", "frota", "inadimplente"]) {
  if (constants.includes(`slug: "${tag}"`)) ok(`default tag ${tag}`);
  else bad(`missing default tag ${tag}`);
}

console.log(`\nPASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
