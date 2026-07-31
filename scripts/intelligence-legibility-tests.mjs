#!/usr/bin/env node
/** Sprint 26.2.1 — Central de Inteligência legibility */
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

console.log("\nIntelligence Legibility — Sprint 26.2.1\n");

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(main.includes("data-intel-panel"), "painel intel");
assert(main.includes("Central de Inteligência"), "título");
assert(main.includes("Top 3"), "top 3");
assert(main.includes("Análise baseada em regras"), "frase dashboard-premium");
assert(main.includes("bg-[var(--card)]"), "fundo card (não lavado)");
assert(main.includes("border-[var(--border)]"), "borda real");
assert(main.includes("text-[var(--text-primary)]"), "título primary");
assert(main.includes("GFInsightCard"), "cards estruturais");

const insight = readFileSync(
  join(root, "components/gf/gf-insight-card.tsx"),
  "utf8",
);
assert(insight.includes("text-[var(--text-primary)]"), "insight title");
assert(insight.includes("text-[var(--text-secondary)]"), "insight body");
assert(insight.includes("severityBorder"), "severidade");
assert(!insight.includes("bg-white/"), "sem white opacity lavada");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--gf-surface-intelligence: var(--card)"), "token intel = card");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
