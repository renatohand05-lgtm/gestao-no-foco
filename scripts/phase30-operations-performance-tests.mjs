#!/usr/bin/env node
/**
 * Sprint 30.1 — contratos de performance do Centro de Operações.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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

const page = readFileSync(
  resolve(root, "app/(app)/[tenant]/centro-operacoes/page.tsx"),
  "utf8",
);
const service = readFileSync(
  resolve(root, "lib/operacoes/centro-operacoes-service.ts"),
  "utf8",
);

check("page paraleliza profile + permissões", /Promise\.all\(\[/.test(page));
check("page paraleliza data + prefs", /service\.getData[\s\S]*Promise\.all|Promise\.all\(\[\s*service\.getData/.test(page));
check("getData recebe segment", /segment:\s*tenant\.segment/.test(page));
check("BOARD_ROW_LIMIT reduzido", /BOARD_ROW_LIMIT\s*=\s*120/.test(service));
check("order por updated_at (recente primeiro)", /order\("updated_at"/.test(service));
check("copy multissetorial no service", /getOpsCenterCopy/.test(service));
check("page usa getOpsCenterCopy", /getOpsCenterCopy/.test(page));
check("sem limit 400", !/\.limit\(400\)/.test(service));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
