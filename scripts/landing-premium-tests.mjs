#!/usr/bin/env node
/**
 * Sprint 25.5.2 — Landing premium contract
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

console.log("\nLanding Premium — Sprint 25.5.2\n");

const files = [
  "app/(marketing)/page.tsx",
  "app/(marketing)/layout.tsx",
  "components/layout/marketing-header.tsx",
  "components/layout/marketing-footer.tsx",
  "components/marketing/hero-section.tsx",
  "components/marketing/features-section.tsx",
  "components/marketing/modules-section.tsx",
  "components/marketing/dashboard-preview-section.tsx",
  "components/marketing/landing-dashboard-preview.tsx",
  "components/marketing/intelligence-section.tsx",
  "components/marketing/segments-section.tsx",
  "components/marketing/value-section.tsx",
  "components/marketing/cta-section.tsx",
];

for (const f of files) {
  assert(existsSync(join(root, f)), `arquivo ${f}`);
}

const header = readFileSync(
  join(root, "components/layout/marketing-header.tsx"),
  "utf8",
);
assert(header.includes("data-landing-header"), "header marker");
assert(header.includes("officialWordmark"), "logo oficial no header");
assert(header.includes("brand-navy") || header.includes("--brand-navy"), "header navy");
assert(!header.includes("brand-white"), "header sem fundo claro legado");
assert(header.includes("Começar grátis"), "CTA começar");
assert(header.includes("/login"), "link entrar");

const hero = readFileSync(
  join(root, "components/marketing/hero-section.tsx"),
  "utf8",
);
assert(hero.includes("Controle total da sua empresa"), "headline hero");
assert(hero.includes("LandingDashboardPreview"), "preview no hero");
assert(hero.includes("data-landing-block=\"hero\""), "hero marker");

const preview = readFileSync(
  join(root, "components/marketing/landing-dashboard-preview.tsx"),
  "utf8",
);
assert(preview.includes("Demonstração"), "preview marcado como demo");
assert(preview.includes("Central de Inteligência"), "inteligência na preview");
assert(!/Math\.random|faker|lorem/.test(preview), "sem dados fictícios aleatórios");

const page = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8");
assert(page.includes("ModulesSection"), "módulos na page");
assert(page.includes("IntelligenceSection"), "inteligência na page");
assert(page.includes("DashboardPreviewSection"), "preview full na page");
assert(page.includes("ValueSection"), "valor qualitativo");

const layout = readFileSync(join(root, "app/(marketing)/layout.tsx"), "utf8");
assert(layout.includes("data-landing-shell"), "shell landing");
assert(layout.includes("brand-navy"), "shell navy");

const footer = readFileSync(
  join(root, "components/layout/marketing-footer.tsx"),
  "utf8",
);
assert(footer.includes("officialWordmark"), "logo no footer");
assert(footer.includes("data-landing-footer"), "footer marker");
assert(!footer.includes("facebook") && !footer.includes("instagram"), "sem redes inventadas");

const features = readFileSync(
  join(root, "components/marketing/features-section.tsx"),
  "utf8",
);
assert(features.includes("Controle Total"), "pilar controle");
assert(features.includes("Decisões Inteligentes"), "pilar decisões");
assert(features.includes("Resultados Reais"), "pilar resultados");
assert(features.includes("Segurança e Confiança"), "pilar segurança");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
