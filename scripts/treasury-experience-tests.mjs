#!/usr/bin/env node
/**
 * Sprint 22.2 — Enterprise Treasury Experience
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEnterpriseContext,
  createMemoryEnterpriseKit,
} from "../lib/enterprise/index.ts";
import {
  FinanceError,
  FINANCE_ERROR_CODES,
  createMemoryFinanceCore,
  resolveFinanceEffectivePermissions,
  expandFinancePermissions,
  financePermissionSatisfied,
  mapMembershipRoleToEnterpriseRoles,
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

console.log("\nEnterprise Treasury Experience — Sprint 22.2\n");

const requiredFiles = [
  "lib/finance/treasury/index.ts",
  "lib/finance/treasury/treasury-service.ts",
  "lib/finance/treasury/treasury-query-service.ts",
  "lib/finance/treasury/treasury-summary-service.ts",
  "lib/finance/treasury/treasury-transfer-service.ts",
  "lib/finance/treasury/treasury-insights-service.ts",
  "lib/finance/treasury/treasury-alerts-service.ts",
  "lib/finance/treasury/treasury-types.ts",
  "lib/finance/treasury/treasury-validator.ts",
  "lib/finance/treasury/treasury-errors.ts",
  "components/finance/treasury-balance-chart.tsx",
  "components/finance/treasury-account-card.tsx",
  "components/finance/treasury-accounts-grid.tsx",
  "components/finance/transfer-form.tsx",
  "components/finance/transfer-dialog.tsx",
  "components/finance/transfer-summary.tsx",
  "components/finance/treasury-insights-panel.tsx",
  "components/finance/treasury-alerts-panel.tsx",
  "components/finance/finance-navigation.tsx",
  "components/finance/finance-period-filter.tsx",
  "app/(app)/[tenant]/financeiro/page.tsx",
  "app/(app)/[tenant]/financeiro/movimentacoes/page.tsx",
  "app/(app)/[tenant]/financeiro/transferencias/page.tsx",
  "scripts/treasury-experience-tests.mjs",
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Arquivo: ${file}`);
}

const actions = read("lib/finance/actions.ts");
assert(actions.includes("getTreasurySummary"), "Server Action getTreasurySummary");
assert(actions.includes("getTreasuryAccounts"), "Server Action getTreasuryAccounts");
assert(
  actions.includes("getTreasuryBalanceEvolution"),
  "Server Action getTreasuryBalanceEvolution",
);
assert(actions.includes("listTreasuryMovements"), "Server Action listTreasuryMovements");
assert(actions.includes("transferBetweenAccounts"), "Server Action transferBetweenAccounts");
assert(actions.includes("getTreasuryInsights"), "Server Action getTreasuryInsights");
assert(actions.includes("getTreasuryAlerts"), "Server Action getTreasuryAlerts");
assert(actions.includes("resolveFinanceEffectivePermissions"), "RBAC: compat efetiva");
assert(actions.includes("assertFinanceAccess"), "RBAC: assertFinanceAccess");
assert(
  !actions.includes('"financeiro.ver_fluxo_caixa",\n      ]'),
  "RBAC: fallback amplo removido",
);
assert(
  !actions.includes("RBAC sem permissões configuradas"),
  "RBAC: mensagem CONFIG_PENDING removida do gate",
);

assert(read("package.json").includes("test:treasury-experience"), "package.json script");
assert(
  read("lib/rbac/permissions.ts").includes("financeiro.alertas.visualizar"),
  "RBAC alertas",
);
assert(
  read("lib/rbac/permissions.ts").includes("financeiro.contas.visualizar"),
  "RBAC contas",
);
assert(
  read("lib/rbac/permissions.ts").includes("financeiro.movimentacoes.visualizar"),
  "RBAC movimentações",
);

assert(
  read("components/finance/finance-navigation.tsx").includes("legado"),
  "Navegação: suporte a item legado",
);
assert(
  read("components/finance/finance-period-filter.tsx").includes("Personalizado"),
  "Filtro período: personalizado",
);

const kitEnt = createMemoryEnterpriseKit();
kitEnt.store.clear();
const tenantId = "tenant-treasury-a";
const perms = [
  "financeiro.visualizar",
  "financeiro.criar",
  "financeiro.editar",
  "financeiro.excluir",
  "financeiro.arquivar",
  "financeiro.transferir",
  "financeiro.ver_saldos",
  "financeiro.ver_fluxo_caixa",
  "financeiro.movimentacoes.visualizar",
  "financeiro.contas.visualizar",
  "financeiro.alertas.visualizar",
];

const ctx = createEnterpriseContext({
  tenantId,
  userId: "Renato",
  roles: ["admin"],
  permissions: perms,
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
  idempotency: kitEnt.idempotency,
  tenantSlug: "demo",
});

/* Empty RBAC */
let emptyDenied = false;
try {
  await finance.treasury.getTreasurySummary(denied);
} catch (e) {
  emptyDenied =
    e instanceof FinanceError &&
    e.code === FINANCE_ERROR_CODES.PERMISSION_DENIED;
}
assert(emptyDenied, "RBAC: sem permissão → PERMISSION_DENIED");

