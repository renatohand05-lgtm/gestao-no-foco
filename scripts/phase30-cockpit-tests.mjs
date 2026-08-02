#!/usr/bin/env node
/**
 * Sprint 30.4 — Cockpit blocks (offline).
 */
import { existsSync, readFileSync } from "node:fs";
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

console.log("Phase 30.4 — cockpit\n");

const blocks = [
  "components/dashboard/cockpit-v2/executive-brief-v2.tsx",
  "components/dashboard/cockpit-v2/meta-panel.tsx",
  "components/dashboard/cockpit-v2/dre-cash-cards.tsx",
  "components/dashboard/cockpit-v2/alerts-center.tsx",
  "components/dashboard/cockpit-v2/quick-actions-panel.tsx",
  "components/dashboard/cockpit-v2/empty-states-rail.tsx",
  "components/dashboard/cockpit-v2/kpi-drilldown-dialog.tsx",
];
for (const rel of blocks) check(`block ${rel}`, existsSync(resolve(rel)));

const brief = readFileSync(resolve("components/dashboard/cockpit-v2/executive-brief-v2.tsx"), "utf8");
check("brief dia/semana/mês", /Resumo do dia|brief\.day|periods/.test(brief));
check("brief próxima ação", /Próxima ação|nextAction/.test(brief));

const meta = readFileSync(resolve("components/dashboard/cockpit-v2/meta-panel.tsx"), "utf8");
check("meta progressbar", /role="progressbar"/.test(meta));
check("meta campos", /Projeção|Dias restantes|Valor restante/.test(meta));

const dreCash = readFileSync(resolve("components/dashboard/cockpit-v2/dre-cash-cards.tsx"), "utf8");
check("dre receita/ebitda/margem", /Receita|EBITDA|Margem/.test(dreCash));
check("cash saldo/entradas/saídas", /Saldo atual|Entradas previstas|Saídas previstas/.test(dreCash));

const panels = readFileSync(resolve("lib/dashboard/cockpit-v2/panels.ts"), "utf8");
check("panels não altera dre-service", !/dre-service|fluxo-caixa-service/.test(panels));
check("lucro não inventado", /Ver DRE/.test(panels));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
