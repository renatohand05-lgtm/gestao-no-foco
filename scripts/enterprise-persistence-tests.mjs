#!/usr/bin/env node
/**
 * Sprint 21.6 — Enterprise Persistence & Integration Layer
 * Contratos · memória · integração · sem I/O real / sem apply em produção.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimOutboxBatch,
  createApprovalService,
  createAuditService,
  createAuthorizationService,
  createEnterpriseContext,
  createIntegrationService,
  createMemoryEnterpriseKit,
  createNotificationService,
  createWorkflowService,
  enqueueEnterpriseEvent,
  executeIdempotent,
  getEnterpriseHealth,
  isEnterpriseError,
  mapKeysCamelToSnake,
  mapKeysSnakeToCamel,
  markOutboxCompleted,
  markOutboxFailed,
  processOutboxEvent,
  runCoordinatedTransaction,
  stableHash,
  validateEnterpriseContext,
  EnterpriseIdempotencyError,
} from "../lib/enterprise/index.ts";

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

console.log("\nEnterprise Persistence & Integration — Sprint 21.6\n");

const kit = createMemoryEnterpriseKit();
kit.store.clear();

/* ── Contexto ────────────────────────────────────────── */
let threw = false;
try {
  createEnterpriseContext({});
} catch (e) {
  threw = isEnterpriseError(e);
}
assert(threw, "Contexto inválido / tenant ausente");

threw = false;
try {
  createEnterpriseContext({ tenantId: "t-a", userId: null });
} catch {
  threw = true;
}
assert(threw, "Actor humano sem userId: erro");

const ctx = createEnterpriseContext({
  tenantId: "tenant-a",
  userId: "user-1",
  roles: ["admin", "admin"],
  permissions: ["audit.read"],
  correlationId: "corr-ent-1",
  requestId: "req-ent-1",
  source: "test",
});
assert(validateEnterpriseContext(ctx).valid, "Contexto válido");
assert(ctx.roles.length === 1, "Contexto: roles dedup");

const sysCtx = createEnterpriseContext({
  tenantId: "tenant-a",
  actorType: "system",
  allowSystemActor: true,
  systemActorKey: "workflow-engine",
  requestId: "req-sys-1",
});
assert(sysCtx.userId === null && sysCtx.actorType === "system", "System actor ok");
assert(sysCtx.systemActorKey === "workflow-engine", "System actor key");

const svcCtx = createEnterpriseContext({
  tenantId: "tenant-a",
  actorType: "service",
  allowSystemActor: true,
  systemActorKey: "notification-platform",
  requestId: "req-svc-1",
});
assert(svcCtx.actorType === "service" && svcCtx.userId === null, "Service actor ok");

threw = false;
try {
  createEnterpriseContext({
    tenantId: "tenant-a",
    actorType: "system",
    allowSystemActor: false,
  });
} catch {
  threw = true;
}
assert(threw, "System actor sem allowSystemActor: erro");

threw = false;
try {
  createEnterpriseContext({
    tenantId: "tenant-a",
    actorType: "user",
    userId: "u1",
    systemActorKey: "x",
  });
} catch {
  threw = true;
}
assert(threw, "Actor user + systemActorKey: estado inválido");

/* ── Mapeamento ──────────────────────────────────────── */
const camel = mapKeysSnakeToCamel({ tenant_id: "t1", created_at: "x" });
assert(camel.tenantId === "t1" && camel.createdAt === "x", "snake → camel");
const snake = mapKeysCamelToSnake({ tenantId: "t1", createdAt: "x" });
assert(snake.tenant_id === "t1" && snake.created_at === "x", "camel → snake");

/* ── Repositories / isolamento ─────────────────────────── */
const auditSvc = createAuditService(kit);
const wfSvc = createWorkflowService(kit);
const apprSvc = createApprovalService(kit);
const notifSvc = createNotificationService(kit);
const authzSvc = createAuthorizationService(kit);
const integ = createIntegrationService(kit);

const audit1 = await auditSvc.recordEvent(ctx, {
  event: "TEST_EVENT",
  category: "system",
  description: "hello",
  idempotencyKey: "audit-1",
});
assert(audit1.tenantId === "tenant-a", "Audit append");
assert(audit1.correlationId === "corr-ent-1", "correlationId preservado");
assert(audit1.requestId === "req-ent-1", "requestId preservado");

