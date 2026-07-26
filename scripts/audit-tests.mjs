#!/usr/bin/env node
/**
 * Sprint 21.2 — Enterprise Audit Platform
 * Domínio + contratos de UI · sem I/O · sem SQL · sem persistência.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUDIT_CATEGORIES,
  AUDIT_EVENT_CODES,
  AUDIT_SEVERITIES,
  __resetAuditRecorderSeqForTests,
  assertSameTenant,
  audit,
  buildAuditTimeline,
  createAuditContext,
  createAuditLogger,
  eventsByCategory,
  eventsByModule,
  eventsBySeverity,
  eventsByTenant,
  eventsByUser,
  exportAuditEvents,
  filterAuditEvents,
  filterByTenant,
  findByCorrelationId,
  findByRequestId,
  groupAuditEvents,
  isEmptyMetadata,
  isKnownAuditCategory,
  isKnownAuditEvent,
  isKnownAuditSeverity,
  latestAuditEvents,
  normalizeMetadata,
  recordAuditEvent,
  searchAuditEvents,
  sortAuditEvents,
} from "../lib/audit/index.ts";

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

console.log("\nEnterprise Audit Platform — Sprint 21.2\n");

__resetAuditRecorderSeqForTests();
audit.clear();

/* ── Catálogos ────────────────────────────────────────── */
assert(AUDIT_EVENT_CODES.length >= 25, "Eventos: catálogo mínimo");
assert(
  new Set(AUDIT_EVENT_CODES).size === AUDIT_EVENT_CODES.length,
  "Eventos: sem duplicatas",
);
assert(isKnownAuditEvent("PERMISSION_DENIED"), "Eventos: PERMISSION_DENIED");
assert(!isKnownAuditEvent("FOO_BAR"), "Eventos: desconhecido rejeitado");
assert(AUDIT_CATEGORIES.includes("Security"), "Categorias: Security");
assert(AUDIT_CATEGORIES.length === 12, "Categorias: 12 oficiais");
assert(!isKnownAuditCategory("Hacking"), "Categorias: inválida");
assert(AUDIT_SEVERITIES.includes("Critical"), "Severidade: Critical");
assert(AUDIT_SEVERITIES.length === 6, "Severidade: 6 níveis");
assert(!isKnownAuditSeverity("Fatal"), "Severidade: inválida");

/* ── Context ──────────────────────────────────────────── */
assert(createAuditContext(null) === null, "Context: null → null");
assert(
  createAuditContext({ tenantId: "" }) === null,
  "Context: tenant vazio → null",
);
const ctx = createAuditContext({
  tenantId: " tenant-a ",
  userId: "user-1",
  role: "diretor",
  origin: "rbac",
  correlationId: "corr-1",
  requestId: "req-1",
  sessionId: "sess-1",
  module: "security",
  ip: null,
  device: null,
});
assert(ctx?.tenantId === "tenant-a", "Context: trim tenantId");
assert(ctx?.actorType === "user", "Context: actor user inferido");
assert(ctx?.correlationId === "corr-1", "Context: correlationId");
assert(ctx?.requestId === "req-1", "Context: requestId");

/* ── Metadata ─────────────────────────────────────────── */
assert(isEmptyMetadata({}), "Metadata: vazia");
assert(isEmptyMetadata(null), "Metadata: null = vazia");
const meta = normalizeMetadata({
  permission: "financeiro.excluir",
  nested: { a: 1, b: undefined },
  arr: [1, "x", null],
  bad: Number.NaN,
});
assert(meta.permission === "financeiro.excluir", "Metadata: string ok");
assert(typeof meta.nested === "object", "Metadata: nested sanitizado");
assert(meta.bad === null, "Metadata: NaN → null");

/* ── Recorder ─────────────────────────────────────────── */
const badCtx = recordAuditEvent(null, { event: "AUTH_LOGIN" });
assert(!badCtx.ok && badCtx.code === "INVALID_CONTEXT", "Recorder: contexto inválido");

const noTenant = recordAuditEvent(
  { tenantId: "", userId: null },
  { event: "AUTH_LOGIN" },
);
assert(
  !noTenant.ok &&
    (noTenant.code === "MISSING_TENANT" || noTenant.code === "INVALID_CONTEXT"),
  "Recorder: tenant ausente",
);

const badEvent = recordAuditEvent(ctx, { event: "NOT_REAL" });
assert(!badEvent.ok && badEvent.code === "INVALID_EVENT", "Recorder: evento inválido");

const badCat = recordAuditEvent(ctx, {
  event: "AUTH_LOGIN",
  category: "Nope",
});
assert(!badCat.ok && badCat.code === "INVALID_CATEGORY", "Recorder: categoria inválida");

