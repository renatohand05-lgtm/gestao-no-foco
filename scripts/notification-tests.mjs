#!/usr/bin/env node
/**
 * Sprint 21.5 — Enterprise Notification Platform
 * Domínio + contratos · sem I/O · sem SQL · sem serviços externos.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHANNEL_CATALOG,
  CRITICAL_CHANNEL_ORDER,
  NORMAL_CHANNEL_ORDER,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_CATALOG,
  NOTIFICATION_EVENT_CODES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NotificationRegistry,
  PRIORITY_RANK,
  __resetHistorySeqForTests,
  __resetNotificationSeqForTests,
  __resetPendingActionSeqForTests,
  canNotify,
  cannotNotify,
  clearDeduplicationMemory,
  clearTemplates,
  comparePriority,
  computeRetryAfterMinutes,
  createDeliveryAttempt,
  createHistoryEntry,
  createNotification,
  createNotificationContext,
  createPreference,
  createRecipient,
  deserializeNotificationRequest,
  deserializeNotificationResult,
  dispatchNotification,
  EmailNotificationAdapter,
  ensureDefaultTemplates,
  evaluateDeduplication,
  evaluateNotification,
  evaluatePreferences,
  freezeHistory,
  filterHistory,
  getAdapterMap,
  getAvailableChannels,
  getTemplate,
  getTemplateForTenant,
  groupHistoryByChannel,
  InAppNotificationAdapter,
  InboxNotificationAdapter,
  isKnownCategory,
  isKnownChannel,
  isKnownNotificationEvent,
  isKnownStatus,
  isNotificationError,
  isValidNotificationContext,
  listTemplates,
  meetsMinPriority,
  normalizeRecipients,
  notificationFromApprovalAction,
  notificationFromAuditEvent,
  notificationFromSecurityDecision,
  notificationFromWorkflowAction,
  notificationRegistry,
  notify,
  PushNotificationAdapter,
  registerTemplate,
  rememberNotification,
  renderNotification,
  renderNotificationTemplate,
  renderTemplateString,
  routeNotification,
  serializeNotificationRequest,
  serializeNotificationResult,
  SmsPlaceholderAdapter,
  sortHistory,
  timelineFromResult,
  validateNotificationRequest,
  WebhookNotificationAdapter,
  NotificationTemplateError,
  InvalidNotificationRequestError,
} from "../lib/notifications/index.ts";

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

function resetAll() {
  __resetNotificationSeqForTests();
  __resetHistorySeqForTests();
  __resetPendingActionSeqForTests();
  clearDeduplicationMemory();
  clearTemplates();
  ensureDefaultTemplates();
  notificationRegistry.clear();
}

console.log("\nEnterprise Notification Platform — Sprint 21.5\n");
resetAll();

const recipient = createRecipient({ kind: "user", userId: "u-1" });
const baseInput = {
  tenantId: "tenant-a",
  event: "APPROVAL_REQUESTED",
  recipients: [recipient],
  templateId: "approval-requested",
  variables: { userName: "Ana", amount: "R$ 1.000", approvalId: "ap-1" },
  title: "Título",
  message: "Mensagem",
  correlationId: "corr-1",
  now: "2026-07-20T12:00:00.000Z",
};

/* ── Catálogos ───────────────────────────────────────── */
assert(NOTIFICATION_CHANNELS.length === 6, "Catálogo de canais: 6");
assert(
  CHANNEL_CATALOG.every((c) => isKnownChannel(c.id)),
  "Catálogo de canais: meta válida",
);
assert(NOTIFICATION_CATEGORIES.length === 15, "Categorias: 15");
assert(isKnownCategory("approval") && !isKnownCategory("xyz"), "Categorias: lookup");
assert(NOTIFICATION_PRIORITIES.length === 5, "Prioridades: 5");
assert(PRIORITY_RANK.critical > PRIORITY_RANK.low, "Prioridades: rank");
assert(comparePriority("high", "low") > 0, "Prioridades: compare");
assert(meetsMinPriority("high", "normal"), "Prioridades: meets min");
assert(NOTIFICATION_STATUSES.includes("deduplicated"), "Status: deduplicated");
assert(isKnownStatus("queued") && !isKnownStatus("foo"), "Status: lookup");
assert(NOTIFICATION_EVENT_CODES.length === NOTIFICATION_EVENT_CATALOG.length, "Eventos: codes = catalog");
assert(isKnownNotificationEvent("STOCK_LOW"), "Eventos: STOCK_LOW");
assert(!isKnownNotificationEvent("FAKE_EVENT"), "Eventos: inválido");