const a = await finance.bankAccounts.create(ctx, {
  name: "Santander Operacional",
  bank: "Santander",
  type: "corrente",
  initialBalance: 20000,
});
const b = await finance.bankAccounts.create(ctx, {
  name: "XP Reserva",
  bank: "XP",
  type: "investimento",
  initialBalance: 5000,
});

const today = new Date().toISOString().slice(0, 10);
await finance.movements.create(ctx, {
  bankAccountId: a.id,
  kind: "entrada",
  amount: 3000,
  movementDate: today,
  description: "Recebimento OS",
});
await finance.movements.create(ctx, {
  bankAccountId: a.id,
  kind: "saida",
  amount: 1200,
  movementDate: today,
  description: "Folha",
});

/* Summary / KPIs */
const summary = await finance.treasury.getTreasurySummary(ctx, "30d");
assert(summary.consolidatedBalance > 0, "Resumo: saldo consolidado");
assert(summary.kpis.length >= 6, "KPIs: quantidade");
assert(
  summary.kpis.some((k) => k.key === "consolidated"),
  "KPIs: consolidado",
);
assert(summary.inflows >= 3000, "Resumo: entradas");
assert(summary.outflows >= 1200, "Resumo: saídas");
assert(typeof summary.net === "number", "Resumo: líquido");
assert(summary.activeAccounts === 2, "Resumo: contas ativas");

/* Evolution */
const evo = await finance.treasury.getTreasuryBalanceEvolution(ctx, "30d");
assert(evo.points.length >= 1, "Evolução: pontos");
assert(["up", "down", "flat"].includes(evo.trend), "Evolução: tendência");
assert(typeof evo.minBalance === "number", "Evolução: menor saldo");
assert(typeof evo.maxBalance === "number", "Evolução: maior saldo");

/* Accounts view */
const accountsView = await finance.treasury.getTreasuryAccounts(ctx);
assert(accountsView.length === 2, "Contas: visão");
assert(
  accountsView.every((v) => typeof v.shareOfTotalPct === "number"),
  "Contas: participação",
);

/* Filters / pagination */
const page = await finance.treasury.listTreasuryMovements(ctx, {
  kind: "saida",
  page: 1,
  perPage: 10,
  search: "Folha",
});
assert(page.total >= 1, "Filtros: texto + tipo");
assert(page.items.every((m) => m.kind === "saida"), "Filtros: kind saida");
assert(page.totalOutflows >= 1200, "Filtros: total saídas");
assert(page.page === 1, "Paginação: página");

/* Transfer happy path */
const xfer = await finance.treasury.transferBetweenAccounts(ctx, {
  fromAccountId: a.id,
  toAccountId: b.id,
  amount: 8500,
  movementDate: today,
  description: "Reserva",
  idempotencyKey: "xfer-test-1",
});
assert(xfer.outMovement.kind === "transferencia", "Transferência: saída");
assert(xfer.correlationId === ctx.correlationId, "Transferência: correlationId");
assert(xfer.replayed === false, "Transferência: primeira execução");
assert(xfer.transferGroupId != null, "Transferência: grupo");

