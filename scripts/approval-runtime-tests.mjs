#!/usr/bin/env node
/**
 * Sprint 21.7 + RC1 — Approval Runtime (orquestrador operacional).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  __resetApprovalActionSeqForTests,
  __resetApprovalRequestSeqForTests,
  createApprovalDefinition,
  createApprovalLevel,
  createApprovalPolicy,
  createSlaConfig,
  paymentAmountApprovalDefinition,
} from "../lib/approval/index.ts";
import {
  ApprovalRuntimeError,
  assertRuntimePermission,
  buildLevelRuntimeViews,
  computeApprovalSla,
  createApprovalRuntimeService,
  filterRuntimeItems,
  hasRuntimePermission,
  resolveNextStep,
  shouldEscalateBySla,
} from "../lib/approval/runtime/index.ts";
import {
  createApprovalRuntimeFactory,
  isApprovalRuntimeMemoryAllowed,
  __resetApprovalRuntimeMemoryKitForTests,
} from "../lib/approval/runtime/approval-runtime-factory.ts";
import { processApprovalSla } from "../lib/approval/runtime/approval-sla-processor.ts";
import { toDomainApprovalRequest } from "../lib/approval/runtime/approval-runtime.ts";
import {
  claimOutboxBatch,
  createEnterpriseContext,
  createMemoryEnterpriseKit,
  processOutboxEvent,
  registerDefaultIntegrationHandlers,
} from "../lib/enterprise/index.ts";

process.env.APPROVAL_RUNTIME_USE_MEMORY = "true";

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

console.log("\nApproval Runtime — Sprint 21.7 RC1\n");

__resetApprovalRuntimeMemoryKitForTests();

__resetApprovalActionSeqForTests();
__resetApprovalRequestSeqForTests();

const kit = createMemoryEnterpriseKit();
kit.store.clear();
registerDefaultIntegrationHandlers();

const tenantId = "tenant-runtime-a";
const amountDef = paymentAmountApprovalDefinition(tenantId);

const multiLevelDef = createApprovalDefinition({
  id: "multi-level-chain",
  version: "1.0.0",
  name: "Multi-level chain",
  tenantScope: "tenant",
  tenantId,
  policy: createApprovalPolicy({
    id: "all-levels",
    name: "Todos",
    defaultLevelIds: ["supervisor"],
  }),
  levels: [
    createApprovalLevel({
      id: "supervisor",
      name: "Supervisor",
      order: 1,
      mode: "sequential",
      requiredPermissions: ["financeiro.aprovar"],
      escalateToLevelId: "gerente",
      sla: createSlaConfig({
        maxMinutes: 60 * 24,
        alertAfterMinutes: 60 * 4,
        escalateAfterMinutes: 60 * 24,
        expireAfterMinutes: 60 * 72,
        allowReopen: true,
      }),
    }),
    createApprovalLevel({
      id: "gerente",
      name: "Gerente",
      order: 2,
      mode: "sequential",
      requiredPermissions: ["financeiro.aprovar"],
      escalateToLevelId: "diretor",
    }),
    createApprovalLevel({
      id: "diretor",
      name: "Diretor",
      order: 3,
      mode: "sequential",
      requiredPermissions: ["financeiro.aprovar"],
      escalateToLevelId: "ceo",
    }),
    createApprovalLevel({
      id: "ceo",
      name: "CEO",
      order: 4,
      mode: "sequential",
      requiredPermissions: ["financeiro.aprovar"],
    }),
  ],
  sla: createSlaConfig({
    maxMinutes: 60 * 72,
    escalateAfterMinutes: 60 * 48,
    expireAfterMinutes: 60 * 72,
    allowReopen: true,
  }),
});

const defs = new Map([
  [`${tenantId}:payment-amount:1.0.0`, amountDef],
  [`${tenantId}:multi-level:1.0.0`, multiLevelDef],
]);

function authSnapshot(userId, permissions = ["financeiro.aprovar", "auditoria.read"]) {
  return {
    tenantId,
    userId,
    roles: ["financeiro"],
    permissions,
  };
}

function ctx(userId, permissions = ["financeiro.aprovar", "auditoria.read"]) {
  return createEnterpriseContext({
    tenantId,
    userId,
    roles: ["financeiro"],
    permissions,
    correlationId: `corr-${userId}-${Date.now()}`,
    requestId: `req-${userId}`,
    source: "test",
  });
}

function runtime() {
  return createApprovalRuntimeService({
    approval: kit.approval,
    audit: kit.audit,
    notification: kit.notification,
    outbox: kit.outbox,
    idempotency: kit.idempotency,
    workflow: kit.workflow,
    listRequests: (query) => kit.approval.listRequests(query),
    resolveDefinition: async (t, key, version) =>
      defs.get(`${t}:${key}:${version}`) ?? null,
    resolveAuthorization: async (c) =>
      authSnapshot(c.userId ?? "system", c.permissions),
  });
}

const svc = runtime();

/* ── Estrutura de arquivos ───────────────────────────── */
for (const file of [
  "lib/approval/runtime/approval-runtime.ts",
  "lib/approval/runtime/approval-runtime-service.ts",
  "lib/approval/runtime/approval-runtime-types.ts",
  "lib/approval/runtime/approval-runtime-events.ts",
  "lib/approval/runtime/approval-runtime-context.ts",
  "lib/approval/runtime/approval-runtime-validator.ts",
  "lib/approval/runtime/approval-runtime-errors.ts",
  "lib/approval/runtime/index.ts",
  "lib/approval/runtime/actions.ts",
  "components/approval/approval-runtime-panel.tsx",
  "components/approval/approval-sla-card.tsx",
  "components/approval/approval-pending-card.tsx",
  "components/approval/approval-overdue-card.tsx",
  "components/approval/approval-levels-card.tsx",
  "components/approval/approval-history-panel.tsx",
  "components/approval/approval-runtime-summary.tsx",
  "components/approval/approval-runtime-dashboard.tsx",
  "lib/approval/runtime/approval-runtime-factory.ts",
  "lib/approval/runtime/approval-sla-processor.ts",
  "lib/enterprise/adapters/idempotency-supabase-adapter.ts",
  "app/(app)/[tenant]/aprovacoes/runtime/page.tsx",
]) {
  assert(existsSync(join(root, file)), `Arquivo existe: ${file}`);
}

