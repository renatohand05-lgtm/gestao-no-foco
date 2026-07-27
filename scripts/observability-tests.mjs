#!/usr/bin/env node
/**
 * Sprint 21.9 — Enterprise Observability
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEnterpriseContext,
  createMemoryEnterpriseKit,
  enqueueEnterpriseEvent,
  newEntityId,
} from "../lib/enterprise/index.ts";
import {
  ObservabilityError,
  assertObservabilityReadPermission,
  computeLatencyStats,
  createLoggingService,
  createObservabilityService,
  createTraceService,
  hasObservabilityReadPermission,
  percentile,
} from "../lib/observability/index.ts";

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

console.log("\nEnterprise Observability — Sprint 21.9\n");

const kit = createMemoryEnterpriseKit();
kit.store.clear();
const tenantId = "tenant-obs-a";
const tenantB = "tenant-obs-b";

const ctx = createEnterpriseContext({
  tenantId,
  userId: "user-obs-1",
  roles: ["admin"],
  permissions: ["auditoria.visualizar"],
  correlationId: "corr-obs-1",
  source: "test",
});

const denied = createEnterpriseContext({
  tenantId,
  userId: "user-denied",
  permissions: [],
  source: "test",
});

const logging = createLoggingService();
const tracing = createTraceService();

const svc = createObservabilityService({
  audit: kit.audit,
  workflow: kit.workflow,
  approval: kit.approval,
  notification: kit.notification,
  outbox: kit.outbox,
  logging,
  tracing,
  probeDatabase: async () => ({ ok: true, latencyMs: 12, message: "ok" }),
  probeSupabase: async () => ({ ok: true, latencyMs: 18, message: "ok" }),
  probeStorage: async () => ({ ok: true, latencyMs: 5, message: "ok" }),
  resolveAuthorization: async (c) => ({
    tenantId: c.tenantId,
    userId: c.userId ?? "system",
    roles: [...c.roles],
    permissions: [...c.permissions],
  }),
});

/* ── Files ───────────────────────────────────────────── */
for (const file of [
  "lib/observability/observability-service.ts",
  "lib/observability/health-service.ts",
  "lib/observability/metrics-service.ts",
  "lib/observability/logging-service.ts",
  "lib/observability/trace-service.ts",
  "lib/observability/diagnostics-service.ts",
  "lib/observability/alert-service.ts",
  "lib/observability/status-service.ts",
  "lib/observability/index.ts",
  "lib/observability/actions.ts",
  "components/observability/health-dashboard.tsx",
  "components/observability/metrics-dashboard.tsx",
  "components/observability/system-status.tsx",
  "components/observability/service-card.tsx",
  "components/observability/latency-card.tsx",
  "components/observability/alerts-panel.tsx",
  "components/observability/trace-panel.tsx",
  "components/observability/observability-client.tsx",
  "app/(app)/[tenant]/observabilidade/page.tsx",
  "scripts/observability-tests.mjs",
]) {
  assert(existsSync(join(root, file)), `Arquivo: ${file}`);
}

assert(read("lib/observability/actions.ts").includes('"use server"'), "Server actions");
assert(read("lib/observability/actions.ts").includes("getSystemHealth"), "Action: getSystemHealth");
assert(read("lib/observability/actions.ts").includes("getMetrics"), "Action: getMetrics");
assert(read("lib/observability/actions.ts").includes("getAlerts"), "Action: getAlerts");
assert(read("lib/observability/actions.ts").includes("getTrace"), "Action: getTrace");
assert(
  read("components/observability/observability-client.tsx").includes(
    "getObservabilitySnapshot",
  ),
  "Client: só via Server Actions",
);
assert(
  !read("components/observability/observability-client.tsx").includes(
    "createObservabilityService",
  ),
  "Client: sem service interno",
);
assert(
  !read("lib/observability/observability-service.ts").includes("createTimelineService"),
  "Não modifica Timeline",
);
assert(
  read("package.json").includes("test:observability"),
  "package.json: test:observability",
);

