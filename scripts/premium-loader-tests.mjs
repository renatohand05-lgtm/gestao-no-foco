#!/usr/bin/env node
/** Sprint 25.6.2 — PremiumGlobalLoader contract */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("\nPremium Loader — Sprint 25.6.2\n");

const loaderPath = join(root, "components/brand/premium-global-loader.tsx");
assert(existsSync(loaderPath), "componente PremiumGlobalLoader");
const loader = readFileSync(loaderPath, "utf8");

assert(loader.includes("data-premium-global-loader"), "marker global loader");
assert(loader.includes("data-premium-loader-mark"), "marker do G");
assert(loader.includes("icon192") || loader.includes("icon-192"), "asset oficial icon192");
assert(loader.includes("sr-only"), "texto acessível invisível");
assert(loader.includes('role="status"'), "role status");
assert(loader.includes('aria-live="polite"'), "aria-live");
assert(loader.includes("clamp(3.5rem"), "tamanho responsivo clamp");
assert(loader.includes("brand-navy"), "fundo navy");
assert(!loader.includes("brandConfig.slogan"), "sem slogan");
assert(!loader.includes("brandConfig.edition"), "sem Enterprise");
assert(!loader.includes("Loader2"), "sem spinner genérico");
assert(!/Carregando dashboard/.test(loader), "sem texto visual Carregando dashboard");

const splash = readFileSync(join(root, "components/brand/brand-splash.tsx"), "utf8");
assert(splash.includes("PremiumGlobalLoader"), "BrandSplash delega ao loader");
assert(!splash.includes("brandConfig.slogan"), "BrandSplash sem slogan");
assert(!splash.includes("brand-progress"), "BrandSplash sem barra");

const route = readFileSync(join(root, "components/layout/route-loading.tsx"), "utf8");
assert(route.includes("PremiumGlobalLoader"), "RouteLoading unificado");

const global = readFileSync(join(root, "components/platform/global-loader.tsx"), "utf8");
assert(global.includes("PremiumGlobalLoader"), "GlobalLoader unificado");
assert(!global.includes("Loader2"), "GlobalLoader sem spinner");
assert(global.includes("minVisibleMs"), "mínimo visual anti-flicker");
assert(global.includes("premium-loader-exit") || global.includes("exiting"), "fade-out");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("premium-loader-halo"), "halo CSS");
assert(css.includes("premium-loader-pulse"), "pulso CSS");
assert(css.includes("@media (prefers-reduced-motion: reduce)"), "reduced motion");
assert(css.includes(".premium-loader-halo") && css.includes("animation: none"), "halo parado em reduced motion");

const loaders = [
  "app/loading.tsx",
  "app/(auth)/loading.tsx",
  "app/(app)/[tenant]/loading.tsx",
  "app/(app)/[tenant]/dashboard/loading.tsx",
  "app/(app)/[tenant]/financeiro/loading.tsx",
  "app/(app)/[tenant]/vendas/loading.tsx",
];
for (const f of loaders) {
  const src = readFileSync(join(root, f), "utf8");
  assert(src.includes("PremiumGlobalLoader"), `rota ${f}`);
  assert(!src.includes("Carregando dashboard"), `${f} sem texto dashboard`);
}

const stream = readFileSync(
  join(root, "components/dashboard/dashboard-streaming.tsx"),
  "utf8",
);
assert(stream.includes("PremiumGlobalLoader"), "DashboardExecutiveLoading");
assert(
  /DashboardExecutiveLoading[\s\S]*?PremiumGlobalLoader/.test(stream),
  "DashboardExecutiveLoading usa PremiumGlobalLoader",
);
assert(
  !/DashboardExecutiveLoading[\s\S]{0,200}Carregando dashboard/.test(stream),
  "DashboardExecutiveLoading sem texto dashboard",
);

const skeleton = readFileSync(join(root, "components/ui/skeleton-card.tsx"), "utf8");
assert(existsSync(join(root, "components/ui/skeleton-card.tsx")), "skeleton local preservado");
assert(skeleton.includes("Skeleton") || skeleton.includes("skeleton"), "loading local existe");

const brandIdx = readFileSync(join(root, "components/brand/index.ts"), "utf8");
assert(brandIdx.includes("PremiumGlobalLoader"), "export brand barrel");

assert(existsSync(join(root, "public/brand/icon-192.png")), "PNG alta resolução");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
