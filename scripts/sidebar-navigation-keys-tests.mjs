#!/usr/bin/env node
/**
 * Sprint 25.7.2 — Keys estáveis e dedupe da navegação do sidebar.
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

console.log("\nSidebar Navigation Keys — Sprint 25.7.2\n");

const navPath = join(root, "config/navigation.ts");
const sidebarPath = join(root, "components/layout/app-sidebar.tsx");
const helperPath = join(root, "lib/navigation/sidebar-nav.ts");
const themeTogglePath = join(root, "components/brand/theme-toggle.tsx");
const themeProviderPath = join(root, "components/brand/theme-provider.tsx");

assert(existsSync(navPath), "config/navigation.ts");
assert(existsSync(helperPath), "lib/navigation/sidebar-nav.ts");
assert(
  existsSync(join(root, "lib/navigation/sidebar-nav-core.mjs")),
  "sidebar-nav-core.mjs",
);
assert(existsSync(sidebarPath), "app-sidebar.tsx");

const navSrc = readFileSync(navPath, "utf8");
const sidebarSrc = readFileSync(sidebarPath, "utf8");
const helperSrc = readFileSync(helperPath, "utf8");
const toggleSrc = readFileSync(themeTogglePath, "utf8");
const providerSrc = readFileSync(themeProviderPath, "utf8");

assert(navSrc.includes("id:"), "NavItem com campo id");
assert(navSrc.includes("group:"), "NavItem com campo group");
assert(navSrc.includes('id: "analytics"'), "id analytics");
assert(navSrc.includes('id: "analytics-reports"'), "id analytics-reports");
assert(
  navSrc.includes('href: `${base}/analytics/relatorios`'),
  "href relatórios correto",
);
assert(navSrc.includes('id: "mechanics"'), "mecânicos no catálogo");
assert(navSrc.includes('group: "operacao"'), "grupo operação");

assert(helperSrc.includes("validateAndDedupeNavItems"), "validação defensiva");
assert(helperSrc.includes("duplicate_href"), "detecta href duplicado");
assert(helperSrc.includes("duplicate_id"), "detecta id duplicado");
assert(helperSrc.includes("buildSidebarNavGroups"), "agrupamento por group");
assert(helperSrc.includes("sidebarItemKey"), "key group:id");
assert(helperSrc.includes("isNavItemActive"), "active sem falso positivo pai");

assert(sidebarSrc.includes("sidebarItemKey"), "sidebar usa sidebarItemKey");
assert(sidebarSrc.includes("buildSidebarNavGroups"), "sidebar usa groups helper");
assert(sidebarSrc.includes("isNavItemActive"), "sidebar usa isNavItemActive");
assert(!sidebarSrc.includes("key={item.href}"), "sidebar não usa key=href");
assert(!sidebarSrc.includes("byHref("), "sem byHref legado (includes)");
assert(sidebarSrc.includes('data-sidebar-nav-keys="id"'), "marker keys id");

assert(providerSrc.includes("preferenceReady"), "theme preferenceReady");
assert(
  providerSrc.includes("useSyncExternalStore"),
  "theme usa useSyncExternalStore",
);
assert(
  providerSrc.includes("getServerPreferenceSnapshot") ||
    providerSrc.includes("GOF_THEME_DEFAULT"),
  "theme SSR snapshot default",
);
assert(
  !providerSrc.includes("setPreferenceState(readStoredPreference())"),
  "theme sem setState de preferência em effect",
);assert(toggleSrc.includes("preferenceReady"), "toggle usa preferenceReady");
assert(toggleSrc.includes("data-theme-toggle"), "toggle marker");

const runner = `
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Carrega getTenantNav via strip-types indireto: reexport mínimo
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const navMod = await import(pathToFileURL(join(root, "config/navigation.ts")).href);
const core = await import(pathToFileURL(join(root, "lib/navigation/sidebar-nav-core.mjs")).href);

const { getTenantNav } = navMod;
const {
  validateAndDedupeNavItems,
  buildSidebarNavGroups,
  sidebarItemKey,
  isNavItemActive,
} = core;

function assert(cond, msg) {
  if (!cond) { console.error("LOGIC_FAIL", msg); process.exit(2); }
  console.log("LOGIC_PASS", msg);
}

const items = getTenantNav("teste-renato-01");
assert(items.every((i) => i.id && i.href && i.group), "todos itens com id/href/group");
assert(new Set(items.map((i) => i.id)).size === items.length, "ids únicos no catálogo");
assert(new Set(items.map((i) => i.href)).size === items.length, "hrefs únicos no catálogo");

const reports = items.filter((i) => i.href.endsWith("/analytics/relatorios"));
assert(reports.length === 1, "um único Relatórios");
assert(reports[0].id === "analytics-reports", "id analytics-reports");

const analytics = items.filter((i) => i.href.endsWith("/analytics") && !i.href.includes("/relatorios"));
assert(analytics.length === 1, "um único Analytics hub");

const groups = buildSidebarNavGroups(items);
const intel = groups.find((g) => g.id === "inteligencia");
assert(!!intel, "grupo inteligência");
const hrefs = intel.items.map((i) => i.href);
assert(new Set(hrefs).size === hrefs.length, "sem href duplicado no grupo");
assert(
  intel.items.filter((i) => i.href.includes("/analytics/relatorios")).length === 1,
  "Relatórios uma vez no grupo",
);

const keys = intel.items.map((i) => sidebarItemKey(intel.id, i));
assert(new Set(keys).size === keys.length, "keys React únicas");
assert(keys.every((k) => k.includes(":")), "keys no formato group:id");

const pathReports = "/teste-renato-01/analytics/relatorios";
const analyticsItem = intel.items.find((i) => i.id === "analytics");
const reportsItem = intel.items.find((i) => i.id === "analytics-reports");
assert(isNavItemActive(pathReports, reportsItem, intel.items), "Relatórios ativo na rota");
assert(!isNavItemActive(pathReports, analyticsItem, intel.items), "Analytics não falso-ativo");

const dupHref = validateAndDedupeNavItems([
  ...items.slice(0, 2),
  { ...items[0], id: "dup-href-id", title: "Dup" },
]);
assert(!dupHref.ok, "detecta href duplicado injetado");
assert(dupHref.issues.some((i) => i.code === "duplicate_href"), "código duplicate_href");
assert(dupHref.items.length === 2, "dedupe mantém primeira ocorrência");

const dupId = validateAndDedupeNavItems([
  items[0],
  { ...items[1], id: items[0].id },
]);
assert(dupId.issues.some((i) => i.code === "duplicate_id"), "detecta id duplicado");

const missing = validateAndDedupeNavItems([
  { id: "", title: "X", href: "/x", icon: items[0].icon, group: "principal" },
]);
assert(missing.issues.some((i) => i.code === "missing_id"), "detecta missing id");

const ops = groups.find((g) => g.id === "operacao");
assert(ops.items.some((i) => i.id === "mechanics"), "mecânicos no grupo operação");

console.log("LOGIC_DONE");
`;

const tmp = join(root, "scripts", "_sidebar-nav-logic.tmp.mjs");
writeFileSync(tmp, runner);
const res = spawnSync(process.execPath, ["--experimental-strip-types", tmp], {
  cwd: root,
  encoding: "utf8",
});
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
assert(res.status === 0, "lógica runtime (getTenantNav + dedupe)");
assert(String(res.stdout).includes("LOGIC_DONE"), "logic completed");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
