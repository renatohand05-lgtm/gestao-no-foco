#!/usr/bin/env node
/**
 * Sprint 30.4 — Alerts center contract (offline).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALERT_CATEGORIES,
  ALERT_PRIORITY_ORDER,
} from "../config/dashboard/cockpit-v2.ts";

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

console.log("Phase 30.4 — alerts\n");

check("prioridades 4", ALERT_PRIORITY_ORDER.length === 4);
check("categorias 7", ALERT_CATEGORIES.length === 7);
for (const p of ["critica", "alta", "media", "baixa"]) {
  check(`priority ${p}`, ALERT_PRIORITY_ORDER.includes(p));
}
for (const c of [
  "financeiro",
  "compras",
  "estoque",
  "crm",
  "equipe",
  "operacao",
  "tributario",
]) {
  check(`category ${c}`, ALERT_CATEGORIES.includes(c));
}

const alertsLib = readFileSync(resolve("lib/dashboard/cockpit-v2/alerts.ts"), "utf8");
check("não inventa alerta", /nunca inventa|Somente|já existentes/i.test(alertsLib));
check("filtra indisponível", /indisponível/i.test(alertsLib));
check("suggestedAction", /suggestedAction/.test(alertsLib));

const ui = readFileSync(
  resolve("components/dashboard/cockpit-v2/alerts-center.tsx"),
  "utf8",
);
check("UI sem alertas fictícios copy", /sem alertas fictícios/i.test(ui));
check("UI impacto + ação", /Impacto|suggestedAction/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