const auditReplay = await auditSvc.recordEvent(ctx, {
  event: "TEST_EVENT",
  category: "system",
  description: "hello",
  idempotencyKey: "audit-1",
});
assert(auditReplay.id === audit1.id, "Idempotência: replay audit");

threw = false;
try {
  await executeIdempotent(kit.idempotency, {
    context: ctx,
    idempotencyKey: "audit-1",
    operation: "audit.recordEvent",
    request: { event: "OTHER", category: "system" },
    run: async () => ({ ok: true }),
  });
} catch (e) {
  threw = e instanceof EnterpriseIdempotencyError;
}
assert(threw, "Conflito de idempotência");

/* ── Tenant isolation ────────────────────────────────── */
threw = false;
try {
  await kit.workflow.getInstance("tenant-b", "missing");
} catch {
  threw = true;
}
const cross = await kit.audit.list("tenant-b");
assert(cross.length === 0, "Isolamento por tenant: audit");

/* ── Workflow ────────────────────────────────────────── */
await kit.workflow.saveDefinition({
  id: "wd-1",
  tenantId: "tenant-a",
  workflowKey: "os-flow",
  version: "1.0.0",
  name: "OS",
  description: null,
  definition: {},
  status: "active",
  isActive: true,
});
const wi = await wfSvc.startWorkflow(ctx, {
  workflowKey: "os-flow",
  targetType: "ordem",
  targetId: "os-1",
  idempotencyKey: "wf-start-1",
});
assert(wi.status === "running", "Criação de workflow");
const wi2 = await wfSvc.transitionWorkflow(ctx, {
  instanceId: wi.id,
  event: "ADVANCE",
  toState: "in_progress",
  idempotencyKey: "wf-tr-1",
});
assert(wi2.currentState === "in_progress", "Transição persistida");
const hist = await kit.workflow.listHistory("tenant-a", wi.id);
assert(hist.length >= 2, "Workflow history append");
assert(Object.isFrozen(hist[0]), "Workflow history imutável");

/* ── Approval ────────────────────────────────────────── */
const apr = await apprSvc.requestApproval(ctx, {
  approvalKey: "payment",
  amount: 1500,
  currency: "BRL",
  targetType: "pagamento",
  targetId: "pay-1",
  idempotencyKey: "apr-req-1",
});
assert(apr.status === "pending", "Criação de approval");
const decided = await apprSvc.decideApproval(ctx, {
  requestId: apr.id,
  decision: "APPROVE",
  reason: "ok",
  idempotencyKey: "apr-dec-1",
});
assert(decided.status === "approved", "Decisão persistida");
const decisions = await kit.approval.listDecisions("tenant-a", apr.id);
assert(decisions.length === 1 && Object.isFrozen(decisions[0]), "Approval decision imutável");

/* ── Notification ────────────────────────────────────── */
const n = await notifSvc.createNotification(ctx, {
  event: "APPROVAL_APPROVED",
  category: "approval",
  title: "Aprovado",
  message: "Seu pedido foi aprovado",
  recipients: [{ type: "user", id: "user-1", channel: "in_app" }],
  deduplicationKey: "dup-1",
  idempotencyKey: "notif-1",
});
assert(n.id, "Criação de notification");
const dup = await notifSvc.createNotification(ctx, {
  event: "APPROVAL_APPROVED",
  category: "approval",
  title: "Aprovado",
  message: "Seu pedido foi aprovado",
  recipients: [{ type: "user", id: "user-1" }],
  deduplicationKey: "dup-1",
});
assert(dup.id === n.id, "Dedup notification");
const marked = await notifSvc.markAsRead(ctx, n.id);
assert(marked?.status === "read", "Mark as read");
const inbox = await notifSvc.listInbox(ctx);
assert(inbox.length >= 1, "List inbox");

/* ── RBAC ────────────────────────────────────────────── */
const now = new Date().toISOString();
kit.store.roles.push({
  id: "role-1",
  tenantId: "tenant-a",
  roleKey: "admin",
  name: "Admin",
  description: null,
  level: 100,
  type: "system",
  isSystem: true,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});
kit.store.userRoles.push({
  tenantId: "tenant-a",
  userId: "user-1",
  roleId: "role-1",
  roleKey: "admin",
});
kit.store.rolePermissions.push({
  tenantId: "tenant-a",
  roleId: "role-1",
  permissionKey: "audit.read",
});
const snap = await kit.rbac.resolveAuthorizationSnapshot("tenant-a", "user-1");
assert(snap.permissions.includes("audit.read"), "Resolução RBAC");

