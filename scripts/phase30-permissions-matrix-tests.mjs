#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: matriz de permissões x módulos (consistência com catálogo RBAC).
 * Uso: node --experimental-strip-types scripts/phase30-permissions-matrix-tests.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRolesMatrix, countPermissionsInMatrix } from "../lib/equipe/roles-matrix.ts";
import { ALL_PERMISSION_KEYS, PERMISSIONS_BY_MODULE } from "../lib/rbac/permissions.ts";

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

console.log("\nPhase 30.2 — Equipe: matriz de permissões × módulos\n");

const matrix = buildRolesMatrix();

assert(
  matrix.modules.length === Object.keys(PERMISSIONS_BY_MODULE).length,
  "matriz cobre todos os módulos do catálogo PERMISSIONS_BY_MODULE",
);
assert(
  countPermissionsInMatrix(matrix) === ALL_PERMISSION_KEYS.length,
  `matriz cobre as ${ALL_PERMISSION_KEYS.length} permissões do catálogo (sem duplicar/inventar)`,
);

const matrixKeys = new Set(
  matrix.modules.flatMap((mod) => mod.entries.map((entry) => entry.permissionKey)),
);
for (const key of ALL_PERMISSION_KEYS) {
  assert(matrixKeys.has(key), `permissão ${key} presente na matriz`);
}
assert(matrixKeys.size === ALL_PERMISSION_KEYS.length, "sem chaves duplicadas na matriz");

for (const mod of matrix.modules) {
  for (const entry of mod.entries) {
    assert(
      typeof entry.action === "string" && entry.action.length > 0,
      `entry ${entry.permissionKey} tem action`,
    );
    assert(
      typeof entry.risk === "string" && entry.risk.length > 0,
      `entry ${entry.permissionKey} tem risk`,
    );
  }
}

assert(existsSync(join(root, "components/equipe/roles-matrix-panel.tsx")), "roles-matrix-panel.tsx existe");
const panel = readFileSync(join(root, "components/equipe/roles-matrix-panel.tsx"), "utf8");
assert(panel.includes("buildRolesMatrix") === false, "panel recebe matriz via prop (não constrói localmente)");
assert(panel.includes("RolesMatrix"), "panel tipa a matriz recebida (RolesMatrix)");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
