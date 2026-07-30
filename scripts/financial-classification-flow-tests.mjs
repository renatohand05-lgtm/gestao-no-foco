#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Classificação financeira guiada
 */
import {
  isClassificationComplete,
  resolveSupplierFinanceFlow,
} from "../lib/supply/enterprise/supplier-finance-flow.ts";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nFinancial Classification Flow — Sprint 25.4.3\n");

const pending = resolveSupplierFinanceFlow({
  hasExistingConfig: false,
  existing: null,
  provided: null,
  mode: "pendente",
});
assert(
  pending.apGeneration === "pendente_classificacao",
  "pendente de classificação",
);
assert(/não inventar/i.test(pending.message) || /pendente/i.test(pending.message), "mensagem clara");

const blocked = resolveSupplierFinanceFlow({
  hasExistingConfig: false,
  existing: null,
  provided: {
    categoriaFinanceiraId: null,
    subcategoriaId: null,
    centroCustoId: null,
    grupoDre: null,
    contaContabil: null,
    condicaoPagamento: null,
    formaPagamento: null,
    vencimentoPadraoDias: null,
    rateio: null,
    empresaId: null,
    filialId: null,
  },
  mode: "salvar_padrao",
});
assert(blocked.apGeneration === "blocked", "sem dados = blocked");
assert(!isClassificationComplete(null), "incompleta");

const ready = resolveSupplierFinanceFlow({
  hasExistingConfig: false,
  existing: null,
  provided: {
    categoriaFinanceiraId: "cat-1",
    subcategoriaId: null,
    centroCustoId: "cc-1",
    grupoDre: "despesas",
    contaContabil: "pc-1",
    condicaoPagamento: "30dd",
    formaPagamento: "fp-1",
    vencimentoPadraoDias: 30,
    rateio: null,
    empresaId: null,
    filialId: null,
  },
  mode: "somente_esta_compra",
});
assert(ready.apGeneration === "ready", "pronta com classificação");
assert(/somente nesta compra/i.test(ready.message), "modo desta compra");

const existing = resolveSupplierFinanceFlow({
  hasExistingConfig: true,
  existing: {
    categoriaFinanceiraId: "c",
    subcategoriaId: null,
    centroCustoId: "cc",
    grupoDre: null,
    contaContabil: "p",
    condicaoPagamento: null,
    formaPagamento: null,
    vencimentoPadraoDias: 15,
    rateio: null,
    empresaId: null,
    filialId: null,
  },
  provided: null,
  mode: "pendente",
});
assert(existing.apGeneration === "ready", "usa padrão existente");

assert(
  existsSync(join(root, "components/supply/supplier-finance-guided-client.tsx")),
  "UI guiada presente",
);

const integ = readFileSync(
  join(root, "lib/supply/enterprise/purchase-integration.ts"),
  "utf8",
);
assert(
  integ.includes("resolveSupplierFinanceFlow"),
  "integração compra usa fluxo guiado",
);
assert(
  integ.includes("pendente_classificacao"),
  "status pendente persistido",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