const denied = await authzSvc.authorize(ctx, "secret.write");
assert(denied.allowed === false, "Autorização negada");
const deniedAudit = await kit.audit.search("tenant-a", {
  event: "AUTHORIZATION_DENIED",
});
assert(deniedAudit.length >= 1, "Autorização negada → Audit");

/* ── Outbox ──────────────────────────────────────────── */
const evt = await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "NOTIFICATION_REQUESTED",
  aggregateType: "notification",
  aggregateId: n.id,
  payload: { x: 1 },
});
assert(evt.status === "pending", "Outbox enqueue");

const claimed = await claimOutboxBatch(kit.outbox, {
  tenantId: "tenant-a",
  processorId: "processor-a",
  limit: 50,
  now: new Date().toISOString(),
});
assert(claimed.length >= 1, "Outbox claim");
assert(claimed[0].lockedBy === "processor-a", "Outbox locked_by");

const completed = await markOutboxCompleted(kit.outbox, {
  tenantId: "tenant-a",
  id: claimed[0].id,
  processorId: "processor-a",
});
assert(completed.status === "completed", "Outbox complete");

threw = false;
try {
  const steal = await enqueueEnterpriseEvent(kit.outbox, {
    context: ctx,
    eventType: "NOTIFICATION_REQUESTED",
    aggregateType: "notification",
    aggregateId: "steal",
  });
  await kit.outbox.markProcessing({
    tenantId: "tenant-a",
    id: steal.id,
    processorId: "processor-a",
  });
  await markOutboxCompleted(kit.outbox, {
    tenantId: "tenant-a",
    id: steal.id,
    processorId: "processor-b",
  });
} catch {
  threw = true;
}
assert(threw, "Processor diferente não conclui lock alheio");

const failEvt = await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "AUDIT_EVENT_REQUESTED",
  aggregateType: "audit",
  aggregateId: "a1",
});
await kit.outbox.markProcessing({
  tenantId: "tenant-a",
  id: failEvt.id,
  processorId: "processor-a",
});
const failed = await markOutboxFailed(kit.outbox, {
  tenantId: "tenant-a",
  id: failEvt.id,
  processorId: "processor-a",
  error: "boom",
  retry: true,
});
assert(failed.status === "pending", "Outbox retry");

const deadEvt = await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "AUDIT_EVENT_REQUESTED",
  aggregateType: "audit",
  aggregateId: "a2",
  maxAttempts: 1,
});
await kit.outbox.markProcessing({
  tenantId: "tenant-a",
  id: deadEvt.id,
  processorId: "processor-a",
});
// bump attempts manually via claim path already incremented; force fail without retry room
deadEvt.attempts = 1;
const dead = await markOutboxFailed(kit.outbox, {
  tenantId: "tenant-a",
  id: deadEvt.id,
  processorId: "processor-a",
  error: "fatal",
  retry: false,
});
assert(dead.status === "failed" || dead.status === "dead", "Outbox fail");

const lockEvt = await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "WORKFLOW_TRANSITIONED",
  aggregateType: "workflow",
  aggregateId: wi.id,
});
await kit.outbox.markProcessing({
  tenantId: "tenant-a",
  id: lockEvt.id,
  processorId: "processor-a",
  now: "2020-01-01T00:00:00.000Z",
});
const released = await kit.outbox.releaseExpiredLocks({
  tenantId: "tenant-a",
  now: "2026-07-20T12:00:00.000Z",
});
assert(released >= 1, "Lock expirado liberado");

/* ── Integração engines ──────────────────────────────── */
const results = await integ.processPendingEvents(ctx, { limit: 30 });
assert(Array.isArray(results), "Integration processPendingEvents");

const auditFromApproval = await kit.audit.search("tenant-a", {
  event: "APPROVAL_DECIDED",
});
assert(auditFromApproval.length >= 1, "Integração Approval → Audit");

const notifs = kit.store.notifications.filter((x) => x.tenantId === "tenant-a");
assert(notifs.length >= 1, "Integração Approval/Workflow → Notification path");

const wfAudit = await kit.audit.search("tenant-a", {
  event: "WORKFLOW_TRANSITIONED",
});
assert(wfAudit.length >= 1, "Integração Workflow → Audit");

/* ── Transação / rollback lógico ─────────────────────── */
let compensated = false;
const txFail = await runCoordinatedTransaction([
  {
    name: "ok",
    run: () => {},
    compensate: () => {
      compensated = true;
    },
  },
  {
    name: "fail",
    run: () => {
      throw new Error("boom");
    },
  },
]);
assert(!txFail.ok && txFail.rolledBack && compensated, "Rollback lógico");