const afterA = await finance.repos.bankAccounts.findById(tenantId, a.id);
assert(afterA.currentBalance < 20000 + 3000 - 1200, "Transferência: debitou origem");

/* Idempotency */
const xfer2 = await finance.treasury.transferBetweenAccounts(ctx, {
  fromAccountId: a.id,
  toAccountId: b.id,
  amount: 8500,
  movementDate: today,
  description: "Reserva",
  idempotencyKey: "xfer-test-1",
});
assert(xfer2.replayed === true, "Idempotência: replay");
assert(
  xfer2.outMovement.id === xfer.outMovement.id,
  "Idempotência: mesmo movimento",
);

const moves = await finance.repos.movements.list(tenantId, { limit: 100 });
const transferGroups = moves.filter(
  (m) => m.transferGroupId === xfer.transferGroupId,
);
assert(transferGroups.length === 2, "Idempotência: sem duplicar pares");

/* Same account */
let sameAccount = false;
try {
  await finance.treasury.transferBetweenAccounts(ctx, {
    fromAccountId: a.id,
    toAccountId: a.id,
    amount: 10,
    movementDate: today,
    description: "inválido",
    idempotencyKey: "xfer-same",
  });
} catch (e) {
  sameAccount = e instanceof FinanceError;
}
assert(sameAccount, "Transferência: mesma conta bloqueada");

/* Insufficient funds */
let noFunds = false;
try {
  await finance.treasury.transferBetweenAccounts(ctx, {
    fromAccountId: a.id,
    toAccountId: b.id,
    amount: 999_999_999,
    movementDate: today,
    description: "sem saldo",
    idempotencyKey: "xfer-broke",
  });
} catch (e) {
  noFunds =
    e instanceof FinanceError &&
    e.code === FINANCE_ERROR_CODES.INSUFFICIENT_FUNDS;
}
assert(noFunds, "Transferência: sem saldo");

/* RBAC transfer */
const viewer = createEnterpriseContext({
  tenantId,
  userId: "viewer",
  permissions: ["financeiro.visualizar", "financeiro.contas.visualizar"],
  source: "test",
});
let rbacBlock = false;
try {
  await finance.treasury.transferBetweenAccounts(viewer, {
    fromAccountId: a.id,
    toAccountId: b.id,
    amount: 1,
    movementDate: today,
    description: "negado",
    idempotencyKey: "xfer-denied",
  });
} catch (e) {
  rbacBlock =
    e instanceof FinanceError &&
    e.code === FINANCE_ERROR_CODES.PERMISSION_DENIED;
}
assert(rbacBlock, "RBAC: transferir negado");

/* Tenant isolation */
const other = createEnterpriseContext({
  tenantId: "tenant-treasury-b",
  userId: "other",
  permissions: perms,
  source: "test",
});
const otherAccounts = await finance.treasury.getTreasuryAccounts(other);
assert(otherAccounts.length === 0, "Multi-tenant: isolamento contas");

let crossTenant = false;
try {
  await finance.treasury.transferBetweenAccounts(other, {
    fromAccountId: a.id,
    toAccountId: b.id,
    amount: 1,
    movementDate: today,
    description: "cross",
    idempotencyKey: "xfer-cross",
  });
} catch (e) {
  crossTenant = e instanceof FinanceError;
}
assert(crossTenant, "Multi-tenant: transferência bloqueada");

/* Insights / alerts */
const insights = await finance.treasury.getTreasuryInsights(ctx, "30d");
assert(insights.length >= 1, "Insights: gerados");
const alerts = await finance.treasury.getTreasuryAlerts(ctx, "30d");
assert(Array.isArray(alerts), "Alertas: array");

/* Audit / Timeline / Outbox / Observability */
const audits = await kitEnt.audit.list(tenantId, { limit: 100 });
assert(
  audits.some((x) => x.event === "CASH_TRANSFER_EXECUTED"),
  "Audit: transferência",
);
const transferAudit = audits.find((x) => x.event === "CASH_TRANSFER_EXECUTED");
assert(
  transferAudit?.description?.includes("transferiu") ||
    transferAudit?.description?.includes("8500") ||
    String(transferAudit?.metadata?.amount) === "8500",
  "Timeline: descrição enriquecida",
);
assert(
  transferAudit?.metadata?.correlationId === ctx.correlationId ||
    transferAudit?.correlationId === ctx.correlationId,
  "Timeline: correlationId",
);
assert(
  kitEnt.store.outbox.some((e) => e.tenantId === tenantId),
  "Outbox: eventos",
);
assert(
  typeof finance.bridge.metrics.recordRequest === "function",
  "Observability: metrics",
);

