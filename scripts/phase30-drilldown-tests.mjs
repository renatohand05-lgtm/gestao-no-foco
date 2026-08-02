#!/usr/bin/env node
/**
 * Sprint 30.4 — Drill-down UX (offline).
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

console.log("Phase 30.4 — drilldown\n");

const dialog = readFileSync(
  resolve("components/dashboard/cockpit-v2/kpi-drilldown-dialog.tsx"),
  "utf8",
);
const grid = readFileSync(
  resolve("components/dashboard/cockpit-v2/cockpit-kpi-grid.tsx"),
  "utf8",
);

check("dialog role=dialog", /role="dialog"/.test(dialog));
check("dialog aria-modal", /aria-modal="true"/.test(dialog));
check("Escape fecha", /Escape/.test(dialog));
check("foco no fechar", /closeRef|focus\(/.test(dialog));
check("sem router.refresh full page no dialog", !/router\.refresh|window\.location/.test(dialog));
check("grid abre dialog via estado", /useState|setActive/.test(grid));
check("data-cockpit-drilldown", /data-cockpit-drilldown/.test(dialog));

const dre = readFileSync(
  resolve("components/dashboard/cockpit-v2/dre-cash-cards.tsx"),
  "utf8",
);
check("DRE drill-down link", /Drill-down DRE|financeiro\/dre/.test(dre));
check("Caixa abrir fluxo", /Abrir fluxo|fluxo-caixa/.test(dre));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
