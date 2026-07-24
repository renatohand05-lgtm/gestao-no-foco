/**
 * Gate 19.5 — Design System showcase preflight (offline).
 * Uso: npm run test:design-system
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const root = resolve(process.cwd());
const t0 = performance.now();

let pass = 0;
let fail = 0;
let skip = 0;

function ok(msg) {
  pass += 1;
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  fail += 1;
  console.error(` FAIL ${msg}`);
}

console.log("Design System — Gate 19.5 preflight\n");

const requiredFiles = [
  "app/(app)/[tenant]/design-system/page.tsx",
  "components/design-system/showcase/design-system-showcase.tsx",
  "components/design-system/README.md",
  "lib/design-system/catalog/showcase-catalog.ts",
  "lib/design-system/foundation.ts",
  "docs/design-system/TOKENS.md",
  "docs/design-system/COMPONENT_GUIDELINES.md",
  "docs/design-system/MIGRATION_GUIDE.md",
  "docs/design-system/LEGACY_COMPONENTS.md",
  "DESIGN_SYSTEM.md",
  "BRAND_GUIDE.md",
  "components/brand/brand-splash.tsx",
  "components/executive/index.ts",
];

for (const rel of requiredFiles) {
  if (existsSync(resolve(root, rel))) ok(rel);
  else bad(`missing: ${rel}`);
}

const catalog = readFileSync(
  resolve(root, "lib/design-system/catalog/showcase-catalog.ts"),
  "utf8",
);
const page = readFileSync(
  resolve(root, "app/(app)/[tenant]/design-system/page.tsx"),
  "utf8",
);
const showcase = readFileSync(
  resolve(root, "components/design-system/showcase/design-system-showcase.tsx"),
  "utf8",
);
const pkg = readFileSync(resolve(root, "package.json"), "utf8");
const foundation = readFileSync(
  resolve(root, "lib/design-system/foundation.ts"),
  "utf8",
);
const execIndex = readFileSync(
  resolve(root, "components/executive/index.ts"),
  "utf8",
);

// Rota / acesso
if (page.includes("requireTenant")) ok("rota usa requireTenant (tenant preserved)");
else bad("rota sem requireTenant");
if (page.includes("SHOWCASE_ACCESS_ROLES") || page.includes("owner"))
  ok("acesso protegido owner/admin");
else bad("acesso não protegido");
if (page.includes("redirect")) ok("redirect se não autorizado");
else bad("sem redirect de negação");
if (!page.includes("createClient") && !page.includes("from(\""))
  ok("página sem queries Supabase");
else bad("página não deve consultar negócio");

// Categorias
const requiredCategories = [
  "brand",
  "foundations",
  "typography",
  "colors",
  "spacing",
  "radius",
  "shadows",
  "motion",
  "icons",
  "buttons",
  "inputs",
  "forms",
  "badges",
  "status",
  "cards",
  "kpis",
  "panels",
  "tables",
  "filters",
  "navigation",
  "header",
  "sidebar",
  "dialogs",
  "drawers",
  "loading",
  "skeletons",
  "empty",
  "errors",
  "charts",
  "executive-blocks",
  "onboarding",
  "legacy",
];

for (const id of requiredCategories) {
  if (catalog.includes(`id: "${id}"`) && showcase.includes(`id="${id}"`))
    ok(`categoria ${id}`);
  else bad(`categoria ausente: ${id}`);
}

// Tokens reais
for (const token of [
  "gofColors",
  "gofTypography",
  "gofSpacing",
  "gofRadius",
  "gofShadow",
  "gofMotion",
]) {
  if (foundation.includes(`export const ${token}`)) ok(`token real ${token}`);
  else bad(`token inventado/ausente: ${token}`);
  if (showcase.includes(token) || catalog.includes(token))
    ok(`token referenciado no showcase/catálogo: ${token}`);
  else bad(`token não demonstrado: ${token}`);
}

// Componentes oficiais listados + existem
const officialNames = [
  "ExecutivePage",
  "ExecutiveHeader",
  "ExecutiveSection",
  "ExecutiveCard",
  "MetricCard",
  "ExecutivePanel",
  "ExecutiveTable",
  "ExecutiveBadge",
  "ExecutiveButton",
  "ExecutiveIconButton",
  "ExecutiveFilter",
  "ExecutiveDivider",
  "ExecutiveLoading",
  "ExecutiveSkeleton",
  "ExecutiveEmptyState",
  "BrandSplash",
];

for (const name of officialNames) {
  if (catalog.includes(`name: "${name}"`)) ok(`catálogo ${name}`);
  else bad(`catálogo missing ${name}`);
  if (execIndex.includes(name) || name.startsWith("Brand"))
    ok(`export/path ${name}`);
  else bad(`componente inexistente documentado: ${name}`);
}

if (existsSync(resolve(root, "components/brand/brand-splash.tsx")))
  ok("BrandSplash file exists");
else bad("BrandSplash missing");

// Preview / playground / variantes / estados / docs / legacy
if (showcase.includes("data-showcase-playground")) ok("playground presente");
else bad("playground ausente");
if (showcase.includes("VIEWPORTS") || showcase.includes("viewport"))
  ok("preview viewport");
else bad("preview viewport ausente");
if (showcase.includes("loading") && showcase.includes("disabled"))
  ok("estados loading/disabled");
else bad("estados incompletos");
if (showcase.includes("tone=") || showcase.includes('tone="success"'))
  ok("variantes de tom");
else bad("variantes ausentes");
if (showcase.includes("DocCard") || showcase.includes("Quando usar"))
  ok("documentação por componente");
else bad("docs por componente ausentes");
if (showcase.includes("data-legacy-audit") || showcase.includes("LEGACY_AUDIT"))
  ok("legacy audit na UI");
else bad("legacy audit ausente");
if (catalog.includes("LEGACY_AUDIT")) ok("legacy audit no catálogo");
else bad("legacy audit catálogo ausente");

// Links internos / âncoras
if (showcase.includes('href={`#${c.id}`}') || showcase.includes('href={`#'))
  ok("links internos de categoria");
else if (showcase.includes('href={`#${') || showcase.includes('href="#') || showcase.includes("href={`#"))
  ok("links internos de categoria");
else if (showcase.includes("`#${c.id}`"))
  ok("links internos de categoria");
else bad("links internos ausentes");

// Sem dados de negócio
if (showcase.includes("data-no-business-data")) ok("flag sem dados de negócio");
else bad("flag no-business-data ausente");
if (
  !showcase.includes("composeExecutive") &&
  !showcase.includes("loadDashboard") &&
  !showcase.includes("createClient")
) {
  ok("showcase sem compose/loaders/supabase");
} else {
  bad("showcase importa motores de negócio");
}

// A11y básica
if (showcase.includes("aria-label") && showcase.includes("aria-pressed"))
  ok("a11y básica (aria)");
else bad("a11y incompleta");
if (showcase.includes("gofFocusRing") || showcase.includes("focus-visible"))
  ok("focus ring");
else bad("focus ring ausente");

// Responsividade
if (showcase.includes("overflow-x-hidden") && showcase.includes("min-w-0"))
  ok("guards responsivos");
else bad("guards responsivos ausentes");
for (const w of [390, 768, 1366, 1440, 1920]) {
  if (catalog.includes(`width: ${w}`) || showcase.includes(String(w)))
    ok(`viewport ${w}`);
  else bad(`viewport ${w} ausente`);
}

// Package script
if (pkg.includes('"test:design-system"')) ok("package.json test:design-system");
else bad("script test:design-system ausente");

// Docs guideline rule
const guidelines = readFileSync(
  resolve(root, "docs/design-system/COMPONENT_GUIDELINES.md"),
  "utf8",
);
if (guidelines.includes("Nenhum componente novo"))
  ok("regra oficial documentada");
else bad("regra oficial ausente nas guidelines");

const ms = Math.round(performance.now() - t0);
console.log(
  `\nResult: ${pass} PASS · ${fail} FAIL · ${skip} SKIP · ${ms}ms`,
);
process.exit(fail > 0 ? 1 : 0);
