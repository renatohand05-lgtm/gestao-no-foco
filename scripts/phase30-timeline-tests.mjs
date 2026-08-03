#!/usr/bin/env node
/**
 * Sprint 30.5 — Timeline Premium contract.
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

console.log("Phase 30.5 — timeline\n");

const path = resolve("components/crm/crm-timeline.tsx");
check("timeline file", existsSync(path));
const src = readFileSync(path, "utf8");
check("WhatsApp", /WhatsApp/.test(src));
check("Ligação", /Ligação|ligacao/.test(src));
check("E-mail", /E-mail|email/.test(src));
check("Reunião", /Reunião|reuniao/.test(src));
check("Visita", /Visita/.test(src));
check("Observação", /Observação|observacao/.test(src));
check("Mudança de etapa", /Mudança de etapa|etapa/.test(src));
check("Proposta", /Proposta/.test(src));
check("Ganho/perda", /Ganho|Perda/.test(src));
check("anexo", /Anexo|Paperclip|hasAttachment/.test(src));
check("autor", /autor_nome/.test(src));
check("filtro tipo", /Filtrar timeline|filter/.test(src));
check("empty state", /Nenhuma atividade/.test(src));
check("data-crm-premium", /data-crm-premium="timeline"/.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
