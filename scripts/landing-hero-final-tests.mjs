#!/usr/bin/env node
/** Sprint 25.6.1 — Landing hero final */
import { readFileSync } from "node:fs";
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

console.log("\nLanding Hero Final — Sprint 25.6.1\n");

const hero = readFileSync(
  join(root, "components/marketing/hero-section.tsx"),
  "utf8",
);
assert(hero.includes('data-landing-hero-final=""'), "marker hero final");
assert(hero.includes("BrandLogo"), "logo oficial no hero");
assert(hero.includes("officialWordmark"), "wordmark oficial");
assert(hero.includes("LandingDashboardPreview"), "preview dashboard");
assert(hero.includes("Começar grátis"), "CTA principal");
assert(hero.includes("/login"), "CTA secundário");
assert(hero.includes("Isolamento por empresa"), "prova 1");
assert(hero.includes("Centro de comando"), "prova 2");
assert(hero.includes("métricas reais"), "prova 3");
assert(hero.includes("min-h-[min(88vh"), "primeira dobra com altura");
assert(!hero.includes("icon96"), "não depende só de ícone pequeno");

const preview = readFileSync(
  join(root, "components/marketing/landing-dashboard-preview.tsx"),
  "utf8",
);
assert(preview.includes("Demonstração"), "marcado como demo");
assert(preview.includes("Exemplo"), "valores exemplo explícitos");
assert(preview.includes("whitespace-nowrap"), "KPI demo sem quebra");
assert(!preview.includes("h-3 w-16 rounded bg-white/10"), "sem skeleton bars");

const header = readFileSync(
  join(root, "components/layout/marketing-header.tsx"),
  "utf8",
);
assert(header.includes("officialWordmark"), "header wordmark");
assert(
  header.includes("max-w-[260px]") || header.includes("max-w-[280px]"),
  "logo header com presença",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