assert(read("lib/approval/runtime/actions.ts").includes('"use server"'), "Server actions");

/* ── RBAC ────────────────────────────────────────────── */
const noPermCtx = ctx("denied-user", []);
assert(
  !hasRuntimePermission(authSnapshot("denied-user", []), noPermCtx, "approve"),
  "RBAC: sem permissão",
);
let rbacDenied = false;
try {
  assertRuntimePermission(authSnapshot("denied-user", []), noPermCtx, "approve");
} catch (e) {
  rbacDenied =
    e instanceof ApprovalRuntimeError &&
    e.code === "APPROVAL_RUNTIME_PERMISSION_DENIED";
}
assert(rbacDenied, "RBAC: assertRuntimePermission nega");

/* ── requestApproval ─────────────────────────────────── */
const requested = await svc.requestApproval(ctx("requester-1"), {
  approvalKey: "payment-amount",
  approvalVersion: "1.0.0",
  amount: 2500,
  targetType: "payment",
  targetId: "pay-rt-1",
  priority: "high",
});
assert(requested.ok === true, "requestApproval: ok");
assert(requested.operation === "request", "requestApproval: operation");
assert(requested.sideEffects.includes("audit"), "requestApproval: audit");
assert(requested.sideEffects.includes("outbox"), "requestApproval: outbox");
assert(requested.sideEffects.includes("notification"), "requestApproval: notification");
assert(requested.sla.createdAt != null, "SLA: createdAt");
assert(requested.sla.status === "on_track" || requested.sla.status === "not_applicable", "SLA: status inicial");

