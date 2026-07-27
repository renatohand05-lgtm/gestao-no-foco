#!/usr/bin/env node
/**
 * Sprint 21.8 — Enterprise Activity Timeline
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
  TimelineError,
  assertTimelineReadPermission,
  buildTimelineDeepLink,
  createTimelineService,
  enrichTimelineActors,
  filterTimelineEvents,
  groupTimelineEvents,
  hasTimelineReadPermission,
  mapAuditToTimelineEvent,
  paginateTimelineEvents,
} from "../lib/timeline/index.ts";

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

console.log("\nEnterprise Activity Timeline — Sprint 21.8\n");

const kit = createMemoryEnterpriseKit();
kit.store.clear();
const tenantId = "tenant-timeline-a";
const tenantB = "tenant-timeline-b";

const ctx = createEnterpriseContext({
  tenantId,
  userId: "user-tl-1",
  roles: ["admin"],
  permissions: ["auditoria.visualizar"],
  correlationId: "corr-tl-1",
  source: "test",
});

const denied = createEnterpriseContext({
  tenantId,
  userId: "user-denied",
  permissions: [],
  source: "test",
});

const svc = createTimelineService({
  audit: kit.audit,
  workflow: kit.workflow,
  approval: kit.approval,
  notification: kit.notification,
  tenantSlug: "demo",
  resolveActorProfile: async (userId) => {
    if (userId === "user-tl-1") {
      return {
        id: userId,
        name: "Renato Timeline",
        avatar: "https://example.com/a.png",
        role: "Admin",
      };
    }
    return null;
  },
  listOutbox: async (t) => {
    if (!t) return [];
    return kit.store.outbox.filter((e) => e.tenantId === t);
  },
  countOutboxPending: (t) => kit.outbox.countByStatus(t, "pending"),
  resolveAuthorization: async (c) => ({
    tenantId: c.tenantId,
    userId: c.userId ?? "system",
    roles: [...c.roles],
    permissions: [...c.permissions],
  }),
});

/* ── Files ───────────────────────────────────────────── */
for (const file of [
  "lib/timeline/timeline-service.ts",
  "lib/timeline/timeline-query.ts",
  "lib/timeline/timeline-mappers.ts",
  "lib/timeline/timeline-filters.ts",
  "lib/timeline/timeline-types.ts",
  "lib/timeline/timeline-context.ts",
  "lib/timeline/timeline-validator.ts",
  "lib/timeline/timeline-errors.ts",
  "lib/timeline/index.ts",
  "lib/timeline/timeline-links.ts",
  "lib/timeline/timeline-enrichment.ts",
  "lib/timeline/actions.ts",
  "app/(app)/[tenant]/atividade/page.tsx",
  "app/(app)/[tenant]/atividade/loading.tsx",
  "components/timeline/activity-timeline-client.tsx",
  "components/timeline/timeline.tsx",
  "components/timeline/timeline-item.tsx",
  "components/timeline/timeline-group.tsx",
  "components/timeline/timeline-header.tsx",
  "components/timeline/timeline-filters.tsx",
  "components/timeline/timeline-search.tsx",
  "components/timeline/timeline-empty.tsx",
  "components/timeline/timeline-loading.tsx",
  "components/timeline/timeline-error.tsx",
  "components/timeline/timeline-sidebar.tsx",
  "components/timeline/timeline-details.tsx",
  "components/timeline/timeline-dashboard.tsx",
  "components/timeline/index.ts",
  "scripts/timeline-tests.mjs",
]) {
  assert(existsSync(join(root, file)), `Arquivo: ${file}`);
}

assert(read("lib/timeline/actions.ts").includes('"use server"'), "Server actions");
assert(read("lib/timeline/actions.ts").includes("listActivity"), "Server action: listActivity");
assert(read("lib/timeline/actions.ts").includes("searchActivity"), "Server action: searchActivity");
assert(read("lib/timeline/actions.ts").includes("getActivityDetails"), "Server action: getActivityDetails");
assert(
  read("app/(app)/[tenant]/atividade/page.tsx").includes("listActivity"),
  "Page: usa listActivity",
);
assert(
  read("app/(app)/[tenant]/atividade/page.tsx").includes("ActivityTimelineClient"),
  "Page: client dashboard",
);
assert(
  read("app/(app)/[tenant]/atividade/loading.tsx").includes("TimelineLoading"),
  "Page: loading state",
);
assert(
  read("components/timeline/activity-timeline-client.tsx").includes("TimelineEmpty"),
  "Client: empty state",
);
assert(
  read("components/timeline/activity-timeline-client.tsx").includes("getActivityDetails"),
  "Client: details panel action",
);