/* ── Seed ────────────────────────────────────────────── */
await kit.audit.append({
  tenantId,
  userId: "user-obs-1",
  actorType: "user",
  systemActorKey: null,
  event: "OBS_SEED",
  category: "system",
  severity: "info",
  targetType: "system",
  targetId: "sys-1",
  resource: null,
  module: "observability",
  description: "seed",
  metadata: {},
  origin: "test",
  correlationId: "corr-obs-1",
  requestId: "req-1",
  sessionId: null,
  ipAddress: null,
  device: null,
});

await kit.workflow.saveDefinition({
  tenantId,
  workflowKey: "obs-flow",
  version: "1.0.0",
  name: "OBS",
  status: "active",
  isActive: true,
  description: null,
  definition: {},
});
await kit.workflow.createInstance({
  tenantId,
  workflowDefinitionId: kit.store.workflowDefs[0].id,
  workflowKey: "obs-flow",
  workflowVersion: "1.0.0",
  currentState: "draft",
  status: "running",
  targetType: "os",
  targetId: "os-1",
  data: {},
  metadata: {},
  correlationId: "corr-obs-1",
  startedAt: new Date().toISOString(),
  completedAt: null,
});

await kit.approval.createRequest({
  id: newEntityId("apr"),
  tenantId,
  approvalDefinitionId: "def-1",
  approvalKey: "payment-amount",
  approvalVersion: "1.0.0",
  requesterActorType: "user",
  requesterId: "user-obs-1",
  requesterSystemKey: null,
  targetType: "payment",
  targetId: "pay-1",
  amount: 100,
  currency: "BRL",
  currentLevel: "supervisor",
  status: "pending",
  data: {},
  metadata: {},
  correlationId: "corr-obs-1",
  expiresAt: null,
  completedAt: null,
});

await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "OBS_EVENT",
  aggregateType: "system",
  aggregateId: "sys-1",
  payload: { ok: true },
});

for (let i = 0; i < 20; i++) {
  svc.metrics.recordRequest(tenantId, "server_actions", 40 + i * 5, "ok", {
    kind: "server_action",
  });
}
svc.metrics.recordRequest(tenantId, "workflow", 90, "ok", { kind: "workflow" });
svc.metrics.recordRequest(tenantB, "server_actions", 999, "error", {
  kind: "server_action",
});

/* ── RBAC ────────────────────────────────────────────── */
assert(hasObservabilityReadPermission(null, ctx), "RBAC: permitido");
assert(!hasObservabilityReadPermission(null, denied), "RBAC: negado");
let deniedOk = false;
try {
  assertObservabilityReadPermission(null, denied);
} catch (e) {
  deniedOk = e instanceof ObservabilityError;
}
assert(deniedOk, "RBAC: assert lança");

let deniedQuery = false;
try {
  await svc.getSystemHealth(denied);
} catch (e) {
  deniedQuery = e instanceof ObservabilityError;
}
assert(deniedQuery, "RBAC: health bloqueado");

/* ── Health ──────────────────────────────────────────── */
const health = await svc.getSystemHealth(ctx);
assert(health.tenantId === tenantId, "Health: tenant");
assert(health.services.length >= 9, "Health: serviços cobertos");
assert(
  health.services.some((s) => s.name === "database"),
  "Health: database",
);
assert(
  health.services.some((s) => s.name === "workflow"),
  "Health: workflow",
);
assert(
  health.services.some((s) => s.name === "approval"),
  "Health: approval",
);
assert(
  health.services.some((s) => s.name === "timeline"),
  "Health: timeline",
);
assert(
  health.services.some((s) => s.name === "outbox"),
  "Health: outbox",
);
assert(
  health.services.some((s) => s.name === "server_actions"),
  "Health: server_actions",
);

/* ── Metrics / latency ───────────────────────────────── */
const metrics = await svc.getMetrics(ctx);
assert(metrics.tenantId === tenantId, "Metrics: tenant");
assert(metrics.requests >= 20, "Metrics: requests");
assert(metrics.latency.samples >= 20, "Metrics: samples");
assert(metrics.latency.p95Ms > 0, "Metrics: P95");
assert(metrics.latency.p99Ms > 0, "Metrics: P99");
assert(typeof metrics.latency.minMs === "number", "Metrics: min");
assert(metrics.latency.maxMs >= metrics.latency.minMs, "Metrics: max");
assert(metrics.outboxPending >= 1, "Metrics: outbox queue");
assert(metrics.approvals >= 1, "Metrics: approvals");
assert(metrics.workflowExecutions >= 1, "Metrics: workflows");
assert(metrics.timelineEvents >= 1, "Metrics: timeline events");