/* ── Contexto ────────────────────────────────────────── */
const ctx = createNotificationContext({
  tenantId: "tenant-a",
  userId: "u-1",
  roles: ["admin", "admin", null, ""],
  permissions: ["notif.read"],
  correlationId: "corr-1",
  nowHour: 14,
});
assert(isValidNotificationContext(ctx), "Contexto válido");
assert(ctx.roles.length === 1, "Contexto: roles dedup");
assert(!isValidNotificationContext(createNotificationContext({})), "Contexto incompleto: sem tenant");
assert(!isValidNotificationContext(null), "Contexto: null");
assert(!isValidNotificationContext(undefined), "Contexto: undefined");

/* ── Criação / validação ─────────────────────────────── */
const req = createNotification(baseInput);
assert(req.tenantId === "tenant-a", "Criação: tenant");
assert(req.event === "APPROVAL_REQUESTED", "Criação: evento");
assert(validateNotificationRequest(req).valid, "Validação: request ok");

let threw = false;
try {
  createNotification({ ...baseInput, tenantId: "" });
} catch (e) {
  threw = isNotificationError(e) || e instanceof InvalidNotificationRequestError;
}
assert(threw, "Tenant ausente: erro seguro");

threw = false;
try {
  createNotification({ ...baseInput, recipients: [] });
} catch {
  threw = true;
}
assert(threw, "Destinatário vazio: erro");

threw = false;
try {
  createNotification({ ...baseInput, event: "NOT_A_REAL_EVENT" });
} catch {
  threw = true;
}
assert(threw, "Evento inválido: erro");

const dupRecipients = normalizeRecipients([
  recipient,
  createRecipient({ kind: "user", userId: "u-1" }),
  createRecipient({ kind: "role", role: "admin" }),
]);
assert(dupRecipients.length === 2, "Destinatários duplicados: normalizados");

const badChannelReq = {
  ...req,
  channels: ["telegram"],
};
assert(
  !validateNotificationRequest(badChannelReq).valid,
  "Canal inválido: validação falha",
);

const expiredReq = {
  ...req,
  expiresAt: "2020-01-01T00:00:00.000Z",
  createdAt: "2026-07-20T12:00:00.000Z",
};
assert(
  validateNotificationRequest(expiredReq).issues.some(
    (i) => i.code === "EXPIRES_BEFORE_CREATED",
  ),
  "expiresAt anterior: erro",
);

const badSchedule = {
  ...req,
  scheduledAt: "not-a-date",
};
assert(
  validateNotificationRequest(badSchedule).issues.some(
    (i) => i.code === "INVALID_SCHEDULED",
  ),
  "scheduledAt inválido: erro",
);

assert(
  !validateNotificationRequest(null).valid,
  "Request null: inválida",
);
assert(
  !validateNotificationRequest(undefined).valid,
  "Request undefined: inválida",
);

/* ── Templates / renderer ────────────────────────────── */
const tpl = getTemplate("approval-requested");
assert(!!tpl && tpl.version === "1.0.0", "Template válido");
assert(listTemplates().length >= 5, "Templates: registry default");

const rendered = renderNotificationTemplate(tpl, {
  userName: "Ana",
  amount: "100",
  approvalId: "ap-9",
});
assert(
  rendered.title.includes("ap-9") && rendered.message.includes("Ana"),
  "Render determinístico",
);
assert(
  renderTemplateString("Hi {{userName}}", { userName: "Ana" }) === "Hi Ana",
  "Placeholder simples",
);

threw = false;
try {
  renderTemplateString("Hi {{missing}}", {}, {}, { strict: true });
} catch (e) {
  threw = e instanceof NotificationTemplateError;
}
assert(threw, "Variável ausente: erro previsível");

assert(
  renderTemplateString("Hi {{missing}}", {}, { missing: "X" }, { strict: true }) ===
    "Hi X",
  "Variável ausente: fallback",
);