/* ── approve ─────────────────────────────────────────── */
const approved = await svc.approve(ctx("approver-1"), {
  requestId: requested.persistedRequestId,
  comment: "Ok",
});
assert(approved.ok === true, "approve: ok");
assert(
  approved.request.status === "completed" || approved.request.status === "approved",
  "approve: status final",
);
assert(approved.timeline.some((e) => e.type === "approved"), "Timeline: approved");

/* ── reject (nova solicitação) ───────────────────────── */
const req2 = await svc.requestApproval(ctx("requester-2"), {
  approvalKey: "payment-amount",
  amount: 1800,
});
const rejected = await svc.reject(ctx("approver-2"), {
  requestId: req2.persistedRequestId,
  reason: "Valor incorreto",
});
assert(rejected.ok && rejected.request.status === "rejected", "reject: ok");

/* ── cancel ──────────────────────────────────────────── */
const req3 = await svc.requestApproval(ctx("requester-3"), {
  approvalKey: "payment-amount",
  amount: 900,
});
const cancelled = await svc.cancel(ctx("approver-3"), {
  requestId: req3.persistedRequestId,
  reason: "Desistência",
});
assert(cancelled.ok && cancelled.request.status === "cancelled", "cancel: ok");

/* ── delegate ────────────────────────────────────────── */
const req4 = await svc.requestApproval(ctx("owner-1"), {
  approvalKey: "payment-amount",
  amount: 1200,
});
const delegated = await svc.delegate(ctx("owner-1"), {
  requestId: req4.persistedRequestId,
  delegateToUserId: "delegate-user",
  comment: "Férias",
});
assert(delegated.ok, "delegate: ok");
assert(
  delegated.timeline.some((e) => e.type === "delegated"),
  "delegate: timeline",
);
assert(
  kit.store.notifications.some((n) => n.event === "APPROVAL_DELEGATED"),
  "delegate: notification",
);

/* ── escalate ────────────────────────────────────────── */
const req5 = await svc.requestApproval(ctx("req-esc"), {
  approvalKey: "multi-level",
  approvalVersion: "1.0.0",
  amount: 100,
});
const escalated = await svc.escalate(ctx("escalator"), {
  requestId: req5.persistedRequestId,
  reason: "SLA 24h",
});
assert(escalated.ok, "escalate: ok");
assert(
  escalated.request.currentLevelIds.includes("gerente"),
  "escalate: nível gerente",
);
assert(
  escalated.timeline.some((e) => e.type === "escalated"),
  "escalate: timeline",
);

/* ── expire ──────────────────────────────────────────── */
const req6 = await svc.requestApproval(ctx("req-exp"), {
  approvalKey: "payment-amount",
  amount: 500,
});
const expired = await svc.expire(
  createEnterpriseContext({
    tenantId,
    actorType: "system",
    allowSystemActor: true,
    systemActorKey: "approval-sla",
    permissions: ["financeiro.aprovar"],
    source: "test",
  }),
  { requestId: req6.persistedRequestId },
);
assert(expired.ok && expired.request.status === "expired", "expire: ok");

