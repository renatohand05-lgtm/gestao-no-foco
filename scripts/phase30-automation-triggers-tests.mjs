#!/usr/bin/env node
/**
 * Sprint 30.7 — TRIGGER_CATALOG: gatilhos obrigatórios com dataSource.
 */
import { TRIGGER_CATALOG, getTrigger, triggersByModule } from "../lib/automacoes/triggers.ts";

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

console.log("\nPhase 30.7 — automation triggers\n");

const REQUIRED = [
  "fin.conta_vencida",
  "fin.caixa_projetado_negativo",
  "crm.lead_sem_retorno",
  "crm.oportunidade_parada",
  "ops.os_atrasada",
  "ops.tarefa_vencida",
  "est.estoque_abaixo_minimo",
  "compras.compra_atrasada",
  "metas.meta_abaixo",
  "metas.indicador_critico",
  "intel.risco_novo",
  "tax.obrigacao_proxima",
];

check("TRIGGER_CATALOG >= 30", TRIGGER_CATALOG.length >= 30);
check(
  "todos enabled com dataSource",
  TRIGGER_CATALOG.every(
    (t) => t.enabled && typeof t.dataSource === "string" && t.dataSource.trim().length > 3,
  ),
);
check(
  "todos com fields",
  TRIGGER_CATALOG.every((t) => Array.isArray(t.fields) && t.fields.length >= 1),
);

for (const type of REQUIRED) {
  const tr = getTrigger(type);
  check(`${type} existe`, Boolean(tr));
  check(`${type} dataSource`, Boolean(tr?.dataSource?.trim()));
}

check(
  "triggersByModule financeiro",
  triggersByModule("financeiro").length >= 5,
);
check("triggersByModule crm", triggersByModule("crm").length >= 5);
check("triggersByModule operacao", triggersByModule("operacao").length >= 4);

const dupes = new Set();
let duplicate = false;
for (const t of TRIGGER_CATALOG) {
  if (dupes.has(t.type)) duplicate = true;
  dupes.add(t.type);
}
check("sem tipos duplicados", !duplicate);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
