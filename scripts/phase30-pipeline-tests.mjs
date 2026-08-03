#!/usr/bin/env node
/**
 * Sprint 30.5 — Pipeline Premium contract.
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

console.log("Phase 30.5 — pipeline\n");

check("board", existsSync(resolve("components/crm/crm-funil-board.tsx")));
check("funil service", existsSync(resolve("lib/crm/crm-funnel-service.ts")));
check("enrich", existsSync(resolve("lib/crm/premium/pipeline-enrich.ts")));

const board = readFileSync(resolve("components/crm/crm-funil-board.tsx"), "utf8");
check("busca", /Busca|query/.test(board));
check("filtros responsável", /Responsável|ownerFilter/.test(board));
check("colapso", /collapsed|aria-expanded/.test(board));
check("probabilidade", /probabilidade|Prob\./.test(board));
check("score comercial", /commercial_score|Score mín/.test(board));
check("drag drop", /onDrop|draggable/.test(board));
check("soma coluna", /valor_total|formatCurrency/.test(board));
check("a11y search", /role="search"|aria-label="Filtros/.test(board));

const svc = readFileSync(resolve("lib/crm/crm-funnel-service.ts"), "utf8");
check("select premium fields", /valor_estimado|probabilidade|proxima_acao/.test(svc));
check("last contact bulk", /loadLastContactBulk|cliente_eventos/.test(svc));
check("enrichPipelineCardMetrics", /enrichPipelineCardMetrics/.test(svc));

const types = readFileSync(resolve("types/crm.ts"), "utf8");
check("CrmFunilCard premium fields", /commercial_score|tempo_parado_dias/.test(types));

const enrich = readFileSync(resolve("lib/crm/premium/pipeline-enrich.ts"), "utf8");
check("idade/parado", /idadeDias|tempoParadoDias/.test(enrich));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
