#!/usr/bin/env node
/**
 * Sprint 31.11.10 — Paridade RBAC Web ↔ Mobile (sem bypass).
 * node --experimental-strip-types scripts/phase31-11-10-rbac-parity-tests.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveAnalyticsEffectivePermissions } from "../lib/analytics/rbac-compat.ts";
import { resolveCrmEffectivePermissions } from "../lib/crm/rbac-compat.ts";
import { resolveFinanceEffectivePermissions } from "../lib/finance/shared/rbac-compat.ts";
import { mergeMobileEffectivePermissions } from "../lib/mobile/effective-permissions.ts";
import {
  expandExecutivePermissionAliases,
  hasExecutiveDashboardAccess,
} from "../lib/rbac/executive-access.ts";
import { resolveSupplyEffectivePermissions } from "../lib/supply/rbac-compat.ts";
import {
  hasAnyPermission,
  MOBILE_EXECUTIVE_DASHBOARD_ANY_OF,
} from "../packages/rbac-contracts/src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

/** Snapshot típico operacional (sem chaves executivas/finance/CRM/estoque). */
const MECANICO_SNAPSHOT = [
  "venda_rapida.criar",
  "venda_rapida.sem_cliente",
  "desconto.aplicar",
  "desconto.aprovar",
  "desconto.abaixo_margem",
  "centro_operacoes.visualizar",
  "centro_operacoes.ver_alertas",
  "os.criar",
  "os.editar",
  "mecanicos.visualizar",
  "mecanicos.apontar_horas",
];

const OPS_ANY = [
  "os.visualizar",
  "centro_operacoes.visualizar",
  "dashboard.operacional",
];
const FINANCE_ANY = [
  "financeiro.visualizar",
  "financeiro.ver_saldos",
  "financeiro.ver_fluxo_caixa",
  "financeiro.ver_dre",
];
const CRM_ANY = [
  "crm.visualizar",
  "crm.dashboard.visualizar",
  "crm.pipeline.visualizar",
  "clientes.visualizar",
];
const STOCK_ANY = [
  "estoque.visualizar",
  "produtos.visualizar",
  "compras.visualizar",
  "fornecedores.visualizar",
];

function canModule(perms, anyOf) {
  return hasAnyPermission(perms, anyOf);
}

console.log("\nPhase 31.11.10 — RBAC parity Web/Mobile\n");

// 1–4: perfil operacional puro (sem bridge de membership elevado)
{
  const clientOnly = expandExecutivePermissionAliases(MECANICO_SNAPSHOT);
  assert(canModule(clientOnly, OPS_ANY), "1. MECANICO → Operação permitida");
  assert(!canModule(clientOnly, FINANCE_ANY), "2. MECANICO → Financeiro negado");
  assert(!canModule(clientOnly, CRM_ANY), "3. MECANICO → CRM negado");
  assert(
    !hasExecutiveDashboardAccess(clientOnly) &&
      !hasAnyPermission(clientOnly, [...MOBILE_EXECUTIVE_DASHBOARD_ANY_OF]),
    "4. MECANICO → Inteligência/Dashboard negada",
  );
}

// 5: executivo (owner + legado visualizar_executivo)
{
  const m = mergeMobileEffectivePermissions({
    membershipRole: "owner",
    snapshotRoles: [],
    snapshotPermissions: [],
    legacyPermissions: [
      "dashboard.visualizar_executivo",
      "centro_operacoes.visualizar",
    ],
  });
  assert(
    hasExecutiveDashboardAccess(m.permissions) &&
      hasAnyPermission(m.permissions, [...MOBILE_EXECUTIVE_DASHBOARD_ANY_OF]),
    "5. perfil executivo autorizado → Dashboard permitido",
  );
}

// 6: financeiro
{
  const m = mergeMobileEffectivePermissions({
    membershipRole: "manager",
    snapshotRoles: ["financeiro"],
    snapshotPermissions: ["financeiro.visualizar"],
    legacyPermissions: [],
  });
  assert(
    canModule(m.permissions, FINANCE_ANY),
    "6. perfil financeiro autorizado → Financeiro permitido",
  );
}

// 7: CRM (admin → diretor)
{
  const m = mergeMobileEffectivePermissions({
    membershipRole: "admin",
    snapshotRoles: [],
    snapshotPermissions: ["os.visualizar"],
    legacyPermissions: [],
  });
  assert(canModule(m.permissions, CRM_ANY), "7. perfil CRM autorizado → CRM permitido");
}

// 8: estoque (owner → proprietario)
{
  const m = mergeMobileEffectivePermissions({
    membershipRole: "owner",
    snapshotRoles: [],
    snapshotPermissions: [],
    legacyPermissions: [],
  });
  assert(
    canModule(m.permissions, STOCK_ANY),
    "8. perfil estoque autorizado → Estoque permitido",
  );
}

