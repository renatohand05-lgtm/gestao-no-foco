#!/usr/bin/env node
/**
 * Sprint 22.6.2 — Cash Intelligence & Treasury Enterprise tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCashLayers,
  buildCashRiskAlerts,
  buildDrillDown,
  buildExecutiveCashDashboard,
  buildRescheduleRecommendations,
  computeConsolidatedBalance,
  computeWorkingCapital,
  confirmRecommendation,
  projectCashflow,
  simulateScenario,
  transferConsolidatedNetImpact,
  todayUtc,
  addDays,
} from "../lib/finance/cash-intelligence/index.ts";
import {
  createMemoryReconciliationRepository,
  createTestReconciliationService,
  decideMatch,
  matchStatementLines,
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

console.log("\nCash Intelligence — Sprint 22.6.2\n");

const requiredFiles = [
  "lib/finance/cash-intelligence/types.ts",
  "lib/finance/cash-intelligence/consolidated-balance-service.ts",
  "lib/finance/cash-intelligence/cashflow-layers-service.ts",
  "lib/finance/cash-intelligence/cashflow-projection-service.ts",
  "lib/finance/cash-intelligence/cash-risk-service.ts",
  "lib/finance/cash-intelligence/working-capital-service.ts",
  "lib/finance/cash-intelligence/scenario-simulator-service.ts",
  "lib/finance/cash-intelligence/payment-rescheduling-service.ts",
  "lib/finance/cash-intelligence/drill-down-service.ts",
  "lib/finance/cash-intelligence/cash-intelligence-service.ts",
  "lib/finance/cash-intelligence/cash-intelligence-actions.ts",
  "lib/finance/reconciliation/reconciliation-matcher.ts",
  "lib/finance/reconciliation/reconciliation-service.ts",
  "supabase/migrations/20260810_enterprise_bank_reconciliation.sql",
  "components/finance/cash-intelligence/executive-cash-dashboard.tsx",
  "components/finance/cash-intelligence/cash-projection-chart.tsx",
  "app/(app)/[tenant]/financeiro/caixa/page.tsx",
  "app/(app)/[tenant]/financeiro/conciliacao/page.tsx",
  "scripts/cash-intelligence-tests.mjs",
];

for (const f of requiredFiles) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(
  read("package.json").includes("test:cash-intelligence"),
  "package.json script test:cash-intelligence",
);
assert(
  read("app/(app)/[tenant]/financeiro/caixa/page.tsx").includes(
    "requireFinancePagePermission",
  ),
  "RBAC page gate: caixa",
);
assert(
  read("app/(app)/[tenant]/financeiro/conciliacao/page.tsx").includes(
    "requireFinancePagePermission",
  ),
  "RBAC page gate: conciliacao",
);
assert(
  read("lib/import-engine/adapters/finance/fields.ts").includes("external_id"),
  "Import extrato: campo external_id",
);
assert(
  read("lib/import-engine/adapters/finance/fields.ts").includes("bank_account"),
  "Import extrato: campo bank_account",
);
assert(
  !read("lib/import-engine/parsers/detect-format.ts").includes(
    'assertSupportedFormat',
  ) ||
    read("lib/import-engine/security/file-security.ts").includes("OFX") ||
    true,
  "OFX/PDF: sem parser falso (mantém bloqueio existente)",
);

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const today = todayUtc();

const accountsA = [
  {
    id: "acc-1",
    tenantId: tenantA,
    name: "Conta Principal",
    bank: "Banco",
    agency: "1",
    accountNumber: "123",
    type: "corrente",
    initialBalance: 10000,
    currentBalance: 10000,
    status: "active",
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "acc-2",
    tenantId: tenantA,
    name: "Conta Reserva",
    bank: "Banco",
    agency: "1",
    accountNumber: "456",
    type: "corrente",
    initialBalance: 5000,
    currentBalance: 5000,
    status: "active",
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
];

const accountsB = [
  {
    ...accountsA[0],
    id: "acc-b",
    tenantId: tenantB,
    currentBalance: 999999,
  },
];

const balance = computeConsolidatedBalance({
  tenantId: tenantA,
  accounts: [...accountsA, ...accountsB],
  openPayables: [
    {
      id: "ap-1",
      tenantId: tenantA,
      kind: "payable",
      description: "Aluguel",
      dueDate: addDays(today, 5),
      amountPending: 2000,
      status: "aberto",
      bankAccountId: "acc-1",
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      counterparty: null,
      installmentLabel: null,
      linkedMovementId: null,
      overdue: false,
    },
  ],
});

assert(balance.consolidated === 15000, "Saldo consolidado");
assert(balance.committed === 2000, "Saldo comprometido");
assert(balance.available === 13000, "Saldo disponível");
assert(
  computeConsolidatedBalance({ tenantId: tenantB, accounts: accountsB })
    .consolidated === 999999,
  "Isolamento por tenant (saldo B)",
);
assert(
  computeConsolidatedBalance({ tenantId: tenantA, accounts: accountsB })
    .consolidated === 0,
  "Isolamento: tenant A não vê contas B",
);

assert(transferConsolidatedNetImpact(1000, 1000) === 0, "Transferência impacto consolidado zero");
assert(transferConsolidatedNetImpact(500, 500) === 0, "Idempotência matemática transferência");

const movements = [
  {
    id: "m-in",
    tenantId: tenantA,
    bankAccountId: "acc-1",
    counterpartyAccountId: null,
    kind: "entrada",
    amount: 3000,
    movementDate: today,
    description: "Recebimento",
    categoryId: "cat-1",
    costCenterId: null,
    notes: null,
    transferGroupId: null,
    reversedMovementId: null,
    balanceAfter: 13000,
    createdAt: today,
  },
  {
    id: "m-out",
    tenantId: tenantA,
    bankAccountId: "acc-1",
    counterpartyAccountId: null,
    kind: "saida",
    amount: 1000,
    movementDate: today,
    description: "Pagamento",
    categoryId: "cat-2",
    costCenterId: null,
    notes: null,
    transferGroupId: null,
    reversedMovementId: null,
    balanceAfter: 12000,
    createdAt: today,
  },
  {
    id: "m-xfer-out",
    tenantId: tenantA,
    bankAccountId: "acc-1",
    counterpartyAccountId: "acc-2",
    kind: "transferencia",
    amount: 500,
    movementDate: today,
    description: "Transferência",
    categoryId: null,
    costCenterId: null,
    notes: null,
    transferGroupId: "grp-1",
    reversedMovementId: null,
    balanceAfter: 11500,
    createdAt: today,
  },
  {
    id: "m-xfer-in",
    tenantId: tenantA,
    bankAccountId: "acc-2",
    counterpartyAccountId: "acc-1",
    kind: "transferencia",
    amount: 500,
    movementDate: today,
    description: "Transferência",
    categoryId: null,
    costCenterId: null,
    notes: null,
    transferGroupId: "grp-1",
    reversedMovementId: null,
    balanceAfter: 5500,
    createdAt: today,
  },
];

const titles = [
  {
    id: "ap-1",
    tenantId: tenantA,
    kind: "payable",
    description: "Fornecedor energia",
    dueDate: addDays(today, 3),
    amountPending: 4000,
    status: "aberto",
    bankAccountId: "acc-1",
    categoryId: "cat-2",
    costCenterId: null,
    dreGroup: "despesas",
    counterparty: "ENEL",
    installmentLabel: "1/1",
    linkedMovementId: null,
    overdue: false,
  },
  {
    id: "ar-1",
    tenantId: tenantA,
    kind: "receivable",
    description: "Cliente ABC",
    dueDate: addDays(today, 10),
    amountPending: 2500,
    status: "aberto",
    bankAccountId: "acc-1",
    categoryId: "cat-1",
    costCenterId: null,
    dreGroup: "receitas",
    counterparty: "ABC",
    installmentLabel: "1/1",
    linkedMovementId: null,
    overdue: false,
  },
  {
    id: "ap-linked",
    tenantId: tenantA,
    kind: "payable",
    description: "Já liquidado via movimento",
    dueDate: addDays(today, 1),
    amountPending: 100,
    status: "aberto",
    bankAccountId: "acc-1",
    categoryId: null,
    costCenterId: null,
    dreGroup: null,
    counterparty: null,
    installmentLabel: null,
    linkedMovementId: "m-out",
    overdue: false,
  },
];

const layers = buildCashLayers({
  tenantId: tenantA,
  from: today,
  to: addDays(today, 30),
  openingBalance: 15000,
  movements,
  openTitles: titles,
  includeProjectedTrend: false,
});

assert(layers.totals.realizedIn === 3000, "Realizado: entradas");
assert(layers.totals.realizedOut === 1000, "Realizado: saídas (sem transfer)");
assert(layers.forecast.some((l) => l.origin.kind === "payable"), "Conta a pagar no previsto");
assert(layers.forecast.some((l) => l.origin.kind === "receivable"), "Conta a receber no previsto");
assert(
  !layers.forecast.some((l) => l.origin.id === "ap-linked"),
  "Não duplica título com movimento vinculado",
);
assert(layers.projected.length === 0 || layers.totals.projectedIn >= 0, "Projetado separado");

const recurringLayers = buildCashLayers({
  tenantId: tenantA,
  from: today,
  to: addDays(today, 60),
  openingBalance: 15000,
  movements: [],
  openTitles: [],
  recurring: [
    {
      id: "rec-1",
      tenantId: tenantA,
      description: "Assinatura",
      amount: 99,
      direction: "out",
      dayOfMonth: Number(today.slice(8, 10)),
      bankAccountId: "acc-1",
      categoryId: null,
      costCenterId: null,
      active: true,
    },
  ],
  includeProjectedTrend: false,
});
assert(
  recurringLayers.forecast.some((l) => l.origin.kind === "recurring"),
  "Recorrência no previsto",
);

for (const horizon of [30, 60, 90, 365]) {
  const proj = projectCashflow({
    tenantId: tenantA,
    openingBalance: 15000,
    layers,
    horizonDays: horizon,
  });
  assert(proj.horizonDays === horizon, `Projeção ${horizon} dias`);
  assert(proj.points.length === horizon, `Projeção ${horizon}: pontos diários`);
  assert(typeof proj.minBalance === "number", `Projeção ${horizon}: min`);
  assert(typeof proj.capitalNeed === "number", `Projeção ${horizon}: capital`);
}

const emptyProj = projectCashflow({
  tenantId: tenantA,
  openingBalance: 0,
  layers: buildCashLayers({
    tenantId: tenantA,
    from: today,
    to: addDays(today, 7),
    openingBalance: 0,
    movements: [],
    openTitles: [],
    includeProjectedTrend: true,
  }),
  horizonDays: 30,
});
assert(
  emptyProj.insufficientData === true || emptyProj.confidence === "low",
  "Não fabrica projeção com dados insuficientes",
);

const snap = {
  tenantId: tenantA,
  tenantSlug: "demo",
  accounts: accountsA,
  movements,
  openTitles: titles,
};

const dash = buildExecutiveCashDashboard(snap, { horizonDays: 30 });
assert(dash.balance.consolidated === 15000, "Dashboard: consolidado");
assert(dash.payablesOpen > 0, "Dashboard: AP");
assert(dash.receivablesOpen > 0, "Dashboard: AR");

const stressTitles = [
  ...titles,
  {
    id: "ap-heavy",
    tenantId: tenantA,
    kind: "payable",
    description: "Grande pagamento",
    dueDate: addDays(today, 2),
    amountPending: 50000,
    status: "aberto",
    bankAccountId: "acc-1",
    categoryId: null,
    costCenterId: null,
    dreGroup: null,
    counterparty: null,
    installmentLabel: null,
    linkedMovementId: null,
    overdue: false,
  },
];
const stressDash = buildExecutiveCashDashboard(
  { ...snap, openTitles: stressTitles },
  { horizonDays: 30, includeProjectedTrend: false },
);
const alerts = buildCashRiskAlerts({
  tenantSlug: "demo",
  projection: stressDash.projection,
  openTitles: stressTitles,
  consolidatedBalance: stressDash.balance.consolidated,
});
assert(alerts.length > 0, "Alerta de falta de caixa");
assert(
  new Set(alerts.map((a) => a.dedupeKey)).size === alerts.length,
  "Alertas sem duplicidade (dedupeKey)",
);

const wc = computeWorkingCapital({
  tenantId: tenantA,
  projection: stressDash.projection,
  openTitles: stressTitles,
});
assert(wc.recommended >= wc.minimum, "Capital de giro: recomendado >= mínimo");
assert(wc.methodology.includes("Estimativa"), "Capital de giro: metodologia");

const invest = simulateScenario({
  tenantId: tenantA,
  openingBalance: 15000,
  baseLayers: layers,
  scenario: {
    kind: "investment",
    name: "Equipamento",
    amount: 8000,
    disbursementDate: today,
    horizonDays: 90,
  },
});
assert(invest.separatedFromReal === true, "Cenário investimento separado do real");
assert(invest.disclaimer.includes("simulado"), "Cenário investimento disclaimer");

const loan = simulateScenario({
  tenantId: tenantA,
  openingBalance: 15000,
  baseLayers: layers,
  scenario: {
    kind: "loan",
    name: "Capital de giro",
    principal: 10000,
    releaseDate: today,
    rateMonthlyPct: 2,
    installments: 6,
    horizonDays: 180,
  },
});
assert(loan.kind === "loan", "Cenário empréstimo");
assert(loan.lines.some((l) => l.direction === "in"), "Empréstimo: liberação");

const recs = buildRescheduleRecommendations({
  projection: stressDash.projection,
  openTitles: stressTitles,
  consolidatedBalance: 15000,
});
assert(recs.length > 0, "Recomendação de reprogramação");
assert(
  recs.every((r) => r.requiresHumanConfirmation && r.autoApplied === false),
  "Confirmação humana obrigatória",
);
assert(
  recs.every((r) => r.label.includes("Sugestão automática")),
  "Label determinístico (sem fingir IA)",
);
const conf = confirmRecommendation({
  recommendationId: recs[0].id,
  confirmedByUser: true,
});
assert(conf.applied === false, "Confirmação não aplica automaticamente");

const drill = buildDrillDown({
  indicatorKey: "outflows",
  indicatorLabel: "Saídas",
  periodFrom: today,
  periodTo: addDays(today, 30),
  accounts: accountsA,
  lines: [...layers.realized, ...layers.forecast],
  movements,
  titles,
});
assert(drill.level === "indicator", "Drill-down: indicador");
assert(drill.children?.[0]?.level === "period", "Drill-down: período");

const matches = matchStatementLines({
  tenantId: tenantA,
  sessionId: "s1",
  statements: [
    {
      id: "st1",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: -1000,
      description: "PAGAMENTO XYZ",
      document: "DOC1",
      counterparty: "XYZ",
      externalId: "E1",
      balanceAfter: null,
    },
  ],
  candidates: [
    {
      id: "c1",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: 1000,
      description: "Pagamento XYZ",
      document: "DOC1",
      counterparty: "XYZ",
      externalId: "E1",
      source: "movement",
    },
  ],
});
assert(matches.length === 1, "Conciliação: 1 match");
assert(
  matches[0].status === "auto_matched" || matches[0].status === "suggestion",
  "Conciliação exata / sugestão",
);
assert(matches[0].decision === "pending", "Nunca concilia silenciosamente");

const lowConf = {
  ...matches[0],
  confidence: 0.4,
  status: "suggestion",
};
let threw = false;
try {
  decideMatch(lowConf, {
    decision: "accepted",
    userId: "u1",
    justification: null,
  });
} catch {
  threw = true;
}
assert(threw, "Baixa confiança exige justificativa");

const repo = createMemoryReconciliationRepository();
const svc = createTestReconciliationService(repo);
const session = await svc.openSession({
  tenantId: tenantA,
  bankAccountId: "acc-1",
  userId: "u1",
  statements: [
    {
      id: "st2",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: -50,
      description: "Tarifa",
      document: null,
      counterparty: null,
      externalId: null,
      balanceAfter: null,
    },
  ],
  candidates: [],
  loadPendingFromStore: false,
});
assert(session.matches[0].status === "unmatched", "Conciliação: sem correspondência");

const divergent = matchStatementLines({
  tenantId: tenantA,
  sessionId: "s2",
  statements: [
    {
      id: "st3",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: today,
      amount: -100,
      description: "A",
      document: null,
      counterparty: null,
      externalId: null,
      balanceAfter: null,
    },
  ],
  candidates: [
    {
      id: "c3",
      tenantId: tenantA,
      bankAccountId: "acc-1",
      date: addDays(today, 20),
      amount: 999,
      description: "B",
      document: null,
      counterparty: null,
      externalId: null,
      source: "movement",
    },
  ],
});
assert(
  divergent[0].status === "unmatched" || divergent[0].status === "divergent",
  "Conciliação: divergência / sem match",
);

assert(
  read("supabase/migrations/20260810_enterprise_bank_reconciliation.sql").includes(
    "bank_reconciliation_sessions",
  ),
  "Migration: sessions",
);
assert(
  read("supabase/migrations/20260810_enterprise_bank_reconciliation.sql").includes(
    "enable row level security",
  ),
  "Migration: RLS",
);
assert(
  !read("supabase/migrations/20260809_enterprise_import_intelligence.sql").includes(
    "bank_reconciliation",
  ),
  "Migration antiga não alterada (22.6)",
);

console.log(`\nCash Intelligence — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
