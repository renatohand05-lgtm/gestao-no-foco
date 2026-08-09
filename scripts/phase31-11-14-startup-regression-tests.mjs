#!/usr/bin/env node
/**
 * Sprint 31.11.14 — Startup regression (iOS Build 111 hotfix).
 *
 * Prova estática da causa 110→111 e das salvaguardas:
 * 1) FINANCE_VIEW_PERMS vive em módulo leve (sem UI) para o tab layout
 * 2) @gof/rbac-contracts carrega e resolve aliases Financeiro
 * 3) app.config isola runtimeVersion + ON_ERROR_RECOVERY
 * 4) finance-compose não tem import mid-file
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

console.log("\nPhase 31.11.14 — startup regression\n");

const permsPath = join(root, "apps/mobile/src/finance/perms.ts");
const layoutPath = join(root, "apps/mobile/app/(app)/_layout.tsx");
const sectionsPath = join(root, "apps/mobile/src/finance/sections.tsx");
const configPath = join(root, "apps/mobile/app.config.ts");
const composePath = join(root, "lib/mobile/finance-compose.ts");
const rbacPath = join(root, "packages/rbac-contracts/src/index.ts");

check("finance/perms.ts existe", existsSync(permsPath));
const permsSrc = readFileSync(permsPath, "utf8");
check(
  "perms exporta analytics.financeiro + dashboard.financeiro",
  permsSrc.includes("analytics.financeiro") &&
    permsSrc.includes("dashboard.financeiro"),
);
check(
  "perms não importa API client nem design UI",
  !/from\s+["']@\/api\//.test(permsSrc) && !permsSrc.includes("@/design"),
);

const layoutSrc = readFileSync(layoutPath, "utf8");
check(
  "tab layout importa FINANCE_VIEW_PERMS de @/finance/perms",
  layoutSrc.includes('from "@/finance/perms"') &&
    !layoutSrc.includes('from "@/finance/sections"'),
);

const sectionsSrc = readFileSync(sectionsPath, "utf8");
check(
  "sections reexporta perms (compat telas)",
  sectionsSrc.includes('from "@/finance/perms"'),
);

const configSrc = readFileSync(configPath, "utf8");
check(
  "runtimeVersion isolado do cache 1.10.0 da Build 110/111",
  configSrc.includes("1.10.0-startup-31.11.14"),
);
check(
  "updates.checkAutomatically = ON_ERROR_RECOVERY",
  configSrc.includes('checkAutomatically: "ON_ERROR_RECOVERY"'),
);
check(
  "startupIntegrity 31.11.14 embutido no extra",
  configSrc.includes('STARTUP_INTEGRITY = "31.11.14"') &&
    configSrc.includes("startupIntegrity: STARTUP_INTEGRITY"),
);
check(
  "marketing version permanece 1.10.0",
  configSrc.includes('const VERSION = "1.10.0"'),
);

const composeSrc = readFileSync(composePath, "utf8");
const softIdx = composeSrc.indexOf("async function soft");
const importIdx = composeSrc.indexOf(
  'import { financePermissionSatisfied } from "@/lib/finance/shared/rbac-compat"',
);
check(
  "finance-compose: import rbac-compat antes de soft (sem mid-file import)",
  importIdx >= 0 && softIdx >= 0 && importIdx < softIdx,
);
check('finance-compose mantém server-only', composeSrc.includes('import "server-only"'));

const rbacSrc = readFileSync(rbacPath, "utf8");
check(
  "rbac-contracts exporta MOBILE_FINANCE_PERMISSION_ALIASES",
  rbacSrc.includes("MOBILE_FINANCE_PERMISSION_ALIASES"),
);

const rbacMod = await import(
  pathToFileURL(join(root, "packages/rbac-contracts/src/index.ts")).href
);
check(
  "hasPermission(analytics.financeiro → financeiro.visualizar)",
  rbacMod.hasPermission(["analytics.financeiro"], "financeiro.visualizar") ===
    true,
);
check(
  "hasAnyPermission com FINANCE_VIEW_PERMS aliases",
  rbacMod.hasAnyPermission(
    ["analytics.financeiro"],
    [
      "financeiro.visualizar",
      "financeiro.ver_saldos",
      "financeiro.ver_fluxo_caixa",
      "financeiro.ver_dre",
      "dashboard.financeiro",
      "analytics.financeiro",
    ],
  ) === true,
);
check(
  "sem wildcard permissivo em hasPermission([])",
  rbacMod.hasPermission([], "financeiro.visualizar") === false,
);

{
  const ignoreMod = await import("ignore");
  const ignore = ignoreMod.default ?? ignoreMod;
  const eas = readFileSync(join(root, ".easignore"), "utf8");
  check(
    ".easignore usa /app/ (root-only), não app/ solto",
    /^\/app\//m.test(eas) && !/^app\//m.test(eas),
  );
  const ig = ignore().add(eas);
  check(
    "easignore NÃO exclui apps/mobile/app (Expo Router)",
    ig.ignores("apps/mobile/app/_layout.tsx") === false,
  );
  check(
    "easignore ainda exclui app/ web (Next root)",
    ig.ignores("app/layout.tsx") === true,
  );
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
