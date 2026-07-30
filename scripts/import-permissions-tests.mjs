#!/usr/bin/env node
/**
 * Sprint 25.4.1 — Permissões de importação (RBAC compat Owner/Admin/Estoque/Read-only).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  catalogImportPermissionSatisfied,
  expandCatalogImportPermissions,
  mapMembershipRoleToEnterpriseRoles,
  resolveCatalogImportEffectivePermissions,
} from "../lib/catalog-import/rbac-compat.ts";
import { getPermissionsForRole } from "../lib/rbac/role-permissions.ts";
import { ROLE_PERMISSIONS } from "../lib/rbac/role-permissions.ts";

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

console.log("\nImport Permissions — Sprint 25.4.1\n");

assert(
  mapMembershipRoleToEnterpriseRoles("owner").includes("proprietario"),
  "owner → proprietario",
);
assert(
  mapMembershipRoleToEnterpriseRoles("admin").includes("diretor"),
  "admin → diretor",
);
assert(
  mapMembershipRoleToEnterpriseRoles("member").includes("visualizacao"),
  "member → visualizacao",
);
assert(mapMembershipRoleToEnterpriseRoles("manager").length === 0, "manager sem over-grant");

const ownerEmptySnap = resolveCatalogImportEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(ownerEmptySnap.source === "compat", "owner snapshot vazio → compat");
assert(
  catalogImportPermissionSatisfied(ownerEmptySnap.permissions, "servicos.importar"),
  "Owner consegue servicos.importar (compat)",
);
assert(
  catalogImportPermissionSatisfied(ownerEmptySnap.permissions, "produtos.importar"),
  "Owner consegue produtos.importar",
);
assert(
  catalogImportPermissionSatisfied(ownerEmptySnap.permissions, "estoque.importar"),
  "Owner consegue estoque.importar",
);

const adminLegacy = resolveCatalogImportEffectivePermissions({
  membershipRole: "admin",
  snapshotRoles: [],
  snapshotPermissions: ["produtos.criar", "produtos.visualizar", "estoque.visualizar"],
});
assert(
  catalogImportPermissionSatisfied(adminLegacy.permissions, [
    "servicos.importar",
    "produtos.criar",
  ]),
  "Admin com produtos.criar satisfaz import de serviços",
);
assert(
  catalogImportPermissionSatisfied(adminLegacy.permissions, "produtos.importar"),
  "produtos.criar implica produtos.importar",
);

const expanded = expandCatalogImportPermissions(["produtos.criar"]);
assert(expanded.includes("produtos.importar"), "expand produtos.importar");
assert(expanded.includes("servicos.importar"), "expand servicos.importar");
assert(expanded.includes("estoque.importar"), "expand estoque.importar via criar");

const estoqueRole = resolveCatalogImportEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["estoque"],
  snapshotPermissions: [],
});
assert(
  catalogImportPermissionSatisfied(estoqueRole.permissions, "produtos.importar"),
  "papel estoque importa produtos",
);
assert(
  catalogImportPermissionSatisfied(estoqueRole.permissions, "estoque.importar") ||
    getPermissionsForRole("estoque").includes("estoque.importar"),
  "papel estoque tem estoque.importar no catálogo",
);

const comprasRole = resolveCatalogImportEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["compras"],
  snapshotPermissions: [],
});
assert(
  catalogImportPermissionSatisfied(comprasRole.permissions, "compras.receber"),
  "compras.receber para NF-e",
);
assert(
  catalogImportPermissionSatisfied(comprasRole.permissions, "estoque.importar"),
  "compras pode estoque.importar",
);

const readonly = resolveCatalogImportEffectivePermissions({
  membershipRole: "member",
  snapshotRoles: ["visualizacao"],
  snapshotPermissions: [],
});
assert(
  !catalogImportPermissionSatisfied(readonly.permissions, "servicos.importar"),
  "read-only bloqueado servicos.importar",
);
assert(
  !catalogImportPermissionSatisfied(readonly.permissions, "produtos.importar"),
  "read-only bloqueado produtos.importar",
);
assert(
  !catalogImportPermissionSatisfied(readonly.permissions, "estoque.importar"),
  "read-only bloqueado estoque.importar",
);
assert(
  catalogImportPermissionSatisfied(readonly.permissions, "produtos.visualizar") ||
    ROLE_PERMISSIONS.visualizacao.includes("produtos.visualizar"),
  "read-only visualiza produtos",
);

const staleOwner = resolveCatalogImportEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: ["proprietario"],
  snapshotPermissions: [
    "produtos.visualizar",
    "estoque.visualizar",
    "financeiro.visualizar",
  ],
});
assert(
  catalogImportPermissionSatisfied(staleOwner.permissions, "servicos.importar"),
  "Owner com snapshot parcial recebe chaves de importação",
);

assert(
  !catalogImportPermissionSatisfied(["produtos.visualizar"], "produtos.importar"),
  "somente visualizar NÃO libera importar",
);
assert(
  !catalogImportPermissionSatisfied(["estoque.visualizar"], "estoque.importar"),
  "estoque.visualizar NÃO implica estoque.importar",
);

const actions = readFileSync(
  join(root, "lib/catalog-import/catalog-import-actions.ts"),
  "utf8",
);
assert(
  actions.includes("resolveCatalogImportEffectivePermissions"),
  "actions usam compat RBAC",
);
assert(
  actions.includes("catalogImportPermissionSatisfied"),
  "actions usam satisfied (não só includes)",
);

const invoice = readFileSync(
  join(root, "lib/catalog-import/invoice-import-actions.ts"),
  "utf8",
);
assert(
  invoice.includes("resolveCatalogImportEffectivePermissions"),
  "invoice auth usa compat",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
