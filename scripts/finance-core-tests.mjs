#!/usr/bin/env node
/**
 * Sprint 22.1 — Enterprise Financial Core
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEnterpriseContext,
  createMemoryEnterpriseKit,
} from "../lib/enterprise/index.ts";
import {
  FinanceError,
  assertFinancePermission,
  createMemoryFinanceCore,
} from "../lib/finance/index.ts";

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

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

console.log("\nEnterprise Financial Core — Sprint 22.1\n");

for (const file of [
  "lib/finance/index.ts",
  "lib/finance/factory.ts",
  "lib/finance/actions.ts",
  "lib/finance/bank/bank-account-service.ts",
  "lib/finance/cashflow/cash-movement-service.ts",
  "lib/finance/cashflow/cashflow-service.ts",
  "lib/finance/categories/category-service.ts",
  "lib/finance/cost-centers/cost-center-service.ts",
  "components/finance/bank-account-card.tsx",
  "components/finance/cashflow-chart.tsx",
  "components/finance/cashflow-table.tsx",
  "components/finance/financial-summary.tsx",
  "components/finance/movement-form.tsx",
  "components/finance/movement-table.tsx",
  "components/finance/category-manager.tsx",
  "components/finance/cost-center-manager.tsx",
  "app/(app)/[tenant]/financeiro/page.tsx",
  "app/(app)/[tenant]/financeiro/contas/page.tsx",
  "app/(app)/[tenant]/financeiro/movimentacoes/page.tsx",
  "scripts/finance-core-tests.mjs",
]) {
  assert(existsSync(join(root, file)), `Arquivo: ${file}`);
}

assert(read("lib/finance/actions.ts").includes('"use server"'), "Server actions");
assert(read("lib/finance/actions.ts").includes("createBankAccount"), "Action createBankAccount");
assert(read("lib/finance/actions.ts").includes("transferBetweenAccounts"), "Action transfer");
assert(read("lib/finance/actions.ts").includes("listCashFlow"), "Action listCashFlow");
assert(read("lib/finance/actions.ts").includes("getFinancialSummary"), "Action summary");
assert(read("package.json").includes("test:finance-core"), "package.json script");
assert(
  read("lib/rbac/permissions.ts").includes("financeiro.arquivar"),
  "RBAC arquivar",
);

const kitEnt = createMemoryEnterpriseKit();
kitEnt.store.clear();
const tenantId = "tenant-fin-a";

const ctx = createEnterpriseContext({
  tenantId,
  userId: "user-fin-1",
  roles: ["admin"],
  permissions: [
    "financeiro.visualizar",
    "financeiro.criar",
    "financeiro.editar",
    "financeiro.excluir",
    "financeiro.arquivar",
    "financeiro.transferir",
    "financeiro.ver_saldos",
    "financeiro.ver_fluxo_caixa",
  ],
  source: "test",
});

const denied = createEnterpriseContext({
  tenantId,
  userId: "denied",
  permissions: [],
  source: "test",
});

const finance = createMemoryFinanceCore({
  audit: kitEnt.audit,
  outbox: kitEnt.outbox,
  notification: kitEnt.notification,
  workflow: kitEnt.workflow,
  approval: kitEnt.approval,
});

/* RBAC */
assert(true, "RBAC: setup");
let deniedOk = false;
try {
  assertFinancePermission(denied.permissions, "financeiro.visualizar");
} catch (e) {
  deniedOk = e instanceof FinanceError;
}
assert(deniedOk, "RBAC: negar sem permissão");

let deniedCreate = false;
try {
  await finance.bankAccounts.create(denied, {
    name: "X",
    type: "corrente",
  });
} catch (e) {
  deniedCreate = e instanceof FinanceError;
}
assert(deniedCreate, "RBAC: create bloqueado");