const badSev = recordAuditEvent(ctx, {
  event: "AUTH_LOGIN",
  severity: "Nope",
});
assert(!badSev.ok && badSev.code === "INVALID_SEVERITY", "Recorder: severidade inválida");

const ok = recordAuditEvent(ctx, {
  event: "PERMISSION_DENIED",
  description: "Acesso negado a financeiro.excluir",
  metadata: { permission: "financeiro.excluir" },
  targetId: "user-2",
  timestamp: "2026-07-26T12:00:00.000Z",
});
assert(ok.ok === true, "Recorder: evento válido");
if (ok.ok) {
  assert(ok.event.tenantId === "tenant-a", "Recorder: tenant preservado");
  assert(ok.event.event === "PERMISSION_DENIED", "Recorder: event code");
  assert(ok.event.category === "Security", "Recorder: category default");
  assert(ok.event.severity === "Warning", "Recorder: severity default");
  assert(ok.event.correlationId === "corr-1", "Recorder: correlation do contexto");
  assert(ok.event.requestId === "req-1", "Recorder: request do contexto");
  assert(ok.event.ip === null, "Recorder: ip placeholder");
  assert(ok.event.device === null, "Recorder: device placeholder");
  assert(ok.event.metadata.permission === "financeiro.excluir", "Recorder: metadata");
  assert(ok.event.targetType === "permission", "Recorder: target inferido");
}

/* ── Logger ───────────────────────────────────────────── */
const logger = createAuditLogger({ retainInMemory: true });
logger.clear();
const r1 = logger.log(ctx, { event: "AUTH_LOGIN" });
const r2 = logger.success(ctx, { event: "USER_CREATED", targetId: "u2" });
const r3 = logger.warning(ctx, { event: "ROLE_GRANTED" });
const r4 = logger.error(ctx, {
  event: "CONFIG_CHANGED",
  description: "falha simulada",
});
const r5 = logger.critical(ctx, { event: "PERMISSION_DENIED" });
assert(r1.ok && r2.ok && r3.ok && r4.ok && r5.ok, "Logger: log/success/warning/error/critical");
assert(logger.getEvents().length === 5, "Logger: buffer em memória");
assert(r2.ok && r2.event.severity === "Success", "Logger: success força severidade");
assert(r5.ok && r5.event.severity === "Critical", "Logger: critical força severidade");
assert(typeof audit.log === "function", "Logger: instância audit exportada (RBAC-ready)");

/* ── Multi-tenant ─────────────────────────────────────── */
const ctxB = createAuditContext({
  tenantId: "tenant-b",
  userId: "user-9",
  origin: "ui",
});
logger.log(ctxB, { event: "DASHBOARD_OPENED", module: "dashboard" });
const all = logger.getEvents();
assert(
  filterByTenant(all, "tenant-a").every((e) => e.tenantId === "tenant-a"),
  "Tenant: filtro isola tenant-a",
);
assert(
  filterByTenant(all, "tenant-b").length === 1,
  "Tenant: apenas eventos de tenant-b",
);
assert(
  assertSameTenant(filterByTenant(all, "tenant-a"), "tenant-a"),
  "Tenant: assertSameTenant true",
);
assert(
  !assertSameTenant(all, "tenant-a"),
  "Tenant: mistura detectada",
);

/* ── Timeline / ordenação / grouping ──────────────────── */
const mixed = [
  ...(ok.ok ? [ok.event] : []),
  ...logger.getEvents(),
];
const sortedDesc = sortAuditEvents(mixed, "desc");
assert(
  sortedDesc.length >= 2 &&
    new Date(sortedDesc[0].timestamp).getTime() >=
      new Date(sortedDesc[sortedDesc.length - 1].timestamp).getTime(),
  "Timeline: ordenação desc",
);
assert(latestAuditEvents(mixed, 2).length === 2, "Timeline: latest limit");
assert(
  eventsByUser(mixed, "user-1").every((e) => e.userId === "user-1"),
  "Timeline: por usuário",
);
assert(
  eventsByTenant(mixed, "tenant-b").length === 1,
  "Timeline: por tenant",
);
assert(
  eventsByModule(mixed, "dashboard").length >= 1,
  "Timeline: por módulo",
);
assert(
  eventsByCategory(mixed, "Security").length >= 1,
  "Timeline: por categoria",
);
assert(
  eventsBySeverity(mixed, "Critical").length >= 1,
  "Timeline: por severidade",
);
const groups = groupAuditEvents(filterByTenant(mixed, "tenant-a"), "category");
assert(groups.length >= 1 && groups[0].count >= 1, "Timeline: grouping");
const built = buildAuditTimeline(mixed, {
  tenantId: "tenant-a",
  limit: 10,
  groupBy: "severity",
});
assert(built.events.every((e) => e.tenantId === "tenant-a"), "Timeline: build isola tenant");
assert(built.groups != null && built.groups.length >= 1, "Timeline: build groups");