/* ── Seed multi-source ───────────────────────────────── */
await kit.audit.append({
  tenantId,
  userId: "user-tl-1",
  actorType: "user",
  systemActorKey: null,
  event: "CLIENTE_ATUALIZADO",
  category: "crm",
  severity: "info",
  targetType: "cliente",
  targetId: "cli-1",
  resource: null,
  module: "clientes",
  description: "Cliente atualizado",
  metadata: {},
  origin: "test",
  correlationId: "corr-tl-1",
  requestId: "req-1",
  sessionId: null,
  ipAddress: null,
  device: null,
});

await kit.audit.append({
  tenantId,
  userId: "user-tl-1",
  actorType: "user",
  systemActorKey: null,
  event: "APPROVAL_REQUESTED",
  category: "approval",
  severity: "high",
  targetType: "approval_request",
  targetId: "apr-1",
  resource: null,
  module: "approval",
  description: "Aprovação solicitada",
  metadata: {},
  origin: "test",
  correlationId: "corr-tl-1",
  requestId: "req-2",
  sessionId: null,
  ipAddress: null,
  device: null,
});

await kit.audit.append({
  tenantId: tenantB,
  userId: "other",
  actorType: "user",
  systemActorKey: null,
  event: "LEAK_ATTEMPT",
  category: "security",
  severity: "critical",
  targetType: "cliente",
  targetId: "cli-x",
  resource: null,
  module: "clientes",
  description: "Não deve vazar",
  metadata: {},
  origin: "test",
  correlationId: "corr-b",
  requestId: null,
  sessionId: null,
  ipAddress: null,
  device: null,
});

await kit.workflow.saveDefinition({
  tenantId,
  workflowKey: "os-flow",
  version: "1.0.0",
  name: "OS",
  status: "active",
  isActive: true,
  description: null,
  definition: {},
});
const wi = await kit.workflow.createInstance({
  tenantId,
  workflowDefinitionId: kit.store.workflowDefs[0].id,
  workflowKey: "os-flow",
  workflowVersion: "1.0.0",
  currentState: "draft",
  status: "running",
  targetType: "os",
  targetId: "os-1",
  data: {},
  metadata: {},
  correlationId: "corr-tl-1",
  startedAt: new Date().toISOString(),
  completedAt: null,
});
await kit.workflow.appendHistory({
  tenantId,
  workflowInstanceId: wi.id,
  transitionId: null,
  event: "SUBMIT",
  fromState: "draft",
  toState: "pending",
  actorId: "user-tl-1",
  actorType: "user",
  systemActorKey: null,
  reason: "Enviado",
  metadata: {},
  correlationId: "corr-tl-1",
  requestId: null,
});

const apr = await kit.approval.createRequest({
  id: newEntityId("apr"),
  tenantId,
  approvalDefinitionId: "def-1",
  approvalKey: "payment-amount",
  approvalVersion: "1.0.0",
  requesterActorType: "user",
  requesterId: "user-tl-1",
  requesterSystemKey: null,
  targetType: "payment",
  targetId: "pay-1",
  amount: 1000,
  currency: "BRL",
  currentLevel: "supervisor",
  status: "pending",
  data: {},
  metadata: {},
  correlationId: "corr-tl-1",
  expiresAt: null,
  completedAt: null,
});
await kit.approval.appendDecision({
  tenantId,
  approvalRequestId: apr.id,
  levelId: "supervisor",
  approverActorType: "user",
  approverId: "user-tl-1",
  approverSystemKey: null,
  approverRole: "financeiro",
  decision: "APPROVE",
  reason: "Ok",
  metadata: {},
  correlationId: "corr-tl-1",
  requestId: null,
});

