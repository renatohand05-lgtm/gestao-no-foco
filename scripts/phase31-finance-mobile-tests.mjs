#!/usr/bin/env node
/**
 * Sprint 31.3 — Financeiro mobile (compose + rotas + home).
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

console.log("\nPhase 31.3 — finance mobile\n");

const compose = join(root, "lib/mobile/finance-compose.ts");
const home = join(root, "apps/mobile/app/(app)/financeiro/index.tsx");
const summaryRoute = join(
  root,
  "app/api/mobile/v1/tenants/[tenantId]/financeiro/summary/route.ts",
);

check("finance-compose existe", existsSync(compose));
check("home financeira existe", existsSync(home));
check("API summary existe", existsSync(summaryRoute));

const src = readFileSync(compose, "utf8");
check("reusa ContaPagarService", /ContaPagarService/.test(src));
check("reusa ContaReceberService", /ContaReceberService/.test(src));
check("reusa FluxoCaixaService", /FluxoCaixaService/.test(src));
check("reusa DreService", /DreService/.test(src));
check("não inventa saldo numérico literal", !/saldoAtual:\s*["']?\d{4,}/.test(src));
check("RBAC financeiro", /financeiro\.visualizar/.test(src));

const homeSrc = readFileSync(home, "utf8");
check("home usa fetchFinanceSummary", /fetchFinanceSummary/.test(homeSrc));
check("home usa React Query", /useQuery/.test(homeSrc));
check("home offline snapshot", /loadFinanceSnapshot|offlineMinutes/.test(homeSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
