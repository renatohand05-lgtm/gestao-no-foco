#!/usr/bin/env node
/**
 * Sprint 32.1.1 — Environment parity preview × production.
 *
 * Quando o ambiente não deve afetar autorização, resultados são idênticos.
 * Também trava o fallback SecureStore→Supabase e o bootstrap leve do tab layout.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mergeMobileEffectivePermissions } from "../lib/mobile/effective-permissions.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 32.1.1 — environment parity\n");

const rbacMod = await import(
  pathToFileURL(join(root, "packages/rbac-contracts/src/index.ts")).href
);

const sampleInput = {
  membershipRole: "admin",
  snapshotRoles: ["admin"],
  snapshotPermissions: [
    "analytics.financeiro",
    "dashboard.executivo",
    "crm.visualizar",
    "estoque.visualizar",
    "os.visualizar",
  ],
  legacyPermissions: [],
};

function moduleAccess(permissions) {
  return {
    inicio: rbacMod.hasAnyPermission(permissions, [
      "dashboard.executivo",
      "analytics.executivo",
      "dashboard.visualizar",
    ]),
    inteligencia: rbacMod.hasAnyPermission(permissions, [
      "dashboard.executivo",
      "analytics.executivo",
    ]),
    financeiro: rbacMod.hasAnyPermission(permissions, [
      "financeiro.visualizar",
      "financeiro.ver_saldos",
      "financeiro.ver_fluxo_caixa",
      "financeiro.ver_dre",
      "dashboard.financeiro",
      "analytics.financeiro",
    ]),
    operacao: rbacMod.hasAnyPermission(permissions, [
      "os.visualizar",
      "centro_operacoes.visualizar",
    ]),
    estoque: rbacMod.hasAnyPermission(permissions, [
      "estoque.visualizar",
      "produtos.visualizar",
    ]),
    crm: rbacMod.hasAnyPermission(permissions, [
      "crm.visualizar",
      "clientes.visualizar",
    ]),
  };
}

const envs = ["preview", "production"];
const runs = {};
for (const env of envs) {
  process.env.EXPO_PUBLIC_APP_ENV = env;
  const merged = mergeMobileEffectivePermissions(sampleInput);
  runs[env] = {
    permissions: [...merged.permissions].sort(),
    access: moduleAccess(merged.permissions),
    productionMode: process.env.EXPO_PUBLIC_APP_ENV === "production",
  };
}

check(
  "effective permissions idênticas preview × production",
  JSON.stringify(runs.preview.permissions) ===
    JSON.stringify(runs.production.permissions),
);
check(
  "Início acessível igual nos dois envs",
  runs.preview.access.inicio === runs.production.access.inicio &&
    runs.preview.access.inicio === true,
);
check(
  "Inteligência acessível igual nos dois envs",
  runs.preview.access.inteligencia === runs.production.access.inteligencia &&
    runs.preview.access.inteligencia === true,
);
check(
  "Financeiro acessível igual nos dois envs",
  runs.preview.access.financeiro === runs.production.access.financeiro &&
    runs.preview.access.financeiro === true,
);
check(
  "Operação acessível igual nos dois envs",
  runs.preview.access.operacao === runs.production.access.operacao &&
    runs.preview.access.operacao === true,
);
check(
  "Estoque acessível igual nos dois envs",
  runs.preview.access.estoque === runs.production.access.estoque &&
    runs.preview.access.estoque === true,
);
check(
  "CRM acessível igual nos dois envs",
  runs.preview.access.crm === runs.production.access.crm &&
    runs.preview.access.crm === true,
);
check(
  "isProductionMode flag difere (somente mock gate)",
  runs.preview.productionMode === false &&
    runs.production.productionMode === true,
);

const secureSrc = readFileSync(
  join(root, "apps/mobile/src/auth/secure-session.ts"),
  "utf8",
);
check(
  "getAccessToken faz fallback para sessão Supabase",
  secureSrc.includes("token_fallback_supabase") &&
    secureSrc.includes("getSession()"),
);
check(
  "production só rejeita mock.* (não tokens reais)",
  /isProductionMode\(\)[\s\S]*?isMockToken/.test(secureSrc) &&
    secureSrc.includes('token.startsWith("mock.")'),
);

const tenantSrc = readFileSync(
  join(root, "apps/mobile/app/(auth)/tenant.tsx"),
  "utf8",
);
check(
  "tenant NÃO grava permissions: [] em falha",
  !/permissions:\s*perms\.ok\s*\?\s*perms\.data\.permissions\s*:\s*\[\]/.test(
    tenantSrc,
  ) && tenantSrc.includes("permissions_failed"),
);

const layoutSrc = readFileSync(
  join(root, "apps/mobile/app/(app)/_layout.tsx"),
  "utf8",
);
check(
  "tab layout usa perms leves (finance/crm/stock/operacao)",
  layoutSrc.includes('from "@/finance/perms"') &&
    layoutSrc.includes('from "@/crm/perms"') &&
    layoutSrc.includes('from "@/stock/perms"') &&
    layoutSrc.includes('from "@/operacao/perms"') &&
    !layoutSrc.includes("/sections"),
);

for (const mod of ["crm", "stock", "operacao"]) {
  check(
    `${mod}/perms.ts existe (leve)`,
    existsSync(join(root, `apps/mobile/src/${mod}/perms.ts`)),
  );
}

const eas = JSON.parse(
  readFileSync(join(root, "apps/mobile/eas.json"), "utf8"),
);
check(
  "eas production: environment=production, distribution=store, APP_ENV",
  eas.build.production.environment === "production" &&
    eas.build.production.distribution === "store" &&
    eas.build.production.env.EXPO_PUBLIC_APP_ENV === "production",
);
check(
  "eas preview: environment=preview, distribution=internal, APP_ENV",
  eas.build.preview.environment === "preview" &&
    eas.build.preview.distribution === "internal" &&
    eas.build.preview.env.EXPO_PUBLIC_APP_ENV === "preview",
);

const configSrc = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");
check(
  "runtimeVersion hotfix 32.1.1",
  configSrc.includes("1.10.0-hotfix-32.1.1") &&
    configSrc.includes('STARTUP_INTEGRITY = "32.1.1"'),
);

// Nenhuma feature gate de módulo por APP_ENV no src mobile
const gateHits = [];
const srcRoot = join(root, "apps/mobile/src");
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(ent.name)) {
      const s = readFileSync(p, "utf8");
      if (
        /EXPO_PUBLIC_APP_ENV\s*===\s*["']preview["']/.test(s) ||
        /getAppEnv\(\)\s*===\s*["']preview["']/.test(s) ||
        /appEnv\s*===\s*["']preview["']/.test(s)
      ) {
        gateHits.push(p);
      }
    }
  }
}
walk(srcRoot);
check(
  "nenhuma feature gate APP_ENV===preview no src mobile",
  gateHits.length === 0,
);

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
