#!/usr/bin/env node
/**
 * Sprint 21.1 — Enterprise Security & RBAC
 * Domínio + contratos de UI · sem I/O · sem auth provider.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALL_PERMISSION_KEYS,
  AccessDeniedError,
  AuthorizationError,
  AUTH_ERROR_CODES,
  PERMISSION_CATALOG,
  PLATFORM_ONLY_PERMISSIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLE_IDS,
  SYSTEM_ROLES,
  assertPermission,
  authorize,
  can,
  cannot,
  createAbility,
  createAuthorizationContext,
  explainAuthorization,
  getPermission,
  getPermissionsForRole,
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasRole,
  isKnownPermission,
  isSystemRole,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  requireRole,
  roleHasPermission,
} from "../lib/rbac/index.ts";

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

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function ctx(partial) {
  return createAuthorizationContext({
    userId: "user-1",
    tenantId: "tenant-a",
    roles: [],
    ...partial,
  });
}

console.log("\nEnterprise RBAC — Sprint 21.1\n");

/* ── Catálogo ─────────────────────────────────────────── */
assert(PERMISSION_CATALOG.length >= 70, "Catálogo: volume mínimo de permissões");
assert(
  ALL_PERMISSION_KEYS.every((k) => k.includes(".")),
  "Catálogo: padrão modulo.acao",
);
assert(
  new Set(ALL_PERMISSION_KEYS).size === ALL_PERMISSION_KEYS.length,
  "Catálogo: sem chaves duplicadas",
);
assert(isKnownPermission("financeiro.editar"), "Catálogo: financeiro.editar conhecido");
assert(!isKnownPermission("financeiro.hack"), "Catálogo: permissão desconhecida");
assert(
  getPermission("estoque.ver_custo")?.risk === "alto",
  "Catálogo: metadados de risco",
);
assert(
  ALL_PERMISSION_KEYS.includes("dashboard.executivo") &&
    ALL_PERMISSION_KEYS.includes("usuarios.atribuir_role") &&
    ALL_PERMISSION_KEYS.includes("auditoria.exportar"),
  "Catálogo: módulos dashboard/usuários/auditoria",
);

/* ── Papéis ───────────────────────────────────────────── */
assert(SYSTEM_ROLE_IDS.length === 13, "Roles: 13 papéis padrão");
assert(
  SYSTEM_ROLES.every((r) => r.type === "system" && r.id && r.name),
  "Roles: metadados completos",
);
assert(isSystemRole("super_admin") && isSystemRole("visualizacao"), "Roles: ids válidos");
assert(!isSystemRole("custom_foo"), "Roles: personalizado ainda não é sistema");
assert(
  SYSTEM_ROLES.find((r) => r.id === "super_admin")?.scope === "platform",
  "Roles: super_admin escopo platform",
);
assert(
  SYSTEM_ROLES.find((r) => r.id === "proprietario")?.scope === "tenant",
  "Roles: proprietario escopo tenant",
);

/* ── Role-permissions ─────────────────────────────────── */
assert(
  ROLE_PERMISSIONS.super_admin.length === ALL_PERMISSION_KEYS.length,
  "Matrix: super_admin = catálogo completo",
);
assert(
  ROLE_PERMISSIONS.proprietario.every(
    (p) => !(PLATFORM_ONLY_PERMISSIONS).includes(p),
  ) || ROLE_PERMISSIONS.proprietario.length < ALL_PERMISSION_KEYS.length,
  "Matrix: proprietario sem permissões exclusivas de plataforma (ou subset)",
);
assert(
  !roleHasPermission("auditor", "financeiro.excluir"),
  "Matrix: auditor sem exclusão financeira",
);
assert(
  roleHasPermission("auditor", "financeiro.visualizar"),
  "Matrix: auditor com leitura financeira",
);
assert(
  !roleHasPermission("visualizacao", "vendas.excluir"),
  "Matrix: visualizacao sem exclusão",
);
assert(
  roleHasPermission("visualizacao", "dashboard.executivo"),
  "Matrix: visualizacao com dashboard",
);
assert(
  roleHasPermission("financeiro", "financeiro.aprovar"),
  "Matrix: financeiro herda aprovar",
);
assert(
  getPermissionsForRole("desconhecido").length === 0,
  "Matrix: role desconhecida = vazio",
);

