#!/usr/bin/env node
/**
 * Sprint 25.5.2 — Public brand shell (header/footer/landing)
 */
import { readFileSync, existsSync } from "node:fs";
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

console.log("\nPublic Brand Shell — Sprint 25.5.2\n");

assert(
  existsSync(join(root, "public/brand/logo.svg")),
  "logo.svg",
);
assert(
  existsSync(join(root, "public/brand/icon-64.png")),
  "icon-64",
);
assert(existsSync(join(root, "public/favicon.svg")), "favicon");

const header = readFileSync(
  join(root, "components/layout/marketing-header.tsx"),
  "utf8",
);
assert(header.includes("data-scrolled"), "scroll state header");
assert(header.includes("landing-mobile-nav"), "menu mobile");
assert(header.includes("aria-expanded"), "a11y menu");

const shell = readFileSync(join(root, "app/(marketing)/layout.tsx"), "utf8");
assert(shell.includes("MarketingHeader"), "header no layout");
assert(shell.includes("MarketingFooter"), "footer no layout");

const cta = readFileSync(
  join(root, "components/marketing/cta-section.tsx"),
  "utf8",
);
assert(cta.includes("id=\"cta\"") || cta.includes("id='cta'"), "âncora CTA");
assert(cta.includes("Falar com especialista"), "CTA especialista");
assert(cta.includes("mailto:") || cta.includes("links.support"), "suporte real");

const value = readFileSync(
  join(root, "components/marketing/value-section.tsx"),
  "utf8",
);
assert(!/\d+\s*%|\d{3,}\s*empresas|R\$\s*\d/.test(value), "valor sem métricas inventadas");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