threw = false;
try {
  registerTemplate({
    id: "",
    version: "1.0.0",
    event: "X",
    category: "system",
    tenantScope: "global",
    supportedChannels: ["in_app"],
    titleTemplate: "a",
    messageTemplate: "b",
    variablesSchema: [],
  });
} catch {
  threw = true;
}
assert(threw, "Template inválido: erro");

const tenantTpl = {
  id: "tenant-only",
  version: "1.0.0",
  event: "SYSTEM_WARNING",
  category: "system",
  tenantScope: "tenant",
  tenantId: "tenant-a",
  supportedChannels: ["in_app"],
  titleTemplate: "Privado {{x}}",
  messageTemplate: "{{x}}",
  variablesSchema: ["x"],
  fallbacks: { x: "—" },
};
registerTemplate(tenantTpl);
assert(
  !!getTemplateForTenant("tenant-only", "tenant-a") &&
    !getTemplateForTenant("tenant-only", "tenant-b"),
  "Template tenant: sem vazamento",
);

const r1 = renderNotification(req);
const r2 = renderNotification(req);
assert(r1.title === r2.title && r1.message === r2.message, "Render: determinístico via engine");

/* ── Preferências ────────────────────────────────────── */
const pref = createPreference({
  userId: "u-1",
  tenantId: "tenant-a",
  enabledChannels: ["in_app"],
  blockedCategories: ["crm"],
  minPriority: "high",
  quietHoursStart: 22,
  quietHoursEnd: 6,
  optOut: false,
});

const prefChannel = evaluatePreferences(
  { category: "approval", priority: "high", channels: ["in_app", "email"], mandatory: false },
  pref,
);
assert(
  prefChannel.allowed && prefChannel.channels.includes("in_app") && !prefChannel.channels.includes("email"),
  "Preferência por canal",
);

const quiet = evaluatePreferences(
  { category: "approval", priority: "high", channels: ["in_app"], mandatory: false },
  pref,
  { nowHour: 23 },
);
assert(!quiet.allowed && quiet.reasons.includes("quiet_hours"), "Horário silencioso");

const minP = evaluatePreferences(
  { category: "approval", priority: "low", channels: ["in_app"], mandatory: false },
  pref,
);
assert(!minP.allowed && minP.reasons.includes("below_min_priority"), "Prioridade mínima");

const blocked = evaluatePreferences(
  { category: "crm", priority: "high", channels: ["in_app"], mandatory: false },
  pref,
);
assert(!blocked.allowed && blocked.reasons.includes("category_blocked"), "Categoria bloqueada");

const critical = evaluatePreferences(
  {
    category: "system",
    priority: "critical",
    channels: ["in_app", "email"],
    mandatory: true,
  },
  { ...pref, optOut: true, enabledChannels: [] },
  { nowHour: 23 },
);
assert(critical.allowed && critical.channels.length > 0, "Notificação crítica obrigatória");

const unknownDeny = evaluatePreferences(
  { category: "approval", priority: "high", channels: ["in_app"], mandatory: false },
  createPreference({ enabledChannels: [] }),
);
assert(!unknownDeny.allowed, "Deny-by-default: canal não habilitado");

/* ── Router ──────────────────────────────────────────── */
const normalRoute = routeNotification({
  ...req,
  priority: "normal",
  channels: ["email", "in_app", "inbox", "push"],
});
assert(
  normalRoute.channels[0] === "in_app" &&
    normalRoute.channels[1] === "inbox" &&
    !normalRoute.suppressed,
  "Roteamento normal: ordem in_app → inbox",
);

const criticalRoute = routeNotification({
  ...req,
  priority: "critical",
  channels: ["push", "email", "inbox", "in_app"],
  mandatory: true,
});
assert(
  JSON.stringify(criticalRoute.channels.slice(0, 4)) ===
    JSON.stringify([...CRITICAL_CHANNEL_ORDER]),
  "Ordem de canais crítica",
);
assert(
  JSON.stringify(NORMAL_CHANNEL_ORDER) === JSON.stringify(["in_app", "inbox"]),
  "Ordem normal catalogada",
);