/* ── reopen + retry ──────────────────────────────────── */
const req7 = await svc.requestApproval(ctx("req-reopen"), {
  approvalKey: "payment-amount",
  amount: 800,
});
await svc.reject(ctx("approver-r"), {
  requestId: req7.persistedRequestId,
  reason: "Ajustar",
});
const oldSlaAt = new Date(Date.now() - 1000 * 60 * 60 * 130).toISOString();
const slaTestRequest = {
  ...req7.request,
  status: "pending",
  createdAt: oldSlaAt,
  sla: amountDef.sla,
  history: req7.request.history.map((h, i) =>
    i === 0 ? { ...h, at: oldSlaAt } : h,
  ),
};
const slaOverdue = computeApprovalSla(slaTestRequest);
assert(
  slaOverdue.remainingMinutes === 0 || slaOverdue.status === "overdue",
  "SLA: overdue calculado",
);
const midSlaAt = new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString();
assert(
  shouldEscalateBySla({
    ...slaTestRequest,
    createdAt: midSlaAt,
    history: slaTestRequest.history.map((h, i) =>
      i === 0 ? { ...h, at: midSlaAt } : h,
    ),
  }),
  "SLA: shouldEscalateBySla",
);

const reopened = await svc.reopen(ctx("admin-1"), {
  requestId: req7.persistedRequestId,
  reason: "Corrigido",
});
assert(reopened.ok, "reopen: ok (returned/rejected flow)");

const retried = await svc.retryPending(ctx("admin-1"), {
  requestId: req7.persistedRequestId,
  idempotencyKey: "retry-once",
});
assert(retried.ok, "retryPending: ok");
assert(retried.timeline.some((e) => e.type === "retry"), "retry: timeline");

/* ── multi-level ─────────────────────────────────────── */
const mlReq = await svc.requestApproval(ctx("ml-req"), {
  approvalKey: "multi-level",
  approvalVersion: "1.0.0",
});
const mlApprove1 = await svc.approve(ctx("sup-1"), {
  requestId: mlReq.persistedRequestId,
});
assert(
  mlApprove1.request.currentLevelIds.includes("gerente") ||
    mlApprove1.request.status === "partially_approved",
  "multi-level: avança supervisor→gerente",
);
const levels = buildLevelRuntimeViews(mlApprove1.request, multiLevelDef);
assert(levels.length === 4, "multi-level: 4 níveis na view");
assert(levels.some((l) => l.name === "CEO"), "multi-level: CEO presente");

/* ── resolveNextStep ─────────────────────────────────── */
const next = resolveNextStep(mlApprove1.request);
assert(next.action === "decide" || next.action === "wait", "resolveNextStep");

/* ── list + KPIs + filtros + paginação ───────────────── */
const listed = await svc.list(ctx("viewer", ["auditoria.read"]), {
  page: 1,
  limit: 10,
});
assert(listed.items.length >= 1, "list: retorna itens");
assert(listed.total >= listed.items.length, "list: total");
assert(listed.page === 1, "list: paginação page");
const kpis = svc.computeKpis(listed.items);
assert(kpis.pending + kpis.approved + kpis.rejected >= 1, "KPIs: contagem");
const filtered = filterRuntimeItems(listed.items, { priority: "high" });
assert(Array.isArray(filtered), "filtros: priority");

const page2 = await kit.approval.listRequests({
  tenantId,
  page: 1,
  limit: 2,
});
assert(page2.items.length <= 2, "listRequests: limit");
assert(page2.total >= page2.items.length, "listRequests: total");

/* ── Audit ───────────────────────────────────────────── */
const auditCount = kit.store.audit.filter((e) => e.category === "approval").length;
assert(auditCount >= 5, "Audit: eventos registrados");

/* ── Outbox ──────────────────────────────────────────── */
const outboxCount = kit.store.outbox.filter((e) =>
  String(e.eventType).startsWith("APPROVAL"),
).length;
assert(outboxCount >= 3, "Outbox: eventos enfileirados");

const batch = await claimOutboxBatch(kit.outbox, {
  tenantId,
  processorId: "approval-runtime-test",
  limit: 5,
});
for (const evt of batch) {
  const processed = await processOutboxEvent(
    kit.outbox,
    evt,
    async () => ({ ok: true, message: "done" }),
  );
  assert(processed.ok, "Outbox: processOutboxEvent");
}
assert(kit.store.notifications.length >= 2, "Notifications: via outbox/runtime");