/* ── Deny-by-default / contexto ───────────────────────── */
assert(
  !can(ctx({ roles: [] }), "financeiro.visualizar"),
  "Deny-by-default: sem roles",
);
assert(
  authorize(null, "financeiro.visualizar").reason === "INVALID_CONTEXT",
  "Contexto inválido: null",
);
assert(
  authorize(undefined, "financeiro.visualizar").reason === "INVALID_CONTEXT",
  "Contexto inválido: undefined",
);
assert(
  authorize(ctx({ userId: "" }), "financeiro.visualizar").reason ===
    "INVALID_CONTEXT",
  "Contexto incompleto: userId vazio",
);
assert(
  authorize(ctx({ roles: ["financeiro"] }), "nao.existe").reason ===
    "UNKNOWN_PERMISSION",
  "Permissão desconhecida negada",
);

/* ── Super admin ──────────────────────────────────────── */
const saTenant = ctx({
  roles: ["super_admin"],
  tenantId: "tenant-a",
  platformScope: false,
});
assert(can(saTenant, "configuracoes.tenant"), "super_admin no tenant: acesso total");
assert(
  !can(
    ctx({ roles: ["super_admin"], tenantId: null, platformScope: false }),
    "financeiro.visualizar",
  ),
  "super_admin sem tenant e sem platformScope: negado",
);
assert(
  can(
    ctx({
      roles: ["super_admin"],
      tenantId: null,
      platformScope: true,
    }),
    "financeiro.visualizar",
  ),
  "super_admin com platformScope: global permitido",
);
assert(
  can(
    ctx({
      roles: ["super_admin"],
      tenantId: "tenant-a",
      platformScope: true,
    }),
    "financeiro.excluir",
    { resourceTenantId: "tenant-b" },
  ),
  "super_admin platformScope: cross-tenant permitido",
);

/* ── Proprietário multi-tenant ────────────────────────── */
const ownerA = ctx({ roles: ["proprietario"], tenantId: "tenant-a" });
assert(can(ownerA, "usuarios.criar"), "proprietario: acesso total no tenant");
assert(
  !can(ownerA, "financeiro.excluir", { resourceTenantId: "tenant-b" }),
  "proprietario: negado em tenant diferente",
);
assert(
  authorize(ownerA, "financeiro.excluir", { resourceTenantId: "tenant-b" })
    .reason === "TENANT_MISMATCH",
  "proprietario: motivo TENANT_MISMATCH",
);

/* ── Auditor / visualização ───────────────────────────── */
const auditor = ctx({ roles: ["auditor"] });
assert(can(auditor, "auditoria.visualizar"), "auditor: leitura auditoria");
assert(cannot(auditor, "vendas.criar"), "auditor: sem criação");
assert(cannot(auditor, "compras.aprovar"), "auditor: sem aprovação");

const viewer = ctx({ roles: ["visualizacao"] });
assert(can(viewer, "os.visualizar"), "visualizacao: leitura OS");
assert(cannot(viewer, "os.excluir"), "visualizacao: sem exclusão");

/* ── Negação explícita / adicional / precedência ─────── */
assert(
  cannot(
    ctx({
      roles: ["financeiro"],
      deniedPermissions: ["financeiro.excluir"],
    }),
    "financeiro.excluir",
  ),
  "Precedência: deny explícito vence role",
);
assert(
  authorize(
    ctx({
      roles: ["financeiro"],
      deniedPermissions: ["financeiro.excluir"],
    }),
    "financeiro.excluir",
  ).reason === "EXPLICIT_DENY",
  "Precedência: reason EXPLICIT_DENY",
);
assert(
  can(
    ctx({
      roles: ["visualizacao"],
      additionalPermissions: ["financeiro.aprovar"],
    }),
    "financeiro.aprovar",
  ),
  "Permissão adicional concede além da role",
);
assert(
  cannot(
    ctx({
      roles: ["visualizacao"],
      additionalPermissions: ["financeiro.aprovar"],
      deniedPermissions: ["financeiro.aprovar"],
    }),
    "financeiro.aprovar",
  ),
  "Precedência: deny explícito vence additional",
);

