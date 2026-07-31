#!/usr/bin/env node
/** Sprint 26.2.1 — Dark theme identity (navy + gold controlado) */
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

console.log("\nDark Theme Identity — Sprint 26.2.1\n");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes(".dark"), "bloco .dark");
assert(css.includes("--background: #0b0f14"), "fundo navy profundo");
assert(css.includes("--card: #151a22"), "card grafite");
assert(css.includes("--primary: #c9a84c"), "dourado");
assert(css.includes("--success: #4ade80") || css.includes("--success:"), "verde sucesso");
assert(css.includes("--danger:") || css.includes("--destructive:"), "vermelho risco");
assert(css.includes("--text-primary: #f5f7fa"), "texto claro");
assert(css.includes("--text-secondary: #c8cdd5"), "secundário legível");
assert(css.includes("--brand-graphite-elevated") || css.includes("brand-graphite"), "grafite elevado");
assert(css.includes("--gf-surface-elevated: var(--brand-graphite-elevated)"), "elevated dark");

const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("var(--brand-gold)"), "linha dourada");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