const notif = await kit.notification.create({
  id: newEntityId("notif"),
  tenantId,
  event: "APPROVAL_REQUESTED",
  category: "approval",
  priority: "high",
  title: "Nova aprovação",
  message: "Há uma aprovação pendente",
  status: "queued",
  templateId: null,
  source: "test",
  metadata: {},
  correlationId: "corr-tl-1",
  requestId: null,
  scheduledAt: null,
  expiresAt: null,
  deduplicationKey: "n1",
});
await kit.notification.saveRecipients([
  {
    id: newEntityId("nrec"),
    tenantId,
    notificationId: notif.id,
    recipientType: "user",
    recipientId: "user-tl-1",
    channel: "in_app",
    status: "queued",
    readAt: null,
    deliveredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

await enqueueEnterpriseEvent(kit.outbox, {
  context: ctx,
  eventType: "APPROVAL_REQUESTED",
  aggregateType: "approval_request",
  aggregateId: apr.id,
  payload: { ok: true },
});

/* ── RBAC ────────────────────────────────────────────── */
assert(hasTimelineReadPermission(null, ctx), "RBAC: permitido");
assert(!hasTimelineReadPermission(null, denied), "RBAC: negado");
let deniedOk = false;
try {
  assertTimelineReadPermission(null, denied);
} catch (e) {
  deniedOk = e instanceof TimelineError;
}
assert(deniedOk, "RBAC: assert lança");

let deniedQuery = false;
try {
  await svc.queryGlobal(denied);
} catch (e) {
  deniedQuery = e instanceof TimelineError;
}
assert(deniedQuery, "RBAC: query bloqueada");

/* ── Aggregation ─────────────────────────────────────── */
const page = await svc.queryGlobal(ctx, {}, { limit: 50 });
assert(page.items.length >= 4, "Aggregation: múltiplas fontes");
assert(
  page.items.every((e) => e.tenantId === tenantId),
  "Tenant isolation: só tenant A",
);
assert(
  page.items.some((e) => e.source === "audit" || e.source === "erp"),
  "Aggregation: audit/erp",
);
assert(
  page.items.some((e) => e.source === "workflow"),
  "Aggregation: workflow",
);
assert(
  page.items.some((e) => e.source === "approval"),
  "Aggregation: approval",
);
assert(
  page.items.some((e) => e.source === "notifications"),
  "Aggregation: notifications",
);
assert(
  page.items.some((e) => e.source === "outbox"),
  "Aggregation: outbox",
);

const ids = new Set(page.items.map((e) => e.id));
assert(ids.size === page.items.length, "Aggregation: sem duplicatas");

/* ── Entity timeline ─────────────────────────────────── */
const entity = await svc.queryEntity(ctx, "cliente", "cli-1");
assert(entity.items.length >= 1, "Entity timeline: cliente");
assert(
  entity.items.every(
    (e) => e.entityId === "cli-1" || e.metadata?.targetId === "cli-1",
  ) || entity.items.some((e) => e.entityType === "cliente"),
  "Entity timeline: filtro tipo",
);

/* ── Filters / search ────────────────────────────────── */
const filtered = filterTimelineEvents(page.items, { source: "approval" });
assert(filtered.every((e) => e.source === "approval"), "Filters: source");

const searched = await svc.search(ctx, "Cliente");
assert(searched.items.length >= 1, "Search: texto livre");

const byModule = await svc.queryGlobal(ctx, { module: "clientes" });
assert(
  byModule.items.every((e) => e.module === "clientes"),
  "Filters: módulo",
);

/* ── Pagination ──────────────────────────────────────── */
const p1 = paginateTimelineEvents(page.items, { limit: 2, offset: 0 });
assert(p1.items.length === 2, "Pagination: limit");
assert(p1.hasMore === true || page.items.length <= 2, "Pagination: hasMore");
assert(p1.nextCursor != null || !p1.hasMore, "Pagination: cursor");

const cursorPage = await svc.queryGlobal(ctx, {}, { limit: 2, cursor: "0" });
assert(cursorPage.limit === 2, "Pagination: cursor page");

/* ── Grouping ────────────────────────────────────────── */
const groups = await svc.group(ctx, "day");
assert(groups.length >= 1, "Grouping: day");
const byModuleGroups = groupTimelineEvents(page.items, "module");
assert(byModuleGroups.length >= 1, "Grouping: module");
const byUser = groupTimelineEvents(page.items, "user");
assert(byUser.length >= 1, "Grouping: user");

/* ── Details ─────────────────────────────────────────── */
const first = page.items[0];
const details = await svc.getDetails(ctx, first.id);
assert(details.event.id === first.id, "Details: evento");
assert(details.metadata != null, "Details: metadata");

/* ── Dashboard ───────────────────────────────────────── */
const kpis = await svc.dashboard(ctx);
assert(typeof kpis.eventsToday === "number", "Dashboard: hoje");
assert(typeof kpis.eventsWeek === "number", "Dashboard: semana");
assert(typeof kpis.criticalEvents === "number", "Dashboard: críticos");
assert(kpis.approvals >= 1, "Dashboard: aprovações");
assert(kpis.workflows >= 1, "Dashboard: workflows");
assert(typeof kpis.outboxPending === "number", "Dashboard: outbox");

/* ── Mapper shape ────────────────────────────────────── */
const auditRow = kit.store.audit.find((e) => e.tenantId === tenantId);
const mapped = mapAuditToTimelineEvent(auditRow);
assert(mapped.id.startsWith("audit:"), "Mapper: id prefix");
assert(mapped.color && mapped.icon, "Mapper: visual");
assert("actorName" in mapped && "link" in mapped, "Mapper: campos padrão");

/* ── package.json ────────────────────────────────────── */
assert(
  read("package.json").includes("test:timeline"),
  "package.json: test:timeline",
);

/* ── No engine mutation ──────────────────────────────── */
assert(
  !read("lib/timeline/timeline-service.ts").includes("runApprovalDecision"),
  "Não modifica Approval Runtime",
);
assert(
  !read("lib/timeline/timeline-query.ts").includes("claimOutboxBatch"),
  "Outbox read-only (sem claim)",
);
assert(
  !read("lib/timeline/timeline-service.ts").includes("createMemoryEnterpriseKit"),
  "Service sem memory kit hardcoded",
);

/* ── Deep links ──────────────────────────────────────── */
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "cliente",
    entityId: "cli-1",
  }) === "/demo/clientes/cli-1",
  "Deep link: cliente",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "os",
    entityId: "os-1",
  }) === "/demo/ordens/os-1",
  "Deep link: OS",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "venda",
    entityId: "v-1",
  }) === "/demo/vendas/v-1",
  "Deep link: venda",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "conta",
    entityId: "c-1",
  }) === "/demo/financeiro/contas-pagar/c-1",
  "Deep link: conta",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "produto",
    entityId: "p-1",
  }) === "/demo/produtos/p-1",
  "Deep link: produto",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "funcionario",
    entityId: "f-1",
  }) === "/demo/oficina/mecanicos/f-1",
  "Deep link: funcionário",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "aprovacao",
    entityId: "a-1",
  }) === "/demo/aprovacoes/runtime",
  "Deep link: approval",
);
assert(
  buildTimelineDeepLink({
    tenantSlug: "demo",
    entityType: "workflow",
    entityId: "wf-1",
  })?.includes("/demo/atividade") === true,
  "Deep link: workflow",
);
assert(
  buildTimelineDeepLink({ entityType: "cliente", entityId: "cli-1" }) === null,
  "Deep link: sem tenant = null",
);
assert(
  buildTimelineDeepLink({ tenantSlug: "demo", entityType: "cliente" }) === null,
  "Deep link: sem id = null",
);
assert(
  page.items.some((e) => e.link && String(e.link).includes("/demo/")),
  "Deep link: aplicado na agregação",
);