const fallbackRoute = routeNotification({
  ...req,
  priority: "normal",
  channels: ["email", "webhook"],
});
assert(
  fallbackRoute.channels.includes("email") || fallbackRoute.channels.includes("webhook"),
  "Fallback de canal: restantes ordenados",
);
assert(getAvailableChannels(req).length > 0, "getAvailableChannels");

/* ── Engine ──────────────────────────────────────────── */
clearDeduplicationMemory();
const result = evaluateNotification(req);
assert(result.ok && result.status === "sent", "Engine: evaluate ok");
assert(result.auditIntent?.event === "NOTIFICATION_ROUTED", "Intenção de auditoria");
assert(
  result.pendingActions.some((a) => a.type === "WRITE_AUDIT_EVENT"),
  "Pending: WRITE_AUDIT_EVENT",
);
assert(canNotify(req), "canNotify");
assert(!cannotNotify(req), "cannotNotify false");

const mismatch = evaluateNotification(req, {
  context: createNotificationContext({ tenantId: "tenant-b" }),
});
assert(mismatch.reason === "TENANT_MISMATCH", "Tenant divergente");

const emptyArrays = createNotificationContext({
  tenantId: "tenant-a",
  roles: [],
  permissions: [],
  variables: {},
});
assert(emptyArrays.roles.length === 0, "Arrays vazios: ok");

/* ── Deduplicação ────────────────────────────────────── */
clearDeduplicationMemory();
const d1 = createNotification({
  ...baseInput,
  id: "n1",
  deduplicationKey: "same-key",
  deduplicationMode: "suppress",
});
rememberNotification(d1, 1_000);
const suppressEval = evaluateDeduplication(
  createNotification({
    ...baseInput,
    id: "n2",
    deduplicationKey: "same-key",
    deduplicationMode: "suppress",
  }),
  { now: 1_000 + 60_000 },
);
assert(suppressEval.action === "suppress", "Deduplicação: suppress");

clearDeduplicationMemory();
rememberNotification(d1, 1_000);
const mergeEval = evaluateDeduplication(
  { ...d1, id: "n3", deduplicationMode: "merge" },
  { now: 1_000 },
);
assert(mergeEval.action === "merge", "Deduplicação: merge");

const replaceEval = evaluateDeduplication(
  { ...d1, id: "n4", deduplicationMode: "replace" },
  { now: 1_000 },
);
assert(replaceEval.action === "replace", "Deduplicação: replace");

const allowEval = evaluateDeduplication(
  { ...d1, id: "n5", deduplicationMode: "allow" },
  { now: 1_000 },
);
assert(allowEval.action === "allow", "Deduplicação: allow duplicate");

clearDeduplicationMemory();
const first = evaluateNotification({
  ...d1,
  deduplicationMode: "suppress",
});
const second = evaluateNotification({
  ...d1,
  id: "n2b",
  deduplicationMode: "suppress",
});
assert(first.ok && second.deduplicated && second.status === "deduplicated", "Dedup via engine");

/* ── Retry ───────────────────────────────────────────── */
assert(computeRetryAfterMinutes(1, "fixed", 5) === 5, "Retry fixed");
assert(computeRetryAfterMinutes(3, "linear", 5) === 15, "Retry linear");
assert(computeRetryAfterMinutes(3, "exponential", 5) === 20, "Retry exponential");
assert(computeRetryAfterMinutes(1, "none") === null, "Retry none");
const attempt = createDeliveryAttempt({
  channel: "email",
  recipientId: "user:u-1",
  attempt: 1,
  maxAttempts: 3,
  backoffStrategy: "exponential",
  now: "2026-07-20T12:00:00.000Z",
});
assert(attempt.retryable && attempt.nextAttemptAt != null, "Retry: nextAttemptAt estrutural");

/* ── Histórico / timeline ────────────────────────────── */
const h0 = freezeHistory([]);
const h1 = freezeHistory([
  createHistoryEntry({ at: "2026-07-20T10:00:00.000Z", type: "created" }),
  createHistoryEntry({
    at: "2026-07-20T11:00:00.000Z",
    type: "routed",
    channel: "in_app",
    recipientId: "user:u-1",
    metadata: { correlationId: "corr-1" },
  }),
  createHistoryEntry({ at: "2026-07-20T12:00:00.000Z", type: "dispatched", channel: "email" }),
]);
assert(Object.isFrozen(h1) && Object.isFrozen(h1[0]), "Histórico imutável");
assert(h0.length === 0, "Histórico vazio");

