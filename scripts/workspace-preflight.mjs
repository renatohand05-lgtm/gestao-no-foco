/**
 * Gate 19.4 — Workspace / landing chrome preflight (offline).
 * Uso: npm run test:workspace
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const requiredFiles = [
  "components/brand/brand-splash.tsx",
  "components/auth/login-form.tsx",
  "components/auth/auth-brand-panel.tsx",
  "components/layout/app-header.tsx",
  "components/executive/workspace/executive-top-bar.tsx",
  "components/executive/workspace/executive-quick-actions.tsx",
  "components/dashboard/dashboard-quick-actions.tsx",
  "components/dashboard/dashboard-workspace-empty.tsx",
  "components/dashboard/resumo-vendas-hoje-cards.tsx",
  "components/ui/empty-state.tsx",
  "components/executive/ExecutiveEmptyState.tsx",
  "config/brand.ts",
];

let pass = 0;
let fail = 0;

function ok(msg) {
  pass += 1;
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  fail += 1;
  console.error(` FAIL ${msg}`);
}

console.log("Workspace / landing — preflight\n");

for (const rel of requiredFiles) {
  if (existsSync(resolve(root, rel))) ok(rel);
  else bad(`missing: ${rel}`);
}

const splash = readFileSync(
  resolve(root, "components/brand/brand-splash.tsx"),
  "utf8",
);
if (splash.includes("brandConfig.slogan")) ok("splash slogan");
else bad("splash missing slogan");
if (splash.includes("brand-progress_1s") || splash.includes("brand-progress_1."))
  ok("splash progress ~1s");
else bad("splash progress timing");
if (splash.includes("brandAssets.logo") || splash.includes("BrandLogo"))
  ok("splash logo");
else bad("splash missing logo");

const login = readFileSync(
  resolve(root, "components/auth/login-form.tsx"),
  "utf8",
);
if (login.includes("autoFocus") || login.includes(".focus()"))
  ok("login autofocus");
else bad("login missing autofocus");
if (login.includes("getPostLoginPath")) ok("login auth path preserved");
else bad("login auth altered unexpectedly");
if (login.includes("humanizeLoginError") || login.includes("AuthAlert"))
  ok("login error UX");
else bad("login error UX missing");

const quick = readFileSync(
  resolve(root, "components/executive/workspace/executive-quick-actions.tsx"),
  "utf8",
);
if (quick.includes("router.push") && !quick.includes("onClick={() => {}}"))
  ok("quick actions wired");
else bad("quick actions still no-op");
if (!quick.includes("bg-blue-600")) ok("quick actions brand (no blue-600)");
else bad("quick actions still blue-600");

const emptyCards = readFileSync(
  resolve(root, "components/dashboard/resumo-vendas-hoje-cards.tsx"),
  "utf8",
);
if (emptyCards.includes("DashboardWorkspaceEmpty"))
  ok("score empty without zero wall");
else bad("score missing workspace empty");

const header = readFileSync(
  resolve(root, "components/layout/app-header.tsx"),
  "utf8",
);
if (!header.includes("Bell")) ok("header without duplicate Bell");
else bad("header still has Bell (duplicated with top bar historically)");

const topBar = readFileSync(
  resolve(root, "components/executive/workspace/executive-top-bar.tsx"),
  "utf8",
);
if (!topBar.includes('icon={Bell}')) ok("top bar without Bell avatar dup");
else bad("top bar still has Bell");
if (!/greeting\s*[?:,]/.test(topBar) && !topBar.includes("greeting={") && !topBar.includes("{greeting"))
  ok("top bar without greeting prop (single source)");
else bad("top bar still renders greeting (duplicate)");
if (!topBar.includes("exAnimations") && !topBar.includes("exTypography"))
  ok("top bar without legacy ex*");
else bad("top bar still uses ex*");

const routeLoading = readFileSync(
  resolve(root, "components/layout/route-loading.tsx"),
  "utf8",
);
if (routeLoading.includes("PremiumGlobalLoader")) ok("RouteLoading = PremiumGlobalLoader");
else bad("RouteLoading not unified to PremiumGlobalLoader");
if (!routeLoading.includes("SkeletonCard")) ok("RouteLoading without SkeletonCard");
else bad("RouteLoading still uses SkeletonCard");

const progressBar = readFileSync(
  resolve(root, "components/onboarding/onboarding-progress-bar.tsx"),
  "utf8",
);
if (!progressBar.includes("bg-blue-600")) ok("onboarding progress without blue-600");
else bad("onboarding progress still blue-600");
if (!progressBar.includes("exTypography") && !progressBar.includes("exAnimations"))
  ok("onboarding progress without ex*");
else bad("onboarding progress still uses ex*");

console.log(`\nResult: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
