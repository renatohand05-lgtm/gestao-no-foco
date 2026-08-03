#!/usr/bin/env node
/**
 * Sprint 30.7 — Builder UI: 8 etapas e marcadores data-*.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

console.log("\nPhase 30.7 — automation builder UI\n");

const uiPath = join(root, "components/automacoes/automacoes-central.tsx");
check("automacoes-central.tsx existe", existsSync(uiPath));
const ui = readFileSync(uiPath, "utf8");

check("data-automacoes-central", /data-automacoes-central=""/.test(ui));
check("data-automacoes-builder", /data-automacoes-builder=""/.test(ui));
check("data-automacoes-templates", /data-automacoes-templates=""/.test(ui));
check("data-automacoes-dry-run", /data-automacoes-dry-run=""/.test(ui));
check("data-automacoes-kpis", /data-automacoes-kpis=""/.test(ui));
check("data-automacoes-rules", /data-automacoes-rules=""/.test(ui));
check("data-automacoes-approvals", /data-automacoes-approvals=""/.test(ui));
check("data-sprint 30.7", /data-sprint="30\.7"/.test(ui));

check("builder 8 etapas copy", /etapa \{builderStep\} de 8/.test(ui));
check("builderStep max 8", /Math\.min\(8/.test(ui));

const stepLabels = [
  "Nome",
  "Módulo",
  "Gatilho",
  "Condições",
  "Ações",
  "Aprovação",
  "Simular",
  "Revisar",
];
for (const label of stepLabels) {
  check(`stepper inclui ${label}`, ui.includes(label));
}
check("8 steps no stepper", stepLabels.filter((l) => ui.includes(l)).length === 8);

check("builderStep === 1..8", [1, 2, 3, 4, 5, 6, 7, 8].every((n) => ui.includes(`builderStep === ${n}`)));
check("aba Builder", /\["builder", "Builder"\]/.test(ui));
check("aba Templates", /\["templates", "Templates"\]/.test(ui));
check("dry-run cenários botão", /Dry-run cenários/.test(ui));

const pagePath = join(root, "app/(app)/[tenant]/automacoes/page.tsx");
check("página automacoes existe", existsSync(pagePath));
const page = readFileSync(pagePath, "utf8");
check("page importa AutomacoesCentral", /AutomacoesCentral/.test(page));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
