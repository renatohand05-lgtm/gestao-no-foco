#!/usr/bin/env node
/** Sprint 26.2.1 — Analytics legibility */
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

console.log("\nAnalytics Legibility — Sprint 26.2.1\n");

const dash = readFileSync(
  join(root, "components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
assert(dash.includes("data-analytics-legible"), "marker legible");
assert(dash.includes("data-sprint=\"26.2.1\""), "sprint 26.2.1");
assert(dash.includes("data-analytics-sources-panel"), "painel fontes estrutural");
assert(dash.includes("bg-card"), "fontes em card");
assert(dash.includes("text-foreground"), "título foreground");
assert(dash.includes("Cobertura de dados"), "cobertura preservada");
assert(!dash.includes("#ebe6df"), "sem marfim no analytics");
assert(!/\bAUTORAL\b|\bASSINATURA\b/.test(dash), "sem labels técnicos");

const nav = readFileSync(
  join(root, "components/analytics/analytics-navigation.tsx"),
  "utf8",
);
assert(nav.includes("border-border"), "tabs border sólida");
assert(nav.includes("text-[var(--text-secondary)]"), "tabs secundário forte");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
