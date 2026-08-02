#!/usr/bin/env node
/**
 * Sprint 30.4 — KPIs presentation contract (offline).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("Phase 30.4 — kpis\n");

const kpis = readFileSync(resolve("lib/dashboard/cockpit-v2/kpis.ts"), "utf8");
const grid = readFileSync(
  resolve("components/dashboard/cockpit-v2/cockpit-kpi-grid.tsx"),
  "utf8",
);
const drill = readFileSync(
  resolve("components/dashboard/cockpit-v2/kpi-drilldown-dialog.tsx"),
  "utf8",
);

for (const id of [
  "faturamento",
  "lucro",
  "caixa",
  "ebitda",
  "margem",
  "clientes",
  "ordens",
  "pendencias",
  "meta",
]) {
  check(`kpi id ${id}`, kpis.includes(`"${id}"`) || kpis.includes(`'${id}'`) || new RegExp(`id: "${id}"`).test(kpis) || kpis.includes(`"${id}"`));
}

check("buildPremiumTopKpis reutilizado", /buildPremiumTopKpis/.test(kpis));
check("comparisonLabel obrigatório", /comparisonLabel/.test(kpis));
check("indisponível explícito", /Indisponível|dado indisponível/i.test(kpis));
check("grid drill-down dialog", /KpiDrilldownDialog/.test(grid));
check("dialog Abrir origem", /Abrir origem/.test(drill));
check("dialog período", /Período|periodoLabel/.test(drill));
check("dialog exportação", /Exportação/.test(drill));
check("grid ARIA label com contexto", /comparisonLabel/.test(grid));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
