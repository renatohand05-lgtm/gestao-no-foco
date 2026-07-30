#!/usr/bin/env node
/**
 * Sprint 25.5.2 — Landing responsive contract
 */
import { readFileSync } from "node:fs";
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

console.log("\nLanding Responsive — Sprint 25.5.2\n");

const header = readFileSync(
  join(root, "components/layout/marketing-header.tsx"),
  "utf8",
);
assert(header.includes("lg:hidden"), "hamburger mobile");
assert(header.includes("hidden") && header.includes("lg:flex"), "nav desktop");

const hero = readFileSync(
  join(root, "components/marketing/hero-section.tsx"),
  "utf8",
);
assert(hero.includes("lg:grid-cols-12"), "hero grid desktop");
assert(hero.includes("sm:flex-row"), "CTAs empilháveis");

const preview = readFileSync(
  join(root, "components/marketing/landing-dashboard-preview.tsx"),
  "utf8",
);
assert(preview.includes("sm:grid-cols-3") || preview.includes("lg:grid-cols-6"), "KPIs responsivos");
assert(preview.includes("lg:grid-cols-12"), "main row responsiva");

const segments = readFileSync(
  join(root, "components/marketing/segments-section.tsx"),
  "utf8",
);
assert(segments.includes("overflow-x-auto"), "tabs scroll mobile");

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes("prefers-reduced-motion"), "reduced motion");
assert(globals.includes("landing-fade-up"), "animação hero");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
