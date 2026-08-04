#!/usr/bin/env node
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

console.log("\nPhase 31.3 — cash flow mobile\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const screen = join(root, "apps/mobile/app/(app)/financeiro/fluxo-caixa.tsx");
check("composeCashFlow", /composeCashFlow/.test(compose));
check("usa FluxoCaixaService", /FluxoCaixaService/.test(compose));
check("tela fluxo", existsSync(screen));
check(
  "API route",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/financeiro/cash-flow/route.ts")),
);
const ui = readFileSync(screen, "utf8");
check("prioriza lista sem gráfico first paint", /sem gráfico|FlatList|lista/i.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