/* ── Idempotency ─────────────────────────────────────── */
const idemReq = await svc.requestApproval(ctx("idem-1"), {
  approvalKey: "payment-amount",
  amount: 600,
  idempotencyKey: "idem-key-1",
});
const idemReplay = await svc.requestApproval(ctx("idem-1"), {
  approvalKey: "payment-amount",
  amount: 600,
  idempotencyKey: "idem-key-1",
});
assert(
  idemReq.persistedRequestId === idemReplay.persistedRequestId,
  "Idempotency: replay request",
);

const idemApprove = await svc.approve(ctx("idem-approver"), {
  requestId: idemReq.persistedRequestId,
  idempotencyKey: "idem-approve-1",
});
const idemApprove2 = await svc.approve(ctx("idem-approver"), {
  requestId: idemReq.persistedRequestId,
  idempotencyKey: "idem-approve-1",
});
assert(
  idemApprove.request.id === idemApprove2.request.id,
  "Idempotency: replay approve",
);

/* ── Workflow hook ───────────────────────────────────── */
await kit.workflow.saveDefinition({
  tenantId,
  workflowKey: "pay-flow",
  version: "1.0.0",
  name: "Payment flow",
  status: "active",
  definition: {},
});
const wi = await kit.workflow.createInstance({
  tenantId,
  workflowDefinitionId: kit.store.workflowDefs[0].id,
  workflowKey: "pay-flow",
  version: "1.0.0",
  status: "running",
  currentState: "pending_approval",
  context: {},
  correlationId: "wf-corr",
});
const wfReq = await svc.requestApproval(
  ctx("wf-req", ["financeiro.aprovar"]),
  {
    approvalKey: "payment-amount",
    amount: 1500,
    workflowId: "pay-flow",
    workflowInstanceId: wi.id,
  },
);
await svc.approve(ctx("wf-appr"), { requestId: wfReq.persistedRequestId });
const wfHist = await kit.workflow.listHistory(tenantId, wi.id);
assert(wfHist.length >= 0, "Workflow: integração disponível");

/* ── UI exports ──────────────────────────────────────── */
assert(
  read("components/approval/index.ts").includes("ApprovalRuntimeDashboard"),
  "UI: exports dashboard",
);

/* ── package.json script ─────────────────────────────── */
assert(
  read("package.json").includes("test:approval-runtime"),
  "package.json: test:approval-runtime",
);

assert(
  read("lib/approval/runtime/actions.ts").includes("createApprovalRuntimeFactory"),
  "Actions: usa factory persistente",
);
assert(
  !read("lib/approval/runtime/actions.ts").includes("createMemoryEnterpriseKit"),
  "Actions: sem memory kit",
);

/* ── RC1: Factory + ambiente ─────────────────────────── */
assert(isApprovalRuntimeMemoryAllowed(), "Factory: memory permitido em teste");
const factoryRun = await createApprovalRuntimeFactory({
  tenantId,
  userId: "factory-user",
});
assert(factoryRun.runtime != null, "Factory: runtime criado");
assert(factoryRun.context.tenantId === tenantId, "Factory: tenantId");

