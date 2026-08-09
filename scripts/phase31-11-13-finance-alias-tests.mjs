#!/usr/bin/env node
/**
 * Sprint 31.11.13 — Finance aliases Web ↔ Mobile (sem bypass).
 * node --experimental-strip-types scripts/phase31-11-13-finance-alias-tests.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  expandFinancePermissions,
  financePermissionSatisfied,
  resolveFinanceEffectivePermissions,
} from "../lib/finance/shared/rbac-compat.ts";
import { mergeMobileEffectivePermissions } from "../lib/mobile/effective-permissions.ts";
import {
  hasAnyPermission,
  hasPermission,
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

function canViewFinance(permissions) {
  if (permissions.includes("*")) return true;
  return (
    financePermissionSatisfied(permissions, "financeiro.visualizar") ||
    financePermissionSatisfied(permissions, "financeiro.ver_saldos") ||
    financePermissionSatisfied(permissions, "financeiro.ver_fluxo_caixa") ||
    financePermissionSatisfied(permissions, "financeiro.ver_dre")
  );
}

console.log("\nPhase 31.11.13 — finance alias / CRM empty vs error\n");

const FINANCE_VIEW = [
  "financeiro.visualizar",
  "financeiro.ver_saldos",
  "financeiro.ver_fluxo_caixa",
  "financeiro.ver_dre",
  "dashboard.financeiro",
  "analytics.financeiro",
];

{
  const perms = expandFinancePermissions(["analytics.financeiro"]);
  assert(
    canViewFinance(perms) &&
      financePermissionSatisfied(perms, "financeiro.visualizar"),
    "1. analytics.financeiro → Financeiro autorizado (expand)",
  );
  assert(
    hasAnyPermission(["analytics.financeiro"], FINANCE_VIEW),
    "1b. cliente hasAnyPermission com analytics.financeiro",
  );
}

{
  assert(
    !canViewFinance(["os.visualizar", "centro_operacoes.visualizar"]),
    "2. sem permissão financeira → AccessDenied",
  );
}

{
  const m = mergeMobileEffectivePermissions({
    membershipRole: "owner",
    snapshotPermissions: [],
    legacyPermissions: [],
  });
  assert(canViewFinance(m.permissions), "3. owner → Financeiro (Web=Mobile)");
}

{
  assert(
    hasPermission(["dashboard.financeiro"], "financeiro.visualizar"),
    "4. dashboard.financeiro alias → financeiro.visualizar",
  );
  assert(
    hasPermission(["analytics.financeiro"], "financeiro.ver_dre"),
    "4b. analytics.financeiro alias → financeiro.ver_dre",
  );
}

{
  const input = {
    membershipRole: "admin",
    snapshotPermissions: ["analytics.financeiro", "analytics.executivo"],
    legacyPermissions: [],
  };
  const mobile = mergeMobileEffectivePermissions(input);
  const web = resolveFinanceEffectivePermissions(input);
  assert(
    canViewFinance(mobile.permissions) === canViewFinance(web.permissions),
    "5. mesma membership Web/Mobile → mesmo resultado finance",
  );
}

{
  assert(
    !canViewFinance(["centro_operacoes.visualizar"]) &&
      canViewFinance(
        expandFinancePermissions(["analytics.financeiro"]),
      ),
    "6. troca de perfil recalcula finance",
  );
}

{
  const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
  assert(
    /FORBIDDEN_FINANCE/.test(compose) &&
      /financePermissionSatisfied/.test(compose) &&
      /canViewFinance/.test(compose),
    "7. 403 servidor (FORBIDDEN_FINANCE) preservado",
  );
}

{
  const crm = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
  assert(
    /oportunidadesLoadFailed/.test(crm) &&
      !/if \(!opps\.length\) unavailable\.push\("oportunidades"\)/.test(crm),
    "CRM: unavailable só em falha de carga (não lista vazia)",
  );
}

{
  const sections = readFileSync(
    join(root, "apps/mobile/src/finance/sections.tsx"),
    "utf8",
  );
  assert(
    /analytics\.financeiro/.test(sections),
    "FINANCE_VIEW_PERMS inclui analytics.financeiro",
  );
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