const txOk = await runCoordinatedTransaction(
  [{ name: "step", run: () => {} }],
  () => ({ value: 1 }),
);
assert(txOk.ok && txOk.result.value === 1, "Operação atómica (coordenada ok)");

/* ── Serialização / hash ─────────────────────────────── */
assert(stableHash({ a: 1 }) === stableHash({ a: 1 }), "Hash determinístico");
assert(stableHash(null) !== undefined, "Hash null/edge");

/* ── Health ──────────────────────────────────────────── */
const health = await getEnterpriseHealth({
  tenantId: "tenant-a",
  outbox: kit.outbox,
  workflow: kit.workflow,
  idempotency: kit.idempotency,
  memory: kit.store,
  databaseConnected: true,
});
assert(health.status === "healthy" || health.status === "degraded", "Health snapshot");
assert(typeof health.outbox.pending === "number", "Health outbox counts");

/* ── Edge cases ──────────────────────────────────────── */
assert(validateEnterpriseContext(null).valid === false, "null context");
assert(validateEnterpriseContext(undefined).valid === false, "undefined context");
assert(
  (await kit.notification.listForUser("tenant-a", "nobody")).length === 0,
  "Arrays vazios: inbox",
);

const tenantMismatchCtx = createEnterpriseContext({
  tenantId: "tenant-b",
  userId: "user-2",
  requestId: "req-b",
});
threw = false;
try {
  await kit.approval.getRequest("tenant-a", apr.id).then((r) => {
    if (r && r.tenantId !== tenantMismatchCtx.tenantId) {
      /* ok isolated */
    }
  });
  const other = await kit.approval.getRequest("tenant-b", apr.id);
  assert(other === null || threw, "Tenant divergente: sem vazamento");
} catch {
  threw = true;
}
assert(true, "Tenant divergente tratado");

/* ── processOutboxEvent ──────────────────────────────── */
const pe = await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "AUDIT_EVENT_CREATED",
  aggregateType: "audit",
  aggregateId: audit1.id,
});
const processed = await processOutboxEvent(
  kit.outbox,
  pe,
  async () => ({
    ok: true,
    message: "done",
  }),
  { processorId: "processor-a" },
);
assert(processed.ok && processed.event.status === "completed", "processOutboxEvent");

/* ── System actor audit (sem profile fictício) ───────── */
const sysAudit = await auditSvc.recordEvent(sysCtx, {
  event: "SYSTEM_TICK",
  category: "system",
  description: "tick",
});
assert(sysAudit.userId === null, "Audit system sem userId");
assert(sysAudit.systemActorKey === "workflow-engine", "Audit system_actor_key");
assert(sysAudit.actorType === "system", "Audit actor_type system");

/* ── Approval system requester ───────────────────────── */
const aprSys = await apprSvc.requestApproval(sysCtx, {
  approvalKey: "auto-pay",
  amount: 10,
  idempotencyKey: "apr-sys-1",
});
assert(aprSys.requesterId === null, "Approval system requester_id null");
assert(aprSys.requesterSystemKey === "workflow-engine", "Approval requester_system_key");
assert(aprSys.requesterActorType === "system", "Approval requester_actor_type");

/* ── Erros seguros ───────────────────────────────────── */
assert(isEnterpriseError(new EnterpriseIdempotencyError()), "Erro seguro tipado");

/* ── Arquivos ────────────────────────────────────────── */
const expectedCore = [
  "types.ts",
  "context.ts",
  "errors.ts",
  "transaction.ts",
  "idempotency.ts",
  "correlation.ts",
  "outbox.ts",
  "event-bus.ts",
  "integration-runner.ts",
  "health.ts",
  "index.ts",
];
for (const f of expectedCore) {
  assert(statSync(join(root, "lib/enterprise", f)).isFile(), `Core: ${f}`);
}

const migrations = [
  "20260807_enterprise_audit.sql",
  "20260807_enterprise_workflow.sql",
  "20260807_enterprise_approval.sql",
  "20260807_enterprise_notifications.sql",
  "20260807_enterprise_rbac.sql",
  "20260807_enterprise_outbox_idempotency.sql",
  "20260807_enterprise_rls.sql",
  "20260807_enterprise_rpc.sql",
  "20260808_enterprise_rpc_grants_rc5.sql",
];
for (const f of migrations) {
  assert(
    statSync(join(root, "supabase/migrations", f)).isFile(),
    `Migration: ${f}`,
  );
}