/* ——— Sprint 22.2 RC1 ——— */
console.log("\nRC1 — DRE + RBAC compat\n");

const navSrc = read("components/finance/finance-navigation.tsx");
assert(navSrc.includes('href: "dre"'), "DRE presente na navegação");
assert(navSrc.includes('label: "DRE"'), "DRE label na navegação");
assert(existsSync(join(root, "app/(app)/[tenant]/financeiro/dre/page.tsx")), "Rota DRE existe");
assert(
  navSrc.includes('href: "dre"') && navSrc.includes("FINANCE_NAV_ITEMS"),
  "Rota do DRE correta (financeiro/dre)",
);
assert(navSrc.includes("data-active"), "Rota ativa do DRE (attr data-active)");
assert(
  navSrc.includes('group: "relatorios"') && navSrc.includes('href: "dre"'),
  "DRE no grupo Relatórios (Enterprise)",
);

for (const must of [
  "Dashboard",
  "Contas bancárias",
  "Movimentações",
  "Transferências",
  "Categorias",
  "Centros de custo",
  "Contas a pagar",
  "Contas a receber",
  "Fluxo de caixa",
  "DRE",
]) {
  assert(navSrc.includes(must), `Menu preserva: ${must}`);
}

assert(navSrc.includes('id: "tesouraria"'), "Grupo Tesouraria");
assert(navSrc.includes('id: "operacoes"'), "Grupo Operações");
assert(navSrc.includes('id: "planejamento"'), "Grupo Planejamento");
assert(navSrc.includes('id: "relatorios"'), "Grupo Relatórios");
assert(navSrc.includes('id: "configuracoes"'), "Grupo Configurações");

assert(
  navSrc.includes("isFinanceLegacyMenuEnabled") ||
    navSrc.includes("getVisibleFinanceNavItems"),
  "Feature flag legado no menu",
);
assert(
  navSrc.includes('href: "contas-bancarias"') && navSrc.includes("legacy: true"),
  "Contas legado atrás de flag",
);
assert(
  !navSrc.match(/href: "dre"[\s\S]{0,80}legacy:\s*true/),
  "DRE não é legado no menu",
);
assert(
  !navSrc.match(/href: "fluxo-caixa"[\s\S]{0,80}legacy:\s*true/),
  "Fluxo de caixa não é legado no menu",
);

assert(
  read("lib/rbac/permissions.ts").includes("financeiro.ver_dre"),
  "Permissão DRE existente (ver_dre, sem duplicar dre.visualizar)",
);
assert(
  !read("lib/rbac/permissions.ts").includes("financeiro.dre.visualizar"),
  "Não duplica financeiro.dre.visualizar",
);