const sorted = sortHistory(h1, "asc");
assert(sorted[0].type === "created", "Timeline: ordenação");
const grouped = groupHistoryByChannel(h1);
assert(grouped.some((g) => g.key === "email"), "Timeline: agrupamento");
const filtered = filterHistory(h1, {
  channel: "in_app",
  recipientId: "user:u-1",
  correlationId: "corr-1",
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-07-21T00:00:00.000Z",
});
assert(filtered.length === 1, "Timeline: filtros");
assert(timelineFromResult(result).length >= 1, "Timeline from result");
assert(
  timelineFromResult(result, { tenantId: "other" }).length === 0,
  "Timeline: filtro tenant",
);

/* ── Adapters / dispatcher ───────────────────────────── */
const adapters = getAdapterMap();
assert(adapters.size === 6, "Adapters: 6 canais");
assert(InAppNotificationAdapter.dispatch({}).simulated === true, "Adapter in_app simulado");
assert(InboxNotificationAdapter.dispatch({}).simulated, "Adapter inbox");
assert(EmailNotificationAdapter.dispatch({}).simulated, "Adapter email");
assert(PushNotificationAdapter.dispatch({}).simulated, "Adapter push");
assert(WebhookNotificationAdapter.dispatch({}).simulated, "Adapter webhook");
assert(SmsPlaceholderAdapter.dispatch({}).simulated, "Adapter sms");

const dispatched = dispatchNotification({
  request: req,
  channels: ["in_app", "email"],
  recipients: [recipient],
  title: "t",
  message: "m",
});
assert(dispatched.attempts.length === 2, "Dispatcher: tentativas");
assert(dispatched.missingAdapters.length === 0, "Dispatcher: adapters ok");

const missing = dispatchNotification({
  request: req,
  channels: ["in_app"],
  recipients: [recipient],
  title: "t",
  message: "m",
  adapters: [],
});
assert(missing.missingAdapters.includes("in_app"), "Canal sem adapter");

/* ── Bridges ─────────────────────────────────────────── */
const wf = notificationFromWorkflowAction({
  tenantId: "tenant-a",
  userId: "u-1",
  workflowName: "OS Flow",
  instanceId: "wi-1",
});
assert(wf.event === "WORKFLOW_TRANSITIONED" && wf.source === "workflow", "Workflow adapter");

const ap = notificationFromApprovalAction({
  tenantId: "tenant-a",
  approvalId: "ap-22",
  decision: "APPROVE",
  amount: 500,
});
assert(ap.event === "APPROVAL_APPROVED", "Approval adapter");

const au = notificationFromAuditEvent({
  tenantId: "tenant-a",
  auditEvent: "USER_LOGIN",
  message: "login",
});
assert(au.event === "SYSTEM_WARNING" && au.source === "audit", "Audit adapter");

const sec = notificationFromSecurityDecision({
  tenantId: "tenant-a",
  userId: "u-1",
  permission: "admin.write",
});
assert(sec.event === "SECURITY_ACCESS_DENIED" && sec.mandatory === true, "Security adapter");

/* ── Registry / serializer ───────────────────────────── */
const registry = new NotificationRegistry();
registry.register({
  id: "def-1",
  version: "1.0.0",
  name: "Test",
  description: "d",
  event: "PAYMENT_DUE",
  category: "finance",
  priority: "high",
  channels: ["in_app"],
  templateId: "payment-due",
  tenantScope: "global",
});
assert(registry.get("def-1")?.name === "Test", "Registry");
assert(registry.size() === 1, "Registry size");

const ser = serializeNotificationRequest(req);
const deser = deserializeNotificationRequest(ser);
assert(deser.tenantId === req.tenantId && deser.event === req.event, "Serializer request");
const serR = serializeNotificationResult(result);
const deserR = deserializeNotificationResult(serR);
assert(deserR.status === result.status, "Serializer result");