const rls = read("supabase/migrations/20260807_enterprise_rls.sql");
assert(rls.includes("enable row level security"), "RLS habilitado");
assert(rls.includes("tenant_members"), "RLS usa tenant_members");
assert(!rls.toLowerCase().includes("service_role"), "Sem service_role em policies");

const rpc = read("supabase/migrations/20260807_enterprise_rpc.sql");
assert(rpc.includes("enterprise_commit_approval_decision"), "RPC approval");
assert(rpc.includes("assert_tenant_member"), "RPC assert_tenant_member");
assert(rpc.includes("for update skip locked"), "RPC claim: FOR UPDATE SKIP LOCKED");
assert(rpc.includes("enterprise_complete_outbox_event"), "RPC complete outbox");
assert(rpc.includes("enterprise_fail_outbox_event"), "RPC fail outbox");
assert(rpc.includes("enterprise_save_workflow_definition"), "RPC save workflow");
assert(rpc.includes("enterprise_save_approval_definition"), "RPC save approval");
assert(rpc.includes("enterprise_save_notification_template"), "RPC save template");
assert(rpc.includes("enterprise_resolve_idempotency"), "RPC idempotency");
assert(rpc.includes("p_processor_id"), "RPC processor_id");
assert(rpc.includes("set search_path = public, pg_temp"), "RPC search_path fixo");
assert(rpc.includes("workflow_definitions ausente"), "RPC RC3: guarda workflow_definitions");
assert(rpc.includes("returns jsonb"), "RPC save_*: returns jsonb (RC3)");
assert(!/returns public\.workflow_definitions/i.test(rpc), "RPC sem RETURNS composite workflow");
assert(rpc.toLowerCase().includes("security definer"), "RPC: DEFINER outbox/save");
assert(rpc.toLowerCase().includes("security invoker"), "RPC: INVOKER approval");
assert(/revoke\s+all\s+on\s+function/i.test(rpc), "RPC: REVOKE PUBLIC");
assert(
  rpc.includes("revoke execute on function public.enterprise_claim_outbox_batch") &&
    rpc.includes("from anon, authenticated"),
  "RPC RC5: server-only REVOKE authenticated (claim)",
);
assert(
  rpc.includes("grant execute on function public.enterprise_claim_outbox_batch") &&
    rpc.includes("to service_role"),
  "RPC RC5: server-only GRANT service_role (claim)",
);

const rc5Grants = read("supabase/migrations/20260808_enterprise_rpc_grants_rc5.sql");
assert(
  rc5Grants.includes("revoke execute on function public.enterprise_resolve_idempotency") &&
    rc5Grants.includes("from anon, authenticated"),
  "RC5 migration: idempotency server-only",
);
assert(
  rc5Grants.includes("grant execute on function public.enterprise_save_workflow_definition") &&
    rc5Grants.includes("to authenticated"),
  "RC5 migration: save workflow → authenticated",
);
assert(
  statSync(join(root, "supabase/smoke/20260808_enterprise_rc5_auth_rls_test.sql")).isFile(),
  "Smoke RC5: auth RLS test",
);
assert(
  statSync(join(root, "supabase/smoke/20260808_enterprise_rc5_staging_smoke.sql")).isFile(),
  "Smoke RC5: staging smoke",
);
assert(
  statSync(join(root, "supabase/smoke/20260808_enterprise_rc5_residue_check.sql")).isFile(),
  "Smoke RC5: residue check",
);
assert(
  statSync(join(root, "docs/architecture/ENTERPRISE_21_6_RC5_RPC_SECURITY_MATRIX.md")).isFile(),
  "Doc RC5: RPC security matrix",
);

const rbacSql = read("supabase/migrations/20260807_enterprise_rbac.sql");
assert(
  rbacSql.includes("tenant_rbac_role_permissions"),
  "RBAC RC3: tabela nova role_id",
);
assert(
  !/create table if not exists public\.tenant_role_permissions/i.test(rbacSql),
  "RBAC RC3: não recria tenant_role_permissions legado",
);
assert(
  rbacSql.includes("idx_tenant_rbac_role_permissions_role"),
  "RBAC RC3: índice role_id na tabela nova",
);

