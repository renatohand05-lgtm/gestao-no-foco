#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: matriz de papéis × módulos (SYSTEM_ROLES/RBAC canônico).
 * Uso: node --experimental-strip-types scripts/phase30-roles-tests.mjs
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRolesMatrix,
  countModulesInMatrix,
  findRoleInMatrix,
  membershipRoleToEnterpriseRoles,
} from "../lib/equipe/roles-matrix.ts";
import { SYSTEM_ROLES } from "../lib/rbac/roles.ts";

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

console.log("\nPhase 30.2 — Equipe: matriz de papéis\n");

assert(existsSync(join(root, "components/equipe/roles-matrix-panel.tsx")), "roles-matrix-panel.tsx existe");

const matrix = buildRolesMatrix();

assert(Array.isArray(matrix.roles) && matrix.roles.length === SYSTEM_ROLES.length, "matriz expõe todos os SYSTEM_ROLES");
assert(Array.isArray(matrix.modules) && matrix.modules.length > 0, "matriz agrupa por módulo");
assert(countModulesInMatrix(matrix) === matrix.modules.length, "countModulesInMatrix consistente");

for (const mod of matrix.modules) {
  for (const entry of mod.entries) {
    assert(Array.isArray(entry.rolesGranting), `entry ${entry.permissionKey} tem rolesGranting[]`);
  }
}

const proprietario = findRoleInMatrix(matrix, "proprietario");
const superAdmin = findRoleInMatrix(matrix, "super_admin");
assert(Boolean(proprietario), "proprietario presente na matriz");
assert(Boolean(superAdmin), "super_admin presente na matriz");
if (superAdmin) {
  const superAdminGrantsAll = matrix.modules.every((mod) =>
    mod.entries.every((entry) => entry.rolesGranting.includes("super_admin")),
  );
  assert(superAdminGrantsAll, "super_admin recebe todas as permissões do catálogo (papel máximo)");
}
if (proprietario) {
  const proprietarioMissesOnlyBilling = matrix.modules.every((mod) =>
    mod.entries.every(
      (entry) =>
        entry.rolesGranting.includes("proprietario") ||
        entry.permissionKey === "configuracoes.faturamento",
    ),
  );
  assert(
    proprietarioMissesOnlyBilling,
    "proprietario recebe tudo do tenant, exceto faturamento de plataforma",
  );
}

assert(
  membershipRoleToEnterpriseRoles("owner").includes("proprietario"),
  "membership owner → enterprise proprietario",
);
assert(
  membershipRoleToEnterpriseRoles("admin").includes("diretor"),
  "membership admin → enterprise diretor",
);
assert(
  membershipRoleToEnterpriseRoles("manager").length > 0,
  "membership manager mapeia para algum papel enterprise",
);
assert(
  membershipRoleToEnterpriseRoles("member").length > 0,
  "membership member mapeia para algum papel enterprise (visualização mínima)",
);

// Chamadas repetidas devem ser estáveis (matriz é derivada, não mutável entre chamadas).
const matrix2 = buildRolesMatrix();
assert(
  JSON.stringify(matrix2.roles.map((r) => r.id)) === JSON.stringify(matrix.roles.map((r) => r.id)),
  "buildRolesMatrix é determinística entre chamadas",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