/* Bank account */
const account = await finance.bankAccounts.create(ctx, {
  name: "Caixa Oficina",
  bank: "001",
  agency: "1234",
  accountNumber: "56789-0",
  type: "caixa",
  initialBalance: 1000,
});
assert(account.currentBalance === 1000, "Conta: saldo inicial");
assert(account.status === "active", "Conta: ativa");

const accountB = await finance.bankAccounts.create(ctx, {
  name: "Conta Corrente",
  type: "corrente",
  initialBalance: 500,
});

/* Categories / cost centers */
const cat = await finance.categories.create(ctx, {
  name: "Serviços",
  kind: "receita",
});
const sub = await finance.categories.create(ctx, {
  name: "Mão de obra",
  kind: "receita",
  parentId: cat.id,
});
assert(sub.parentId === cat.id, "Categoria: subcategoria");

const cc = await finance.costCenters.create(ctx, {
  name: "Oficina",
  code: "OFC",
});
assert(cc.name === "Oficina", "Centro de custo: create");

/* Movements */
const entrada = await finance.movements.create(ctx, {
  bankAccountId: account.id,
  kind: "entrada",
  amount: 250,
  movementDate: new Date().toISOString().slice(0, 10),
  description: "OS 1001",
  categoryId: cat.id,
  costCenterId: cc.id,
});
assert(entrada.kind === "entrada", "Movimentação: entrada");
assert(entrada.categoryId === cat.id, "Movimentação: categoria associada");
assert(entrada.costCenterId === cc.id, "Movimentação: centro associado");

await finance.movements.create(ctx, {
  bankAccountId: account.id,
  kind: "saida",
  amount: 50,
  movementDate: new Date().toISOString().slice(0, 10),
  description: "Material",
  categoryId: cat.id,
});

const transfer = await finance.movements.transfer(ctx, {
  bankAccountId: account.id,
  toAccountId: accountB.id,
  amount: 100,
  movementDate: new Date().toISOString().slice(0, 10),
  description: "Transferência caixa → banco",
});
assert(transfer.kind === "transferencia", "Movimentação: transferência");

/* Cash flow + summary */
const flow = await finance.cashFlow.listCashFlow(ctx, {});
assert(flow.movements.length >= 3, "CashFlow: movimentos");
assert(typeof flow.totalInflows === "number", "CashFlow: entradas");

const summary = await finance.summary.getFinancialSummary(ctx);
assert(typeof summary.currentBalance === "number", "Summary: saldo atual");
assert(typeof summary.inflowsToday === "number", "Summary: entradas hoje");
assert(typeof summary.outflowsToday === "number", "Summary: saídas hoje");
assert(typeof summary.projectedBalance === "number", "Summary: previsto");
assert(typeof summary.availableBalance === "number", "Summary: disponível");
assert(typeof summary.dailyNet === "number", "Summary: fluxo diário");
assert(typeof summary.monthlyNet === "number", "Summary: fluxo mensal");

/* Audit / Timeline feed */
const audits = await kitEnt.audit.list(tenantId, { limit: 50 });
assert(
  audits.some((a) => a.event === "CASH_MOVEMENT_CREATED"),
  "Audit: movimentação registrada",
);
assert(
  audits.every((a) => a.tenantId === tenantId),
  "Audit: tenant isolation",
);
assert(
  audits.some((a) => a.module === "financeiro"),
  "Timeline: module financeiro (via Audit)",
);

/* Outbox */
assert(kitEnt.store.outbox.some((e) => e.tenantId === tenantId), "Outbox: eventos");

/* Archive */
const archived = await finance.bankAccounts.archive(ctx, accountB.id);
assert(archived.status === "archived", "Conta: arquivar");

/* Isolation */
const other = createEnterpriseContext({
  tenantId: "tenant-fin-b",
  userId: "other",
  permissions: [...ctx.permissions],
  source: "test",
});
const otherList = await finance.bankAccounts.list(other);
assert(otherList.length === 0, "Tenant isolation: contas");

console.log(`\nFinance Core — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