/* Compat: owner/admin/manager/authorized */
const ownerAuth = resolveFinanceEffectivePermissions({
  membershipRole: "owner",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  ownerAuth.permissions.includes("financeiro.visualizar") &&
    ownerAuth.permissions.includes("financeiro.transferir"),
  "Administrador/owner com acesso financeiro",
);
assert(ownerAuth.source === "compat", "Owner usa compat de catálogo");

const adminAuth = resolveFinanceEffectivePermissions({
  membershipRole: "admin",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  adminAuth.permissions.includes("financeiro.visualizar"),
  "Admin tenant com acesso financeiro",
);

const authorizedLegacy = resolveFinanceEffectivePermissions({
  membershipRole: "manager",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  authorizedLegacy.permissions.includes("financeiro.contas.visualizar") &&
    authorizedLegacy.permissions.includes("financeiro.movimentacoes.visualizar"),
  "Utilizador autorizado (manager) com acesso",
);

const viewerCompat = resolveFinanceEffectivePermissions({
  membershipRole: null,
  snapshotRoles: [],
  snapshotPermissions: ["financeiro.visualizar"],
});
assert(
  expandFinancePermissions(viewerCompat.permissions).includes(
    "financeiro.alertas.visualizar",
  ),
  "Equivalente legado expande alertas.visualizar",
);
assert(
  financePermissionSatisfied(
    ["financeiro.visualizar"],
    "financeiro.contas.visualizar",
  ),
  "financeiro.visualizar satisfaz contas.visualizar",
);

const blockedAuth = resolveFinanceEffectivePermissions({
  membershipRole: null,
  snapshotRoles: [],
  snapshotPermissions: ["estoque.visualizar"],
});
assert(
  !blockedAuth.permissions.some((p) => p.startsWith("financeiro.")),
  "Utilizador sem permissão financeira bloqueado (sem finance keys)",
);

const mapped = mapMembershipRoleToEnterpriseRoles("owner");
assert(mapped.includes("proprietario"), "Map membership owner → proprietario");

/* Tenant isolation preserved: other tenant empty */
assert(otherAccounts.length === 0, "Isolamento por tenant (reconfirm)");

/* Dashboard empty ≠ RBAC */
const dashSrc = read("components/finance/treasury-dashboard-client.tsx");
assert(
  dashSrc.includes("permission_denied") && dashSrc.includes("empty_accounts"),
  "Dashboard distingue empty state de RBAC",
);
assert(
  dashSrc.includes("data-treasury-empty") ||
    dashSrc.includes('data-treasury-state="empty_accounts"'),
  "Dashboard empty accounts marcado",
);
assert(
  read("app/(app)/[tenant]/financeiro/page.tsx").includes("permissionDenied"),
  "Página financeiro separa permissionDenied",
);

assert(
  existsSync(join(root, "lib/finance/shared/rbac-compat.ts")),
  "Arquivo: rbac-compat",
);

/* ——— Sprint 22.2 RC2 ——— */
console.log("\nRC2 — Enterprise menu + chart + RBAC pages\n");

assert(
  read("app/(app)/[tenant]/financeiro/dre/page.tsx").includes("DRE Enterprise") ||
    read("app/(app)/[tenant]/financeiro/dre/page.tsx").includes('title="DRE"'),
  "DRE Enterprise page",
);
assert(
  read("app/(app)/[tenant]/financeiro/dre/page.tsx").includes(
    "requireFinancePagePermission",
  ),
  "DRE com RBAC de página",
);
assert(
  read("app/(app)/[tenant]/financeiro/fluxo-caixa/page.tsx").includes(
    "Fluxo de Caixa Enterprise",
  ) ||
    read("app/(app)/[tenant]/financeiro/fluxo-caixa/page.tsx").includes(
      "Fluxo de caixa",
    ),
  "Fluxo Enterprise page",
);
assert(
  read("app/(app)/[tenant]/financeiro/fluxo-caixa/page.tsx").includes(
    "listCashFlow",
  ),
  "Fluxo consome Finance Core",
);
assert(
  read("app/(app)/[tenant]/financeiro/dashboard/page.tsx").includes(
    'redirect(`/${tenant}/financeiro`)',
  ) ||
    read("app/(app)/[tenant]/financeiro/dashboard/page.tsx").includes(
      "/financeiro",
    ),
  "Dashboard alias → Enterprise Tesouraria",
);
assert(
  read("app/(app)/[tenant]/financeiro/page.tsx").includes(
    "Dashboard Enterprise",
  ) ||
    read("app/(app)/[tenant]/financeiro/page.tsx").includes('title="Dashboard"'),
  "Dashboard Enterprise título",
);
assert(
  read("lib/finance/finance-feature-flags.ts").includes(
    "isFinanceLegacyMenuEnabled",
  ),
  "Feature flag finance legacy",
);
assert(
  read(".env.example").includes("NEXT_PUBLIC_FINANCE_SHOW_LEGACY"),
  ".env.example documenta flag",
);

const chartSrc = read("components/finance/treasury-balance-chart.tsx");
assert(
  chartSrc.includes("data-treasury-chart-empty") ||
    chartSrc.includes("data-chart-empty"),
  "Gráfico: empty state marcado",
);
assert(chartSrc.includes("Sem evolução para exibir"), "Gráfico: empty copy");

assert(
  evo.hasMovements === true && evo.points.length >= 1,
  "Gráfico: renderiza com movimentações",
);

const emptyEvo = await finance.treasury.getTreasuryBalanceEvolution(
  other,
  "30d",
);
assert(
  emptyEvo.hasMovements === false && emptyEvo.points.length === 0,
  "Gráfico: empty sem movimentações (tenant vazio)",
);

assert(
  read("lib/finance/page-auth.ts").includes("requireFinancePagePermission"),
  "page-auth RBAC Enterprise",
);
assert(
  authorizedLegacy.permissions.includes("financeiro.ver_dre") ||
    ownerAuth.permissions.includes("financeiro.ver_dre"),
  "RBAC: DRE no catálogo owner/manager",
);
assert(
  ownerAuth.permissions.includes("financeiro.ver_fluxo_caixa"),
  "RBAC: fluxo no catálogo owner",
);

/* ——— Sprint 22.4.1 — page gates em todas as rotas financeiras ——— */
console.log("\nRC 22.4.1 — Page RBAC gates\n");

function listFinancePages(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) listFinancePages(full, acc);
    else if (name === "page.tsx") acc.push(full);
  }
  return acc;
}

const financePages = listFinancePages(
  join(root, "app/(app)/[tenant]/financeiro"),
);
assert(financePages.length >= 40, `Rotas financeiras enumerate (≥40): ${financePages.length}`);

for (const pagePath of financePages) {
  const src = readFileSync(pagePath, "utf8");
  const rel = pagePath.slice(root.length + 1).replace(/\\/g, "/");
  assert(
    src.includes("requireFinancePagePermission"),
    `Page gate: ${rel}`,
  );
  assert(
    !/\bawait requireTenant\(/.test(src),
    `Sem requireTenant directo: ${rel}`,
  );
}

assert(
  read("lib/finance/page-auth.ts").includes("tryRequireFinancePagePermission"),
  "Helper tryRequireFinancePagePermission",
);

assert(
  read("app/(app)/[tenant]/financeiro/transferencias/page.tsx").includes(
    '"financeiro.transferir"',
  ) &&
    !read("app/(app)/[tenant]/financeiro/transferencias/page.tsx").includes(
      '"financeiro.visualizar"',
    ),
  "Transferências exige transferir (não só visualizar)",
);

assert(
  read("app/(app)/[tenant]/financeiro/dashboard/page.tsx").includes(
    "requireFinancePagePermission",
  ) &&
    read("app/(app)/[tenant]/financeiro/dashboard/page.tsx").includes(
      "redirect",
    ),
  "Dashboard alias gate antes do redirect",
);

const memberAuth = resolveFinanceEffectivePermissions({
  membershipRole: "member",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  memberAuth.permissions.includes("financeiro.visualizar"),
  "Leitura (member→visualizacao): financeiro.visualizar",
);
assert(
  !memberAuth.permissions.includes("financeiro.transferir"),
  "Leitura: sem financeiro.transferir",
);
assert(
  financePermissionSatisfied(memberAuth.permissions, [
    "financeiro.visualizar",
  ]),
  "Leitura: satisfaz gate visualizar",
);
assert(
  !financePermissionSatisfied(memberAuth.permissions, "financeiro.transferir"),
  "Leitura: bloqueada em transferências",
);

const managerAuth = resolveFinanceEffectivePermissions({
  membershipRole: "manager",
  snapshotRoles: [],
  snapshotPermissions: [],
});
assert(
  financePermissionSatisfied(managerAuth.permissions, "financeiro.transferir") ||
    financePermissionSatisfied(managerAuth.permissions, "financeiro.visualizar"),
  "Financeiro (manager): acesso financeiro efectivo",
);

assert(
  financePermissionSatisfied(adminAuth.permissions, "financeiro.ver_dre"),
  "Admin (diretor): DRE",
);

assert(
  financePermissionSatisfied(ownerAuth.permissions, [
    "financeiro.visualizar",
    "financeiro.ver_saldos",
    "financeiro.contas.visualizar",
  ]),
  "Owner: dashboard gate",
);

console.log(`\nTreasury Experience — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