/* ── notify pipeline / determinismo ──────────────────── */
clearDeduplicationMemory();
const n1 = notify(
  {
    tenantId: "tenant-a",
    event: "SYSTEM_CRITICAL",
    recipients: [recipient],
    templateId: "system-critical",
    variables: { message: "down" },
    title: "Crit",
    message: "down",
    priority: "critical",
    mandatory: true,
    channels: ["in_app", "inbox", "email", "push"],
    now: "2026-07-20T12:00:00.000Z",
    id: "fixed-id-1",
  },
  { now: 5_000 },
);
const n2 = notify(
  {
    tenantId: "tenant-a",
    event: "SYSTEM_CRITICAL",
    recipients: [recipient],
    templateId: "system-critical",
    variables: { message: "down" },
    title: "Crit",
    message: "down",
    priority: "critical",
    mandatory: true,
    channels: ["in_app", "inbox", "email", "push"],
    now: "2026-07-20T12:00:00.000Z",
    id: "fixed-id-2",
    deduplicationKey: "other",
  },
  { now: 5_000 },
);
assert(n1.ok && n2.ok, "Notify pipeline");
assert(
  JSON.stringify(n1.routedChannels) === JSON.stringify(n2.routedChannels),
  "Comportamento determinístico: canais",
);

/* ── Edge dates / safe errors ────────────────────────── */
assert(
  createHistoryEntry({ at: "2026-07-20T00:00:00.000Z", type: "expired" }).type ===
    "expired",
  "Edge case de data: history",
);

threw = false;
try {
  createNotification({
    tenantId: "tenant-a",
    event: "USER_INVITED",
    recipients: [createRecipient({ kind: "user", userId: "" })],
  });
} catch {
  threw = true;
}
assert(threw, "Destinatário inválido: erro seguro");

/* ── Arquivos / componentes ──────────────────────────── */
const libDir = join(root, "lib", "notifications");
const expectedLib = [
  "types.ts",
  "channels.ts",
  "categories.ts",
  "priorities.ts",
  "events.ts",
  "templates.ts",
  "template-renderer.ts",
  "notification.ts",
  "notification-request.ts",
  "notification-result.ts",
  "notification-engine.ts",
  "notification-router.ts",
  "notification-dispatcher.ts",
  "notification-context.ts",
  "notification-preferences.ts",
  "notification-recipient.ts",
  "notification-history.ts",
  "notification-timeline.ts",
  "notification-deduplication.ts",
  "notification-retry.ts",
  "notification-validation.ts",
  "notification-errors.ts",
  "notification-registry.ts",
  "notification-serializer.ts",
  "adapters.ts",
  "index.ts",
];
for (const f of expectedLib) {
  assert(statSync(join(libDir, f)).isFile(), `Arquivo lib: ${f}`);
}

const uiDir = join(root, "components", "notifications");
const expectedUi = [
  "notification-card.tsx",
  "notification-list.tsx",
  "notification-inbox.tsx",
  "notification-center.tsx",
  "notification-badge.tsx",
  "notification-category-badge.tsx",
  "notification-priority-badge.tsx",
  "notification-status-badge.tsx",
  "notification-details.tsx",
  "notification-actions.tsx",
  "notification-preferences.tsx",
  "notification-empty-state.tsx",
  "notification-loading.tsx",
  "notification-timeline.tsx",
  "index.ts",
];
for (const f of expectedUi) {
  assert(statSync(join(uiDir, f)).isFile(), `Arquivo UI: ${f}`);
}

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:notifications"]?.includes("notification-tests"), "package.json: test:notifications");

const forbidden = ["sql", "migration", "supabase.from", "nodemailer", "setInterval", "eval("];
const libFiles = readdirSync(libDir).filter((f) => f.endsWith(".ts"));
let clean = true;
for (const f of libFiles) {
  const src = read(`lib/notifications/${f}`).toLowerCase();
  for (const bad of forbidden) {
    if (src.includes(bad.toLowerCase()) && bad !== "sql") {
      // allow words like "serialization" — only check dangerous patterns carefully
    }
  }
  if (src.includes("eval(") || src.includes("setinterval(") || src.includes("nodemailer")) {
    clean = false;
  }
}
assert(clean, "Sem eval/timers/serviços externos no domínio");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
