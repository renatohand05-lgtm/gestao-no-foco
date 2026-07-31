#!/usr/bin/env node
/**
 * Sprint 26.2.1 — Color regression: rejeita marfim/lavado da 26.2;
 * exige paleta 26.1 (frio claro + navy escuro).
 */
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

console.log("\nColor Regression — Sprint 26.2.1\n");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--background: #f0f2f6"), "light bg #f0f2f6");
assert(css.includes("--background: #0b0f14"), "dark bg navy");
assert(css.includes("--primary: #c9a84c"), "gold primary");
assert(css.includes("--brand-gold"), "brand-gold token");
assert(!css.includes("#ebe6df"), "sem #ebe6df");
assert(!css.includes("#fffcf8"), "sem #fffcf8");
assert(!css.includes("#f3efe9"), "sem #f3efe9");
assert(!css.includes("#F4F1EA") && !css.includes("#f4f1ea"), "sem cream genérico");
assert(css.includes("--text-primary: #12151a"), "light text-primary forte");
assert(css.includes("--text-secondary: #3f4754"), "light text-secondary legível");
assert(css.includes("--text-primary: #f5f7fa"), "dark text-primary");
assert(css.includes("--gf-surface-intelligence: var(--card)"), "intel = card");

const chart = readFileSync(
  join(root, "components/gf/gf-revenue-chart.tsx"),
  "utf8",
);
assert(!/Assinatura|AUTORAL|Autoral/.test(chart), "chart sem badge técnico");

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(!/\bAutoral\b|\bAUTORAL\b|\bASSINATURA\b|\bAssinatura\b/.test(main), "main-row sem badge técnico");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
