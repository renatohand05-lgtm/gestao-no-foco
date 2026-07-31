#!/usr/bin/env node
/**
 * Sprint 25.7.4 — Encerramento RBAC Dashboard Executivo.
 * Owner / Admin / Financeiro / Operacional + fonte única.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyticsRbacPermissionSatisfied,
  resolveAnalyticsEffectivePermissions,
} from "../lib/analytics/rbac-compat.ts";
import { getTenantNav } from "../config/navigation.ts";
import {
  NAV_ANALYTICS_EXECUTIVE_ANY_OF,
} from "../config/navigation.ts";
import {
  ANALYTICS_VIEW_ANY_OF,
  EXECUTIVE_DASHBOARD_ANY_OF,
  buildAnalyticsAuthContext,
  hasExecutiveDashboardAccess,
  requireAnalyticsPermission,
} from "../lib/rbac/executive-access.ts";
import {
  ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES,
  mapElevatedMembershipToEnterpriseRoles,
} from "../lib/rbac/membership.ts";
import {
  roleHasPermission,
  getPermissionsForRole,
} from "../lib/rbac/role-permissions.ts";
import { AccessDeniedError } from "../lib/rbac/errors.ts";

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

console.log("\nExecutive RBAC Final — Sprint 25.7.4\n");

// Fonte única Owner/Admin
assert(
  ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.owner.includes("proprietario"),
  "fonte única: owner → proprietario",
);
assert(
  ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.admin.includes("diretor"),
  "fonte única: admin → diretor",
);
assert(
  mapElevatedMembershipToEnterpriseRoles("owner").includes("proprietario"),
  "mapElevated owner",
);

// Catálogo por papel
assert(
  roleHasPermission("proprietario", "analytics.executivo") &&
    roleHasPermission("proprietario", "dashboard.executivo"),
  "Owner/proprietario: acesso executivo no catálogo",
);
assert(
  roleHasPermission("diretor", "analytics.executivo") &&
    roleHasPermission("diretor", "dashboard.executivo"),
  "Admin/diretor: acesso executivo no catálogo",
);
assert(
  roleHasPermission("financeiro", "analytics.executivo") &&
    roleHasPermission("financeiro", "dashboard.executivo"),
  "Financeiro: executivo permitido no catálogo",
);
assert(
  !roleHasPermission("operacoes", "dashboard.executivo") &&
    !roleHasPermission("operacoes", "analytics.executivo"),
  "Operacional: SEM dashboard.executivo / analytics.executivo",
);
assert(
  roleHasPermission("operacoes", "analytics.visualizar"),
  "Operacional: pode analytics.visualizar (área), sem executivo",
);

// Compat membership
const owner = resolveAnalyticsEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(hasExecutiveDashboardAccess(owner.permissions), "Owner compat → executivo");

const admin = resolveAnalyticsEffectivePermissions({
  membershipRole: "admin",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(hasExecutiveDashboardAccess(admin.permissions), "Admin compat → executivo");

const financeiroSnap = resolveAnalyticsEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["financeiro"],
  snapshotPermissions: [],
});
assert(
  hasExecutiveDashboardAccess(financeiroSnap.permissions),
  "Financeiro Enterprise → executivo onde permitido",
);

const operacoesSnap = resolveAnalyticsEffectivePermissions({
  membershipRole: null,
  snapshotRoles: ["operacoes"],
  snapshotPermissions: [],
});
assert(
  !hasExecutiveDashboardAccess(operacoesSnap.permissions),
  "Operacional Enterprise → bloqueado no executivo",
);
assert(
  analyticsRbacPermissionSatisfied(
    operacoesSnap.permissions,
    "analytics.visualizar",
  ),
  "Operacional ainda visualiza analytics de área",
);

// Gate: analytics.visualizar sozinho NÃO libera executivo
assert(
  !hasExecutiveDashboardAccess(["analytics.visualizar"]),
  "analytics.visualizar isolado NÃO libera Dashboard Executivo",
);
assert(
  hasExecutiveDashboardAccess(["dashboard.executivo"]),
  "dashboard.executivo libera",
);
assert(
  hasExecutiveDashboardAccess(["analytics.executivo"]),
  "analytics.executivo libera",
);
assert(
  hasExecutiveDashboardAccess(["dashboard.visualizar_executivo"]),
  "alias legado dashboard.visualizar_executivo libera",
);

// requireAnalyticsPermission
const ownerCtx = buildAnalyticsAuthContext({
  userId: "u-owner",
  tenantId: "t1",
  roles: ["proprietario"],
  permissions: owner.permissions,
});
assert(
  requireAnalyticsPermission(ownerCtx, [...EXECUTIVE_DASHBOARD_ANY_OF]) === true,
  "requireAnalyticsPermission: Owner ALLOW",
);

const opsCtx = buildAnalyticsAuthContext({
  userId: "u-ops",
  tenantId: "t1",
  roles: ["operacoes"],
  permissions: getPermissionsForRole("operacoes"),
});
let denied = false;
try {
  requireAnalyticsPermission(opsCtx, [...EXECUTIVE_DASHBOARD_ANY_OF]);
} catch (e) {
  denied = e instanceof AccessDeniedError;
}
assert(denied, "requireAnalyticsPermission: Operacional DENY");

const finCtx = buildAnalyticsAuthContext({
  userId: "u-fin",
  tenantId: "t1",
  roles: ["financeiro"],
  permissions: getPermissionsForRole("financeiro"),
});
assert(
  requireAnalyticsPermission(finCtx, [...EXECUTIVE_DASHBOARD_ANY_OF]) === true,
  "requireAnalyticsPermission: Financeiro ALLOW",
);

// Navigation alinhada à fonte única
const nav = getTenantNav("teste-renato-01");
const analyticsItem = nav.find((i) => i.id === "analytics");
assert(!!analyticsItem, "nav analytics existe");
assert(
  JSON.stringify([...NAV_ANALYTICS_EXECUTIVE_ANY_OF]) ===
    JSON.stringify([...EXECUTIVE_DASHBOARD_ANY_OF]),
  "nav constants ≡ EXECUTIVE_DASHBOARD_ANY_OF (fonte única)",
);
assert(
  analyticsItem.requiredAnyPermissions?.includes("analytics.executivo") &&
    analyticsItem.requiredAnyPermissions?.includes("dashboard.executivo"),
  "nav analytics usa EXECUTIVE_DASHBOARD_ANY_OF",
);
assert(
  EXECUTIVE_DASHBOARD_ANY_OF.every((p) =>
    analyticsItem.requiredAnyPermissions.includes(p),
  ) &&
    analyticsItem.requiredAnyPermissions.length ===
      EXECUTIVE_DASHBOARD_ANY_OF.length,
  "nav hub Analytics ≡ EXECUTIVE_DASHBOARD_ANY_OF (sem over-grant via visualizar)",
);
assert(
  ANALYTICS_VIEW_ANY_OF.includes("analytics.visualizar"),
  "ANALYTICS_VIEW_ANY_OF inclui visualizar",
);

// Wiring actions
const actions = readFileSync(
  join(root, "lib/analytics/analytics-actions.ts"),
  "utf8",
);
assert(
  actions.includes("requireAnalyticsPermission"),
  "actions usam requireAnalyticsPermission",
);
assert(
  actions.includes("executive: true"),
  "getExecutive usa flag executive",
);
assert(
  actions.includes("EXECUTIVE_DASHBOARD_ANY_OF"),
  "actions usam EXECUTIVE_DASHBOARD_ANY_OF",
);

const financeRbac = readFileSync(
  join(root, "lib/finance/shared/rbac.ts"),
  "utf8",
);
assert(
  financeRbac.includes("requireFinancePermission"),
  "requireFinancePermission existe",
);

const rbacIndex = readFileSync(join(root, "lib/rbac/index.ts"), "utf8");
assert(
  rbacIndex.includes("requireAnalyticsPermission"),
  "lib/rbac exporta requireAnalyticsPermission",
);
assert(
  rbacIndex.includes("requirePermission") &&
    rbacIndex.includes("requireAnyPermission"),
  "lib/rbac exporta requirePermission/requireAnyPermission",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