// 9: Web ∪ Mobile mesmas chaves efetivas de módulo
{
  const input = {
    membershipRole: "owner",
    snapshotRoles: ["mecanico"],
    snapshotPermissions: MECANICO_SNAPSHOT,
    legacyPermissions: ["dashboard.visualizar_executivo"],
  };
  const mobile = mergeMobileEffectivePermissions(input);
  const webUnion = expandExecutivePermissionAliases([
    ...new Set([
      ...MECANICO_SNAPSHOT,
      "dashboard.visualizar_executivo",
      ...resolveAnalyticsEffectivePermissions(input).permissions,
      ...resolveFinanceEffectivePermissions(input).permissions,
      ...resolveCrmEffectivePermissions(input).permissions,
      ...resolveSupplyEffectivePermissions(input).permissions,
    ]),
  ]);
  assert(
    hasExecutiveDashboardAccess(mobile.permissions) ===
      hasExecutiveDashboardAccess(webUnion) &&
      canModule(mobile.permissions, FINANCE_ANY) ===
        canModule(webUnion, FINANCE_ANY) &&
      canModule(mobile.permissions, CRM_ANY) === canModule(webUnion, CRM_ANY) &&
      canModule(mobile.permissions, STOCK_ANY) ===
        canModule(webUnion, STOCK_ANY),
    "9. mesmo usuário/tenant → Web e Mobile com mesmas permissões efetivas",
  );
}

// 10: troca de membership/tenant recalcula
{
  const opsTenant = expandExecutivePermissionAliases(MECANICO_SNAPSHOT);
  const ownerTenant = mergeMobileEffectivePermissions({
    membershipRole: "owner",
    snapshotPermissions: [],
    legacyPermissions: [],
  });
  assert(
    !hasExecutiveDashboardAccess(opsTenant) &&
      hasExecutiveDashboardAccess(ownerTenant.permissions),
    "10. alteração de tenant → recalcula permissões",
  );
}

// 11: guard servidor preservado (cliente não burla)
{
  const denied = expandExecutivePermissionAliases(MECANICO_SNAPSHOT);
  assert(
    !hasExecutiveDashboardAccess(denied),
    "11. 403 do servidor não pode ser burlado pelo cliente",
  );
  const compose = readFileSync(
    join(root, "lib/mobile/dashboard-compose.ts"),
    "utf8",
  );
  assert(
    /hasExecutiveDashboardAccess/.test(compose) &&
      /FORBIDDEN_EXECUTIVE/.test(compose),
    "11b. compose mantém FORBIDDEN_EXECUTIVE",
  );
}

// 12: logout/login → resolver oficial (sem * hardcode)
{
  const route = readFileSync(
    join(root, "app/api/mobile/v1/tenants/[tenantId]/permissions/route.ts"),
    "utf8",
  );
  const resolver = readFileSync(join(root, "lib/mobile/permissions.ts"), "utf8");
  const merge = readFileSync(
    join(root, "lib/mobile/effective-permissions.ts"),
    "utf8",
  );
  const layout = readFileSync(
    join(root, "apps/mobile/app/(app)/_layout.tsx"),
    "utf8",
  );
  assert(
    /resolveMobilePermissions/.test(route),
    "12. logout/login preserva RBAC (endpoint permissions)",
  );
  assert(
    !/permissions:\s*\[\s*"\*"\s*\]/.test(resolver) &&
      !/permissions:\s*\[\s*"\*"\s*\]/.test(merge) &&
      /mergeMobileEffectivePermissions/.test(merge) &&
      /resolveAnalyticsEffectivePermissions/.test(merge) &&
      /resolveFinanceEffectivePermissions/.test(merge) &&
      /resolveCrmEffectivePermissions/.test(merge) &&
      /resolveSupplyEffectivePermissions/.test(merge),
    "12b. merge Web bridges; sem grant *",
  );
  assert(
    /useHasAnyPermission/.test(layout) &&
      /hrefIf\(canExec\)/.test(layout) &&
      /hrefIfModule\(canCrm/.test(layout),
    "12c. tab bar oculta módulos sem permissão",
  );
}

// Alias legado oficina
{
  assert(
    hasExecutiveDashboardAccess(
      expandExecutivePermissionAliases(["dashboard.visualizar_executivo"]),
    ),
    "alias dashboard.visualizar_executivo → acesso executivo",
  );
  assert(
    hasAnyPermission(["dashboard.visualizar_executivo"], ["dashboard.executivo"]),
    "rbac-contracts reconhece alias no cliente",
  );
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