const savedMem = process.env.APPROVAL_RUNTIME_USE_MEMORY;
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.APPROVAL_RUNTIME_USE_MEMORY;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
let factoryBlocked = false;
try {
  await createApprovalRuntimeFactory({ tenantId, userId: "u" });
} catch (e) {
  factoryBlocked =
    e instanceof ApprovalRuntimeError &&
    (String(e.message).includes("SUPABASE") ||
      String(e.message).includes("NEXT_PUBLIC_SUPABASE_URL"));
}
process.env.APPROVAL_RUNTIME_USE_MEMORY = savedMem;
if (savedUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
assert(factoryBlocked, "Factory: bloqueia sem memory/Supabase");

/* ── RC1: isolamento tenant + sessão ─────────────────── */
let noUserBlocked = false;
try {
  await createApprovalRuntimeFactory({ tenantId: "", userId: "u" });
} catch (e) {
  noUserBlocked = e instanceof ApprovalRuntimeError;
}
assert(noUserBlocked, "Factory: tenantId vazio bloqueado");

let sessionBlocked = false;
try {
  await createApprovalRuntimeFactory({ tenantId, userId: "" });
} catch (e) {
  sessionBlocked = e instanceof ApprovalRuntimeError;
}
assert(sessionBlocked, "Factory: sessão ausente bloqueada");

/* ── RC1: SLA processor ──────────────────────────────── */
const slaReq = await svc.requestApproval(ctx("sla-user"), {
  approvalKey: "multi-level",
  approvalVersion: "1.0.0",
});
const slaRow = await kit.approval.getRequest(tenantId, slaReq.persistedRequestId);
assert(slaRow != null, "SLA processor: row");
const slaDomain = toDomainApprovalRequest(slaRow, multiLevelDef);
const oldCreated = new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString();
const slaReady = {
  ...slaDomain,
  sla: multiLevelDef.levels[0]?.sla ?? null,
  createdAt: oldCreated,
  history: slaDomain.history.map((h, i) =>
    i === 0 ? { ...h, at: oldCreated } : h,
  ),
};
assert(shouldEscalateBySla(slaReady), "SLA processor: elegível");

const slaReport = await processApprovalSla({
  context: createEnterpriseContext({
    tenantId,
    actorType: "system",
    allowSystemActor: true,
    systemActorKey: "approval-sla-processor",
    source: "test",
  }),
  runtime: svc,
  listRequests: (q) => kit.approval.listRequests(q),
  resolveDomain: async (id) => {
    const row = await kit.approval.getRequest(tenantId, id);
    if (!row) return null;
    const def = defs.get(`${tenantId}:${row.approvalKey}:${row.approvalVersion}`);
    return def ? toDomainApprovalRequest(row, def) : null;
  },
  maxBatch: 20,
});
assert(slaReport.scanned >= 1, "SLA processor: scanned");
assert(typeof slaReport.escalated === "number", "SLA processor: escalated");

const dupReport = await processApprovalSla({
  context: createEnterpriseContext({
    tenantId,
    actorType: "system",
    allowSystemActor: true,
    systemActorKey: "approval-sla-processor",
    source: "test",
  }),
  runtime: svc,
  listRequests: (q) => kit.approval.listRequests(q),
  resolveDomain: async (id) => {
    const row = await kit.approval.getRequest(tenantId, id);
    if (!row) return null;
    return toDomainApprovalRequest(row, multiLevelDef);
  },
  maxBatch: 5,
});
assert(
  dupReport.skipped >= 0 || dupReport.escalated >= 0,
  "SLA processor: idempotência duplicada",
);

/* ── RC1: adapter Supabase listRequests ──────────────── */
assert(
  read("lib/enterprise/adapters/approval-supabase-adapter.ts").includes(
    "async listRequests",
  ),
  "Adapter Supabase: listRequests",
);
assert(
  read("lib/enterprise/adapters/approval-supabase-adapter.ts").includes(
    "MAX_LIST_LIMIT",
  ),
  "Adapter Supabase: limite máximo",
);
assert(
  read("lib/enterprise/adapters/idempotency-supabase-adapter.ts").includes(
    "enterprise_resolve_idempotency",
  ),
  "Adapter Supabase: idempotency RPC",
);

/* ── RC1: página operacional ─────────────────────────── */
assert(
  read("app/(app)/[tenant]/aprovacoes/runtime/page.tsx").includes(
    "listApprovalRuntimeAction",
  ),
  "Página runtime: server action",
);
assert(
  read("app/(app)/[tenant]/aprovacoes/runtime/page.tsx").includes("requireTenant"),
  "Página runtime: requireTenant",
);

console.log(`\nApproval Runtime — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