/* ── Search / filters ─────────────────────────────────── */
const filtered = filterAuditEvents(mixed, {
  tenantId: "tenant-a",
  category: "Security",
});
assert(
  filtered.every((e) => e.category === "Security" && e.tenantId === "tenant-a"),
  "Filters: category + tenant",
);
const searched = searchAuditEvents(mixed, {
  tenantId: "tenant-a",
  text: "permission financeiro",
  limit: 5,
});
assert(searched.length >= 1, "Search: texto");
assert(
  findByCorrelationId(mixed, "corr-1").length >= 1,
  "Search: correlationId",
);
assert(findByRequestId(mixed, "req-1").length >= 1, "Search: requestId");
assert(searchAuditEvents(mixed, { text: "" }).length === mixed.length, "Search: texto vazio");

/* ── Export ───────────────────────────────────────────── */
const jsonExp = exportAuditEvents(filterByTenant(mixed, "tenant-a"), "json", {
  tenantId: "tenant-a",
});
assert(jsonExp.format === "json" && jsonExp.content.includes("PERMISSION_DENIED"), "Export: JSON");
const csvExp = exportAuditEvents(filterByTenant(mixed, "tenant-a"), "csv");
assert(csvExp.format === "csv" && csvExp.content.includes("tenantId"), "Export: CSV");
const tlExp = exportAuditEvents(filterByTenant(mixed, "tenant-a"), "timeline");
assert(tlExp.format === "timeline" && tlExp.content.includes("Audit Timeline"), "Export: Timeline");
assert(!tlExp.content.includes("writeFile"), "Export: sem gravação de arquivo");

/* ── Edge cases ───────────────────────────────────────── */
assert(filterByTenant(mixed, "").length === 0, "Edge: tenant vazio");
assert(eventsByUser(mixed, "").length === 0, "Edge: user vazio");
assert(latestAuditEvents([], 5).length === 0, "Edge: lista vazia");
assert(
  recordAuditEvent(ctx, null).ok === false,
  "Edge: input null",
);

/* ── Componentes / arquivos ───────────────────────────── */
const files = [
  "lib/audit/types.ts",
  "lib/audit/events.ts",
  "lib/audit/categories.ts",
  "lib/audit/severity.ts",
  "lib/audit/actors.ts",
  "lib/audit/targets.ts",
  "lib/audit/metadata.ts",
  "lib/audit/formatter.ts",
  "lib/audit/logger.ts",
  "lib/audit/recorder.ts",
  "lib/audit/timeline.ts",
  "lib/audit/filters.ts",
  "lib/audit/search.ts",
  "lib/audit/exporter.ts",
  "lib/audit/context.ts",
  "lib/audit/index.ts",
  "components/audit/audit-event-card.tsx",
  "components/audit/audit-timeline.tsx",
  "components/audit/audit-severity-badge.tsx",
  "components/audit/audit-category-badge.tsx",
  "components/audit/audit-empty-state.tsx",
  "components/audit/audit-loading.tsx",
  "components/audit/audit-search.tsx",
  "components/audit/audit-filter.tsx",
  "components/audit/audit-details.tsx",
  "components/audit/index.ts",
];
for (const f of files) {
  assert(read(f).length > 0, `Arquivo: ${f}`);
}

const loggerSrc = read("lib/audit/logger.ts");
assert(
  loggerSrc.includes("audit.log") || loggerSrc.includes("log("),
  "Logger API: log",
);
assert(
  !read("lib/audit/index.ts").includes('from "react"'),
  "lib/audit: sem React",
);

const pkg = read("package.json");
assert(pkg.includes('"test:audit"'), "package.json: test:audit");

const timelineUi = read("components/audit/audit-timeline.tsx");
assert(timelineUi.includes("AuditTimeline"), "UI: AuditTimeline");
assert(read("components/audit/audit-search.tsx").includes("AuditSearch"), "UI: AuditSearch");
assert(read("components/audit/audit-filter.tsx").includes("AuditFilter"), "UI: AuditFilter");
assert(read("components/audit/audit-details.tsx").includes("AuditDetails"), "UI: AuditDetails");
assert(
  read("components/audit/audit-empty-state.tsx").includes('aria-live="polite"'),
  "UI: empty a11y",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