/* ── Actor enrichment ────────────────────────────────── */
const enriched = await enrichTimelineActors(
  [
    {
      id: "x1",
      tenantId,
      entityType: "cliente",
      entityId: "cli-1",
      module: "clientes",
      category: "crm",
      title: "T",
      description: null,
      status: null,
      severity: "info",
      actor: { id: "user-tl-1", name: "user-tl-1", avatar: null, type: "user" },
      actorName: "user-tl-1",
      actorAvatar: null,
      createdAt: new Date().toISOString(),
      metadata: {},
      source: "erp",
      color: "#059669",
      icon: "box",
      link: null,
      correlationId: null,
      tags: [],
    },
  ],
  async (id) =>
    id === "user-tl-1"
      ? {
          id,
          name: "Renato Timeline",
          avatar: "https://example.com/a.png",
          role: "Admin",
        }
      : null,
);
assert(enriched[0].actorName === "Renato Timeline", "Enrichment: nome");
assert(enriched[0].actorAvatar?.includes("example.com") === true, "Enrichment: avatar");
assert(enriched[0].metadata.actorRole === "Admin", "Enrichment: cargo");

const noProfile = await enrichTimelineActors(
  [
    {
      ...enriched[0],
      actor: { id: "unknown", name: "unknown", avatar: null, type: "user" },
      actorName: "unknown",
      actorAvatar: null,
      metadata: {},
    },
  ],
  async () => null,
);
assert(noProfile[0].actorName === "unknown", "Enrichment: fallback actorId");

assert(
  page.items.some((e) => e.actorName === "Renato Timeline"),
  "Enrichment: aplicado no service",
);

/* ── Performance (single collect for page+kpis) ──────── */
const withKpis = await svc.queryGlobalWithKpis(ctx, {}, { limit: 10 });
assert(withKpis.page.items.length >= 1, "Performance: queryGlobalWithKpis page");
assert(typeof withKpis.kpis.eventsToday === "number", "Performance: KPIs sem 2ª collect");

console.log(`\nActivity Timeline — ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
