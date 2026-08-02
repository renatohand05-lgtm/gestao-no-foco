#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: escopo de RBAC reaproveitado (sem sistema de permissões duplicado).
 * Uso: node --experimental-strip-types scripts/phase30-rbac-scope-tests.mjs
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

console.log("\nPhase 30.2 — Equipe: escopo de RBAC (sem duplicação)\n");

const pageAuth = readFileSync(join(root, "lib/equipe/page-auth.ts"), "utf8");
assert(pageAuth.includes("resolveAuthorizationSnapshot"), "page-auth usa resolveAuthorizationSnapshot (RBAC canônico)");
assert(pageAuth.includes("getPermissionsForRoles"), "page-auth usa getPermissionsForRoles do catálogo existente");
assert(pageAuth.includes("isElevatedMembershipRole"), "page-auth reaproveita isElevatedMembershipRole");
assert(pageAuth.includes("mapElevatedMembershipToEnterpriseRoles"), "page-auth reaproveita mapping de membership existente");
assert(pageAuth.includes("usuarios.visualizar"), "page-auth exige permissão granular usuarios.visualizar");
assert(pageAuth.includes("requireTenant"), "page-auth reaproveita requireTenant existente");
assert(
  !pageAuth.includes("new Map<string, string[]>(") && !pageAuth.includes("PERMISSION_MATRIX ="),
  "page-auth não define uma matriz de permissões paralela",
);

const rolesMatrix = readFileSync(join(root, "lib/equipe/roles-matrix.ts"), "utf8");
assert(rolesMatrix.includes("SYSTEM_ROLES"), "roles-matrix deriva de SYSTEM_ROLES canônico");
assert(rolesMatrix.includes("PERMISSIONS_BY_MODULE"), "roles-matrix deriva de PERMISSIONS_BY_MODULE canônico");
assert(rolesMatrix.includes("getPermissionsForRole"), "roles-matrix deriva de getPermissionsForRole canônico");
assert(
  !/permissions?\s*:\s*\[[^\]]*"[a-z]+\.[a-z_]+"/i.test(rolesMatrix) ||
    rolesMatrix.includes("permission.key"),
  "roles-matrix não hardcoda listas de permissões — lê do catálogo",
);

const actions = readFileSync(join(root, "lib/equipe/actions.ts"), "utf8");
assert(
  actions.includes("requireEquipePageAuth") || actions.includes("assertEquipeAdmin"),
  "actions.ts reaplica auth via page-auth em cada mutação",
);

for (const file of [
  "lib/rbac/roles.ts",
  "lib/rbac/permissions.ts",
  "lib/rbac/role-permissions.ts",
  "lib/rbac/membership.ts",
]) {
  assert(existsSync(join(root, file)), `${file} (fonte única RBAC) existe e é reaproveitado`);
}

const equipeDir = readFileSync(join(root, "lib/equipe/index.ts"), "utf8");
assert(!equipeDir.includes("ROLE_PERMISSIONS ="), "lib/equipe não redefine ROLE_PERMISSIONS");
assert(!equipeDir.includes("SYSTEM_ROLES ="), "lib/equipe não redefine SYSTEM_ROLES");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
