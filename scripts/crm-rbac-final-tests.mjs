#!/usr/bin/env node
/**
 * Sprint 25.7.5 — CRM RBAC final (Owner/Admin/Comercial/Financeiro/Operacional/Read-only).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  crmPermissionSatisfied,
  hasCrmViewAccess,
  resolveCrmEffectivePermissions,
} from "../lib/crm/rbac-compat.ts";
import { roleHasPermission, getPermissionsForRole } from "../lib/rbac/role-permissions.ts";

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

console.log("\nCRM RBAC Final — Sprint 25.7.5\n");

assert(roleHasPermission("proprietario", "crm.visualizar"), "catálogo Owner/proprietario crm.visualizar");
assert(roleHasPermission("diretor", "crm.visualizar"), "catálogo Admin/diretor crm.visualizar");
assert(roleHasPermission("comercial", "crm.visualizar"), "Comercial crm.visualizar");
assert(roleHasPermission("comercial", "crm.criar"), "Comercial crm.criar");
assert(!roleHasPermission("financeiro", "crm.visualizar"), "Financeiro SEM crm.visualizar no catálogo");
assert(roleHasPermission("operacoes", "crm.visualizar"), "Operacional pode visualizar CRM");
assert(roleHasPermission("visualizacao", "crm.visualizar"), "Read-only visualiza");
assert(!roleHasPermission("visualizacao", "crm.criar"), "Read-only SEM crm.criar");
assert(!roleHasPermission("visualizacao", "crm.editar"), "Read-only SEM crm.editar");

const owner = resolveCrmEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(owner.source === "compat", "Owner snapshot vazio → compat");
assert(hasCrmViewAccess(owner.permissions), "Owner possui crm.visualizar");
assert(crmPermissionSatisfied(owner.permissions, "crm.criar"), "Owner pode criar");

const admin = resolveCrmEffectivePermissions({
  membershipRole: "admin",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(hasCrmViewAccess(admin.permissions), "Admin possui crm.visualizar");

const comercial = resolveCrmEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["comercial"],
  snapshotPermissions: [],
});
assert(hasCrmViewAccess(comercial.permissions), "Comercial Enterprise → CRM");

const financeiro = resolveCrmEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["financeiro"],
  snapshotPermissions: [],
});
assert(!hasCrmViewAccess(financeiro.permissions), "Financeiro bloqueado no CRM");

const readonly = resolveCrmEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["visualizacao"],
  snapshotPermissions: getPermissionsForRole("visualizacao"),
});
assert(hasCrmViewAccess(readonly.permissions), "Read-only visualiza");
assert(!crmPermissionSatisfied(readonly.permissions, "crm.editar"), "Read-only sem editar");
assert(!crmPermissionSatisfied(readonly.permissions, "crm.pipeline.configurar"), "Read-only sem configurar pipeline");

const memberBlocked = resolveCrmEffectivePermissions({
  membershipRole: "member",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(!hasCrmViewAccess(memberBlocked.permissions), "member sem snapshot NÃO libera CRM");

const actions = readFileSync(join(root, "lib/crm/crm-enterprise-actions.ts"), "utf8");
assert(actions.includes("resolveCrmEffectivePermissions"), "enterprise actions usam compat");
assert(actions.includes("membershipRole: tenant.role"), "passa tenant_members.role");

const corrections = readFileSync(join(root, "lib/crm/crm-corrections-actions.ts"), "utf8");
assert(corrections.includes("resolveCrmEffectivePermissions"), "corrections usam compat");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