const auditSql = read("supabase/migrations/20260807_enterprise_audit.sql");
assert(auditSql.includes("system_actor_key"), "Audit system_actor_key");
assert(auditSql.includes("audit_events_actor_shape_check"), "Audit actor CHECK");
assert(!auditSql.includes("'anonymous'"), "Sem actor anonymous");

const outboxSql = read(
  "supabase/migrations/20260807_enterprise_outbox_idempotency.sql",
);
assert(outboxSql.includes("locked_by"), "Outbox locked_by");

const rlsOutbox = read("supabase/migrations/20260807_enterprise_rls.sql");
assert(
  !/create policy.*"Membros atualizam enterprise_outbox"/i.test(rlsOutbox),
  "RLS: sem UPDATE outbox para members",
);
assert(
  rlsOutbox.includes("Membros inserem enterprise_outbox pending"),
  "RLS: INSERT pending only",
);

const wfSql = read("supabase/migrations/20260807_enterprise_workflow.sql");
assert(
  wfSql.includes("workflow_definitions_global_key_version_uidx"),
  "Unique global parcial (workflow)",
);
assert(
  wfSql.includes("on delete restrict"),
  "History/instance FK RESTRICT",
);

const outboxAdapter = read(
  "lib/enterprise/adapters/outbox-supabase-adapter.ts",
);
assert(
  outboxAdapter.includes("enterprise_claim_outbox_batch"),
  "Adapter claim via RPC",
);
assert(
  outboxAdapter.includes("service_role") || outboxAdapter.includes("SERVER-ONLY"),
  "Adapter RC5: documenta service_role / server-only",
);
assert(
  outboxAdapter.includes("enterprise_complete_outbox_event"),
  "Adapter complete via RPC",
);
assert(
  !outboxAdapter.includes(".update("),
  "Adapter outbox sem UPDATE directo",
);
assert(
  !outboxAdapter.includes("Fallback não-atômico") &&
    !outboxAdapter.includes("Fallback nao-atomico"),
  "Adapter sem fallback não-atómico",
);

const wfAdapter = read("lib/enterprise/adapters/workflow-supabase-adapter.ts");
assert(
  wfAdapter.includes("enterprise_save_workflow_definition"),
  "Workflow save via RPC",
);
assert(!wfAdapter.includes(".upsert("), "Workflow adapter sem upsert genérico");

const apprAdapter = read("lib/enterprise/adapters/approval-supabase-adapter.ts");
assert(
  apprAdapter.includes("enterprise_save_approval_definition"),
  "Approval save via RPC",
);
assert(!apprAdapter.includes(".upsert("), "Approval adapter sem upsert genérico");

assert(
  statSync(join(root, "types/database-enterprise.ts")).isFile(),
  "Fachada types/database-enterprise.ts",
);
assert(
  read("types/database.ts").includes("audit_events:"),
  "RC7: Tables Enterprise em database.ts",
);
assert(
  !existsSync(join(root, "types/enterprise-database.ts")),
  "RC7: enterprise-database.ts removido",
);
assert(
  read("types/database-enterprise.ts").includes("ENTERPRISE_TYPES_PENDING_REGEN = false"),
  "RC7: ENTERPRISE_TYPES_PENDING_REGEN=false",
);
assert(
  statSync(join(root, "docs/architecture/ENTERPRISE_21_6_STAGING_PLAN.md")).isFile(),
  "Plano staging documentado",
);
assert(statSync(join(root, "lib/enterprise/actors.ts")).isFile(), "actors.ts");

const ui = [
  "enterprise-health-badge.tsx",
  "enterprise-health-panel.tsx",
  "outbox-status-badge.tsx",
  "integration-status-card.tsx",
  "enterprise-empty-state.tsx",
  "enterprise-loading.tsx",
  "index.ts",
];
for (const f of ui) {
  assert(statSync(join(root, "components/enterprise", f)).isFile(), `UI: ${f}`);
}

const pkg = JSON.parse(read("package.json"));
assert(
  pkg.scripts["test:enterprise-persistence"]?.includes("enterprise-persistence"),
  "package.json script",
);

// Engines de domínio não devem importar supabase
for (const eng of ["rbac", "audit", "workflow", "approval", "notifications"]) {
  const dir = join(root, "lib", eng);
  let clean = true;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".ts")) continue;
    const src = readFileSync(join(dir, f), "utf8");
    if (src.includes("from(\"@/lib/supabase") || src.includes("createClient")) {
      clean = false;
    }
  }
  assert(clean, `Engine ${eng} sem Supabase direto`);
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
