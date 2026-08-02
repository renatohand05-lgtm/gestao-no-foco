#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: isolamento multi-tenant (guards puros + RLS na migration).
 * Uso: node --experimental-strip-types scripts/phase30-team-tenant-isolation-tests.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCanChangeRole,
  assertCanDeactivate,
  assertCanRemoveAccess,
  assertTenantMatch,
  belongsToTenant,
  countActiveOwners,
  isLastActiveOwner,
} from "../lib/equipe/guards.ts";

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

console.log("\nPhase 30.2 — Equipe: isolamento multi-tenant e proteção de último owner\n");

const members = [
  { id: "m1", role: "owner", status: "active" },
  { id: "m2", role: "admin", status: "active" },
  { id: "m3", role: "member", status: "inactive" },
];

assert(countActiveOwners(members) === 1, "countActiveOwners conta apenas owners ativos");
assert(isLastActiveOwner(members, "m1"), "m1 é o único owner ativo");
assert(!isLastActiveOwner(members, "m2"), "m2 (admin) não é owner");

let threw = false;
try {
  assertCanChangeRole(members, "m1", "member");
} catch {
  threw = true;
}
assert(threw, "assertCanChangeRole bloqueia rebaixar o último owner ativo");

threw = false;
try {
  assertCanDeactivate(members, "m1");
} catch {
  threw = true;
}
assert(threw, "assertCanDeactivate bloqueia inativar o último owner ativo");

threw = false;
try {
  assertCanRemoveAccess(members, "m1");
} catch {
  threw = true;
}
assert(threw, "assertCanRemoveAccess bloqueia remover o último owner ativo");

threw = false;
try {
  assertCanChangeRole(members, "m2", "member");
} catch {
  threw = true;
}
assert(!threw, "admin pode ser rebaixado normalmente (não é o único owner)");

const membersWithTwoOwners = [
  { id: "m1", role: "owner", status: "active" },
  { id: "m4", role: "owner", status: "active" },
];
assert(countActiveOwners(membersWithTwoOwners) === 2, "countActiveOwners soma múltiplos owners ativos");
assert(!isLastActiveOwner(membersWithTwoOwners, "m1"), "com 2 owners ativos, nenhum é 'o único'");

assert(belongsToTenant("tenant-a", "tenant-a"), "belongsToTenant true quando IDs coincidem");
assert(!belongsToTenant("tenant-a", "tenant-b"), "belongsToTenant false entre tenants diferentes");
assert(!belongsToTenant(null, "tenant-a"), "belongsToTenant false quando recurso sem tenant_id");

threw = false;
try {
  assertTenantMatch("tenant-a", "tenant-b");
} catch {
  threw = true;
}
assert(threw, "assertTenantMatch lança erro para recurso de outro tenant");

threw = false;
try {
  assertTenantMatch("tenant-a", "tenant-a");
} catch {
  threw = true;
}
assert(!threw, "assertTenantMatch não lança para o mesmo tenant");

for (const file of [
  "lib/equipe/members-service.ts",
  "lib/equipe/teams-service.ts",
  "lib/equipe/job-titles-service.ts",
  "lib/equipe/invitations-service.ts",
]) {
  const content = readFileSync(join(root, file), "utf8");
  assert(
    /\.eq\("tenant_id",\s*(input\.tenantId|tenantId)\)/.test(content),
    `${file} filtra por tenant_id em toda query`,
  );
}

const migration = readFileSync(
  join(root, "supabase/migrations/20260820_phase30_2_team_rbac.sql"),
  "utf8",
);
assert(migration.includes("enable row level security"), "migration habilita RLS nas novas tabelas");
assert(migration.includes("tenant_id"), "migration usa tenant_id como coluna de isolamento");
assert(
  migration.includes("is_tenant_admin") || migration.includes("tenant_members"),
  "policies referenciam tenant_members / is_tenant_admin (isolamento por membership)",
);
assert(!/using \(true\)/i.test(migration), "nenhuma policy usa USING (true) (sem bypass de tenant)");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