const stats = computeLatencyStats([10, 20, 30, 40, 50, 100]);
assert(percentile([10, 20, 30, 40, 50], 95) >= 40, "Latency: percentile helper");
assert(stats.avgMs > 0, "Latency: avg");

/* ── Logging ─────────────────────────────────────────── */
const log = logging.log({
  tenantId,
  module: "observability",
  action: "test",
  actor: "user-obs-1",
  severity: "info",
  correlationId: "corr-obs-1",
  duration: 12,
  status: "ok",
  metadata: { password: "secret", note: "x" },
});
assert(log.timestamp && log.tenantId === tenantId, "Logging: campos mínimos");
assert(log.module === "observability" && log.action === "test", "Logging: module/action");
assert(log.metadata.password === "[redacted]", "Logging: sanitize");
assert(logging.list(tenantId).length >= 1, "Logging: list tenant");
assert(logging.list(tenantB).length === 0, "Logging: isolamento tenant");

/* ── Tracing ─────────────────────────────────────────── */
const span = tracing.start({
  tenantId,
  module: "observability",
  action: "unit",
  correlationId: "corr-obs-1",
});
assert(span.traceId && span.correlationId && span.requestId, "Tracing: ids");
tracing.end(span.traceId, "ok");
const got = await svc.getTrace(ctx, span.traceId);
assert(got.traceId === span.traceId, "Tracing: getTrace");
assert(got.status === "ok", "Tracing: ended");

let leak = false;
try {
  const foreign = tracing.start({
    tenantId: tenantB,
    module: "observability",
    action: "leak",
  });
  await svc.getTrace(ctx, foreign.traceId);
} catch (e) {
  leak = e instanceof ObservabilityError;
}
assert(leak, "Tracing: isolamento tenant");

/* ── Alerts ──────────────────────────────────────────── */
svc.metrics.recordRequest(tenantId, "server_actions", 5000, "ok", {
  kind: "server_action",
});
// force backlog alert via evaluate path
for (let i = 0; i < 60; i++) {
  await enqueueEnterpriseEvent(kit.outbox, {
    context: ctx,
    eventType: `OBS_BACKLOG_${i}`,
    aggregateType: "system",
    aggregateId: `sys-${i}`,
    payload: {},
  });
}
const alerts = await svc.getAlerts(ctx);
assert(Array.isArray(alerts), "Alerts: lista");
assert(
  alerts.every((a) => a.tenantId === tenantId),
  "Alerts: tenant isolation",
);
assert(
  alerts.some((a) => a.kind === "outbox_backlog" || a.kind === "high_latency"),
  "Alerts: backlog ou latency",
);

/* ── Snapshot / Dashboard KPIs ───────────────────────── */
const snap = await svc.snapshot(ctx);
assert(snap.kpis.systemHealth != null, "Dashboard: System Health");
assert(typeof snap.kpis.availabilityPct === "number", "Dashboard: Availability");
assert(typeof snap.kpis.latencyAvgMs === "number", "Dashboard: Latency");
assert(typeof snap.kpis.errors === "number", "Dashboard: Errors");
assert(typeof snap.kpis.requests === "number", "Dashboard: Requests");
assert(typeof snap.kpis.approvals === "number", "Dashboard: Approvals");
assert(typeof snap.kpis.notifications === "number", "Dashboard: Notifications");
assert(typeof snap.kpis.outboxPending === "number", "Dashboard: Outbox");
assert(typeof snap.kpis.timelineEvents === "number", "Dashboard: Timeline Events");
assert(
  read("components/observability/system-status.tsx").includes("Executive Dashboard"),
  "Dashboard UI: executive",
);
assert(
  read("app/(app)/[tenant]/observabilidade/page.tsx").includes("getObservabilitySnapshot"),
  "Page: server action",
);

/* ── Diagnostics ─────────────────────────────────────── */
const diag = await svc.diagnostics(ctx);
assert(diag.tenantId === tenantId, "Diagnostics: tenant");
assert(Array.isArray(diag.notes), "Diagnostics: notes");

console.log(`\nObservability — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
