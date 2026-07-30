#!/usr/bin/env node
/**
 * Sprint 25.7.3 — RBAC Owner/Admin → Dashboard Executivo / Analytics.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyticsRbacPermissionSatisfied,
  expandAnalyticsPermissions,
  mapMembershipRoleToEnterpriseRoles,
  resolveAnalyticsEffectivePermissions,
} from "../lib/analytics/rbac-compat.ts";
import { roleHasPermission } from "../lib/rbac/role-permissions.ts";

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

const REQUIRED = [
  "analytics.visualizar",
  "analytics.executivo",
  "dashboard.executivo",
];

console.log("\nAnalytics RBAC Owner — Sprint 25.7.3\n");

assert(
  mapMembershipRoleToEnterpriseRoles("owner").includes("proprietario"),
  "owner → proprietario",
);
assert(
  mapMembershipRoleToEnterpriseRoles("admin").includes("diretor"),
  "admin → diretor",
);
assert(
  mapMembershipRoleToEnterpriseRoles("member").length === 0,
  "member sem over-grant analytics",
);
assert(
  mapMembershipRoleToEnterpriseRoles("manager").length === 0,
  "manager sem over-grant analytics",
);

assert(
  roleHasPermission("proprietario", "analytics.visualizar"),
  "catálogo proprietario tem analytics.visualizar",
);
assert(
  roleHasPermission("proprietario", "analytics.executivo"),
  "catálogo proprietario tem analytics.executivo",
);
assert(
  roleHasPermission("proprietario", "dashboard.executivo"),
  "catálogo proprietario tem dashboard.executivo",
);
assert(
  roleHasPermission("diretor", "dashboard.executivo"),
  "catálogo diretor tem dashboard.executivo",
);

const ownerEmpty = resolveAnalyticsEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(ownerEmpty.source === "compat", "owner snapshot vazio → compat");
assert(
  ownerEmpty.roles.includes("proprietario"),
  "owner recebe role proprietario",
);
for (const p of REQUIRED) {
  assert(
    analyticsRbacPermissionSatisfied(ownerEmpty.permissions, p) ||
      ownerEmpty.permissions.includes(p),
    `Owner (snapshot vazio) possui ${p}`,
  );
}

const adminEmpty = resolveAnalyticsEffectivePermissions({
  membershipRole: "admin",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(adminEmpty.source === "compat", "admin snapshot vazio → compat");
assert(
  REQUIRED.some((p) => adminEmpty.permissions.includes(p)),
  "Admin possui ao menos uma permissão executiva",
);
assert(
  analyticsRbacPermissionSatisfied(adminEmpty.permissions, REQUIRED),
  "Admin satisfaz any-of executive required",
);

const staleOwner = resolveAnalyticsEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: ["proprietario"],
  snapshotPermissions: [
    "produtos.visualizar",
    "estoque.visualizar",
    "financeiro.visualizar",
  ],
});
assert(
  staleOwner.source === "merged",
  "Owner com snapshot parcial (sem analytics) → merged",
);
for (const p of REQUIRED) {
  assert(
    staleOwner.permissions.includes(p),
    `Owner snapshot parcial recebe ${p}`,
  );
}

const memberBlocked = resolveAnalyticsEffectivePermissions({
  membershipRole: "member",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  !analyticsRbacPermissionSatisfied(memberBlocked.permissions, REQUIRED),
  "member sem snapshot NÃO libera dashboard executivo",
);

const managerBlocked = resolveAnalyticsEffectivePermissions({
  membershipRole: "manager",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  !analyticsRbacPermissionSatisfied(managerBlocked.permissions, REQUIRED),
  "manager sem snapshot NÃO libera dashboard executivo",
);

const visualizacaoSnap = resolveAnalyticsEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["visualizacao"],
  snapshotPermissions: [],
});
assert(
  analyticsRbacPermissionSatisfied(visualizacaoSnap.permissions, REQUIRED),
  "papel visualizacao (Enterprise) libera executivo",
);

const expanded = expandAnalyticsPermissions(["dashboard.executivo"]);
assert(
  expanded.includes("analytics.executivo"),
  "dashboard.executivo implica analytics.executivo",
);
assert(
  expanded.includes("analytics.visualizar"),
  "dashboard.executivo implica analytics.visualizar",
);

assert(
  !analyticsRbacPermissionSatisfied(
    ["produtos.visualizar"],
    "analytics.visualizar",
  ),
  "produtos.visualizar NÃO libera analytics",
);

const actions = readFileSync(
  join(root, "lib/analytics/analytics-actions.ts"),
  "utf8",
);
assert(
  actions.includes("resolveAnalyticsEffectivePermissions"),
  "actions usam compat RBAC analytics",
);
assert(
  actions.includes("membershipRole: tenant.role"),
  "actions passam tenant_members.role",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