/* ── Tenant ausente ───────────────────────────────────── */
assert(
  authorize(
    ctx({ roles: ["diretor"], tenantId: null }),
    "dashboard.executivo",
  ).reason === "MISSING_TENANT",
  "tenantId ausente: MISSING_TENANT",
);

/* ── Any / All permissions & roles ────────────────────── */
const fin = ctx({ roles: ["financeiro"] });
assert(
  hasAnyPermission(fin, ["financeiro.visualizar", "estoque.excluir"]),
  "hasAnyPermission: true",
);
assert(
  !hasAllPermissions(fin, ["financeiro.visualizar", "estoque.excluir"]),
  "hasAllPermissions: false",
);
assert(hasAnyRole(fin, ["financeiro", "diretor"]), "hasAnyRole: true");
assert(!hasAllRoles(fin, ["financeiro", "diretor"]), "hasAllRoles: false");
assert(hasRole(fin, "financeiro"), "hasRole: true");
assert(!hasAnyPermission(fin, []), "hasAnyPermission: array vazio = false");
assert(!hasAllPermissions(fin, []), "hasAllPermissions: array vazio = false");
assert(!hasAnyRole(fin, []), "hasAnyRole: array vazio = false");

/* ── Duplicatas / normalização ────────────────────────── */
const dup = createAuthorizationContext({
  userId: "u",
  tenantId: " t1 ",
  roles: ["financeiro", "financeiro", null, "", "comercial"],
  additionalPermissions: ["vendas.criar", "vendas.criar"],
  deniedPermissions: ["vendas.excluir", "vendas.excluir"],
});
assert(dup.tenantId === "t1", "Contexto: trim tenantId");
assert(
  dup.roles.length === 2 &&
    dup.roles.includes("financeiro") &&
    dup.roles.includes("comercial"),
  "Contexto: roles deduplicadas",
);
assert(
  dup.additionalPermissions.length === 1,
  "Contexto: permissões adicionais deduplicadas",
);

const ability = createAbility(dup);
assert(ability.granted.has("financeiro.visualizar"), "Ability: agrega roles");
assert(ability.denied.has("vendas.excluir"), "Ability: denied set");

/* ── Determinismo ─────────────────────────────────────── */
const d1 = authorize(ownerA, "crm.editar");
const d2 = authorize(ownerA, "crm.editar");
assert(
  JSON.stringify(d1) === JSON.stringify(d2),
  "Determinístico: mesma decisão",
);
assert(explainAuthorization(ownerA, "crm.editar").allowed === d1.allowed, "explainAuthorization = authorize");

/* ── Guards / erros ───────────────────────────────────── */
let threw = false;
try {
  requirePermission(viewer, "financeiro.excluir");
} catch (e) {
  threw = e instanceof AccessDeniedError;
  assert(e.code === AUTH_ERROR_CODES.ACCESS_DENIED, "AccessDeniedError: código estável");
  assert(
    !String(e.message).includes("ROLE_PERMISSIONS"),
    "AccessDeniedError: mensagem segura",
  );
}
assert(threw, "requirePermission: lança AccessDeniedError");

assert(
  requirePermission(fin, "financeiro.visualizar") === true,
  "requirePermission: permite",
);

threw = false;
try {
  assertPermission(viewer, "os.excluir");
} catch (e) {
  threw = e instanceof AccessDeniedError;
}
assert(threw, "assertPermission: lança");

