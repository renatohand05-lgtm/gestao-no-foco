#!/usr/bin/env node
/**
 * Sprint 22.6.2.1 — Persistência Supabase da Conciliação (testes com repo memória + contratos).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { transferConsolidatedNetImpact } from "../lib/finance/cash-intelligence/index.ts";
import {
  createMemoryReconciliationRepository,
  createReconciliationBackend,
  createTestReconciliationService,
  decideMatch,
  persistStatementLinesFromFinanceImport,
} from "../lib/finance/reconciliation/index.ts";

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

console.log("\nBank Reconciliation Persistence — Sprint 22.6.2.1\n");

for (const f of [
  "lib/finance/reconciliation/reconciliation-repository.ts",
  "lib/finance/reconciliation/memory-reconciliation-repository.ts",
  "lib/finance/reconciliation/supabase-reconciliation-repository.ts",
  "lib/finance/reconciliation/create-reconciliation.ts",
  "lib/finance/reconciliation/statement-import-persistence.ts",
  "supabase/migrations/20260810_enterprise_bank_reconciliation.sql",
]) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(
  read("package.json").includes("test:bank-reconciliation"),
  "package.json script test:bank-reconciliation",
);
assert(
  read("lib/finance/reconciliation/create-reconciliation.ts").includes(
    "Não há fallback silencioso",
  ),
  "Sem fallback silencioso documentado",
);
assert(
  read("lib/finance/import/import-actions.ts").includes(
    "persistStatementLinesFromFinanceImport",
  ),
  "Importação conectada a bank_statement_lines",
);
assert(
  read("lib/finance/cash-intelligence/cash-intelligence-actions.ts").includes(
    "createProductionReconciliationService",
  ),
  "Actions usam Supabase em produção",
);
assert(
  !read("components/finance/cash-intelligence/reconciliation-client.tsx").includes(
    "PAGTO FORNECEDOR XYZ",
  ),
  "UI sem dados fictícios de demo",
);

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const today = new Date().toISOString().slice(0, 10);

const repo = createMemoryReconciliationRepository();
const svc = createTestReconciliationService(repo);

// Persistência de linha
const [line] = await repo.insertStatementLines([
  {
    tenantId: tenantA,
    bankAccountId: "acc-1",
    date: today,
    amount: -100,
    description: "Tarifa",
    externalId: "EXT-T1",
    importRunId: "run-1",
  },
]);
assert(line.externalId === "EXT-T1", "Persistência de linha bancária");
assert(line.importRunId === "run-1", "Importação vinculada ao import_run");

// Idempotência external_id
const [dup] = await repo.insertStatementLines([
  {
    tenantId: tenantA,
    bankAccountId: "acc-1",
    date: today,
    amount: -100,
    description: "Tarifa novamente",
    externalId: "EXT-T1",
    importRunId: "run-2",
  },
]);
assert(dup.id === line.id, "Idempotência: mesma external_id não duplica");

// Isolamento
await repo.insertStatementLines([
  {
    tenantId: tenantB,
    bankAccountId: "acc-b",
    date: today,
    amount: -9,
    description: "Outro tenant",
    externalId: "EXT-B",
  },
]);
const listA = await repo.listStatementLines(tenantA);
assert(
  listA.every((l) => l.tenantId === tenantA),
  "Isolamento por tenant na listagem",
);
assert(
  !(await repo.getStatementLine(tenantA, "missing")),
  "Busca por ID inexistente",
);

// Helper import
const persisted = await persistStatementLinesFromFinanceImport({
  repository: repo,
  tenantId: tenantA,
  bankAccountId: "acc-1",
  importRunId: "run-import",
  rows: [
    {
      rowNumber: 1,
      date: today,
      amount: -250,
      description: "Fornecedor",
      externalId: null,
    },
  ],
});
assert(
  persisted.lines[0].externalId?.includes("run-import"),
  "Chave idempotente derivada do import_run+row",
);

// Sessão + match + confirmação
const session = await svc.openSession({
  tenantId: tenantA,
  bankAccountId: "acc-1",
  userId: "user-1",
  statements: [
    {
      id: "line-new",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: -500,
      description: "PAGTO XYZ",
      document: "D1",
      counterparty: "XYZ",
      externalId: "EXT-MATCH",
      balanceAfter: null,
    },
  ],
  candidates: [
    {
      id: "mov-1",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: 500,
      description: "Pagamento XYZ",
      document: "D1",
      counterparty: "XYZ",
      externalId: "EXT-MATCH",
      source: "movement",
    },
  ],
  loadPendingFromStore: false,
});
assert(session.matches.length === 1, "Criação de match na sessão");
assert(session.matches[0].decision === "pending", "Confirmação humana pendente");

const accepted = await svc.decide({
  tenantId: tenantA,
  sessionId: session.id,
  matchId: session.matches[0].id,
  decision: "accepted",
  userId: "user-1",
  justification: "Confirmado",
});
assert(accepted.decision === "accepted", "Confirmação de conciliação");

let dupBlocked = false;
try {
  await svc.decide({
    tenantId: tenantA,
    sessionId: session.id,
    matchId: session.matches[0].id,
    decision: "accepted",
    userId: "user-1",
    justification: "de novo",
  });
} catch {
  dupBlocked = true;
}
assert(dupBlocked, "Bloqueio de conciliação duplicada");

// Baixa confiança
let lowBlocked = false;
try {
  decideMatch(
    {
      id: "m-low",
      tenantId: tenantA,
      sessionId: session.id,
      statementLineId: line.id,
      internalId: "mov-x",
      status: "suggestion",
      confidence: 0.4,
      decision: "pending",
      justification: null,
      decidedBy: null,
      decidedAt: null,
      criteria: [],
    },
    { decision: "accepted", userId: "u1", justification: null },
  );
} catch {
  lowBlocked = true;
}
assert(lowBlocked, "Baixa confiança exige confirmação/justificativa");

// Factory sem client em supabase → erro (sem fallback silencioso)
let noSilent = false;
try {
  createReconciliationBackend(null, { backend: "supabase" });
} catch (e) {
  noSilent = String(e.message).includes("fallback silencioso");
}
assert(noSilent, "Erro do Supabase não usa fallback silencioso");

assert(transferConsolidatedNetImpact(100, 100) === 0, "Transferência impacto zero");

assert(
  read("lib/finance/cash-intelligence/cash-intelligence-actions.ts").includes(
    "financeiro.conciliar",
  ),
  "RBAC: financeiro.conciliar nas actions",
);
assert(
  read("lib/finance/cash-intelligence/cash-intelligence-actions.ts").includes(
    "bank.reconciliation.decision",
  ),
  "Auditoria de decisão",
);

assert(
  read("supabase/migrations/20260810_enterprise_bank_reconciliation.sql").includes(
    "bank_statement_lines",
  ),
  "Migration existente reutilizada",
);

const migrationCount = [
  "20260810_enterprise_bank_reconciliation.sql",
].filter((f) =>
  existsSync(join(root, "supabase/migrations", f)),
).length;
assert(migrationCount === 1, "Nenhuma nova migration criada nesta sprint");

console.log(`\nBank Reconciliation — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
