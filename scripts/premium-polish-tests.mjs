#!/usr/bin/env node
/** Sprint 25.6 — Premium polish contract */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}`); }
}

console.log("\nPremium Polish — Sprint 25.6\n");

assert(existsSync(join(root, "components/dashboard/premium/premium-disclosure.tsx")), "disclosure");
assert(existsSync(join(root, "components/dashboard/premium/premium-dashboard-view.tsx")), "premium view");

const view = readFileSync(join(root, "components/dashboard/premium/premium-dashboard-view.tsx"), "utf8");
assert(view.includes("PremiumDisclosure"), "usa progressive disclosure");
assert(view.includes("data-dashboard-premium-v256"), "marker 25.6");

const kpi = readFileSync(join(root, "components/dashboard/executive/executive-kpi-card.tsx"), "utf8");
assert(!kpi.includes("h-[11.25rem]"), "KPI sem altura fixa cortante");
assert(kpi.includes("break-words") || kpi.includes("text-pretty"), "KPI sem truncate forçado");
assert(!/truncate text-3xl/.test(kpi), "valor KPI sem truncate");

const strip = readFileSync(join(root, "components/dashboard/premium/premium-kpi-strip.tsx"), "utf8");
assert(strip.includes("lg:grid-cols-3"), "KPI grid notebook");
assert(strip.includes("2xl:grid-cols-6"), "KPI grid desktop largo");
assert(strip.includes("whitespace-nowrap"), "KPI valor sem quebra");

const hero = readFileSync(join(root, "components/marketing/hero-section.tsx"), "utf8");
assert(hero.includes("BrandLogo") || hero.includes("officialWordmark"), "logo impacto no hero");
assert(hero.includes("data-landing-hero-final") || hero.includes("lg:py-"), "hero estruturado");

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes("--background: #eef1f5"), "tema claro sofisticado");
assert(globals.includes("--dashboard-max-width"), "tokens dashboard 25.6.1");

const header = readFileSync(join(root, "components/layout/marketing-header.tsx"), "utf8");
assert(header.includes("max-w-[240px]") || header.includes("max-w-[260px]") || header.includes("max-w-[280px]"), "logo landing maior");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