threw = false;
try {
  requireAnyPermission(viewer, ["os.excluir", "vendas.excluir"]);
} catch (e) {
  threw = e instanceof AccessDeniedError;
}
assert(threw, "requireAnyPermission: nega");

assert(
  requireAnyPermission(fin, ["estoque.excluir", "financeiro.criar"]) === true,
  "requireAnyPermission: permite",
);

assert(
  requireAllPermissions(fin, ["financeiro.visualizar", "financeiro.criar"]) ===
    true,
  "requireAllPermissions: permite",
);

threw = false;
try {
  requireRole(fin, "diretor");
} catch (e) {
  threw = e instanceof AccessDeniedError && e.reason === "ROLE_REQUIRED";
}
assert(threw, "requireRole: ROLE_REQUIRED");

threw = false;
try {
  requireAnyPermission(fin, []);
} catch (e) {
  threw = e instanceof AuthorizationError;
}
assert(threw, "requireAnyPermission: array vazio → AuthorizationError");

/* ── cannot / can edge ────────────────────────────────── */
assert(cannot(null, "financeiro.visualizar"), "cannot: null context");
assert(cannot(fin, null), "cannot: null permission");
assert(cannot(fin, undefined), "cannot: undefined permission");

/* ── Componentes (contratos de fonte) ─────────────────── */
const gate = read("components/security/permission-gate.tsx");
const roleGate = read("components/security/role-gate.tsx");
const boundary = read("components/security/security-boundary.tsx");
const denied = read("components/security/access-denied.tsx");
const badge = read("components/security/permission-badge.tsx");
const roleBadge = read("components/security/user-role-badge.tsx");
const rbacIndex = read("lib/rbac/index.ts");
const pkg = read("package.json");

assert(
  gate.includes("PermissionGate") &&
    gate.includes("anyOf") &&
    gate.includes("allOf") &&
    gate.includes("fallback"),
  "PermissionGate: API completa",
);
assert(
  roleGate.includes("RoleGate") &&
    roleGate.includes('mode?: "any" | "all"') &&
    roleGate.includes("fallback"),
  "RoleGate: any/all + fallback",
);
assert(
  boundary.includes("SecurityBoundary") &&
    boundary.includes("decision") &&
    boundary.includes("fallback"),
  "SecurityBoundary: decision + fallback",
);
assert(
  denied.includes("AccessDenied") &&
    denied.includes('aria-live="polite"') &&
    denied.includes("Acesso não permitido"),
  "AccessDenied: a11y + mensagem segura",
);
assert(badge.includes("PermissionBadge"), "PermissionBadge presente");
assert(roleBadge.includes("UserRoleBadge"), "UserRoleBadge presente");
// Sprint 29.0 — barrel components/security/index.ts removido (BARREL_POLICY);
// consumidores usam deep imports dos componentes abaixo.
assert(
  !existsSync(join(root, "components/security/index.ts")),
  "security/index barrel removido (deep imports)",
);
assert(
  rbacIndex.includes("authorize") &&
    rbacIndex.includes("createAuthorizationContext") &&
    rbacIndex.includes("AccessDeniedError"),
  "lib/rbac/index exporta API",
);
assert(pkg.includes('"test:rbac"'), "package.json: script test:rbac");

/* ── Arquivos da camada ───────────────────────────────── */
const rbacFiles = [
  "lib/rbac/types.ts",
  "lib/rbac/permissions.ts",
  "lib/rbac/roles.ts",
  "lib/rbac/role-permissions.ts",
  "lib/rbac/policies.ts",
  "lib/rbac/abilities.ts",
  "lib/rbac/authorization.ts",
  "lib/rbac/guards.ts",
  "lib/rbac/context.ts",
  "lib/rbac/errors.ts",
  "lib/rbac/index.ts",
];
for (const f of rbacFiles) {
  assert(read(f).length > 0, `Arquivo presente: ${f}`);
}

assert(
  !rbacIndex.includes("from \"react\"") &&
    !read("lib/rbac/authorization.ts").includes("from \"react\""),
  "lib/rbac: sem dependência de React",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
