#!/usr/bin/env node
/**
 * Sprint 21.4 — Enterprise Approval Engine
 * Domínio + contratos de UI · sem I/O · sem SQL · sem persistência.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ApprovalRegistry,
  __resetApprovalActionSeqForTests,
  __resetApprovalRequestSeqForTests,
  canDecide,
  cannotDecide,
  contextFromAuthSnapshot,
  contextFromWorkflowSnapshot,
  createApprovalContext,
  createApprovalRequest,
  createNotificationActions,
  createSlaConfig,
  createWriteAuditAction,
  deserializeApprovalDefinition,
  deserializeApprovalRequest,
  evaluateApprovalDecision,
  evaluateApprovalRule,
  explainApprovalDecision,
  freezeApprovalHistory,
  listApprovalHistory,
  parallelApprovalDefinition,
  paymentAmountApprovalDefinition,
  resolveAmountBracket,
  runApprovalDecision,
  sequentialApprovalDefinition,
  serializeApprovalDefinition,
  serializeApprovalRequest,
  singleApprovalDefinition,
  summarizeApproval,
  validateApprovalDefinition,
} from "../lib/approval/index.ts";

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

console.log("\nEnterprise Approval Engine — Sprint 21.4\n");

__resetApprovalActionSeqForTests();
__resetApprovalRequestSeqForTests();

const amountDef = paymentAmountApprovalDefinition("tenant-a");
const singleDef = singleApprovalDefinition();
const seqDef = sequentialApprovalDefinition();
const parallelDef = parallelApprovalDefinition();

/* ── Definições ───────────────────────────────────────── */
assert(validateApprovalDefinition(amountDef).valid, "Definição: alçadas válida");
assert(validateApprovalDefinition(singleDef).valid, "Definição: single válida");
assert(validateApprovalDefinition(seqDef).valid, "Definição: sequencial válida");
assert(validateApprovalDefinition(parallelDef).valid, "Definição: paralela válida");
assert(amountDef.levels.length === 4, "Níveis: 4 alçadas");
assert(amountDef.policy?.brackets?.length === 4, "Alçadas: 4 faixas");

/* ── Alçadas por valor ────────────────────────────────── */
assert(
  resolveAmountBracket(amountDef.policy.brackets, 3000)?.id === "upto-5k",
  "Alçada: até 5k",
);
assert(
  resolveAmountBracket(amountDef.policy.brackets, 15000)?.id === "upto-20k",
  "Alçada: até 20k",
);
assert(
  resolveAmountBracket(amountDef.policy.brackets, 50000)?.id === "upto-100k",
  "Alçada: até 100k",
);
assert(
  resolveAmountBracket(amountDef.policy.brackets, 250000)?.id === "above-100k",
  "Alçada: acima 100k",
);

/* ── SLA estrutural ───────────────────────────────────── */
const sla = createSlaConfig({
  maxMinutes: 1440,
  alertAfterMinutes: 240,
  escalateAfterMinutes: 720,
  expireAfterMinutes: 2880,
  allowReopen: true,
});
assert(sla.maxMinutes === 1440 && sla.allowReopen === true, "SLA: estrutura");
assert(amountDef.sla?.expireAfterMinutes != null, "SLA: definição com expiração");

/* ── Contexto / adapters ──────────────────────────────── */
const ctx = createApprovalContext({
  tenantId: "tenant-a",
  userId: "user-1",
  roles: ["financeiro", "financeiro"],
  permissions: ["financeiro.aprovar"],
  amount: 3000,
  correlationId: "corr-appr-1",
});
assert(ctx.roles.length === 1, "Contexto: roles dedup");

const rbacCtx = contextFromAuthSnapshot({
  tenantId: "tenant-a",
  userId: "user-1",
  roles: ["financeiro"],
  permissions: ["financeiro.aprovar"],
  amount: 3000,
});
assert(rbacCtx.permissions.includes("financeiro.aprovar"), "RBAC adapter");

const wfCtx = contextFromWorkflowSnapshot({
  tenantId: "tenant-a",
  userId: "user-1",
  workflowId: "payment-approval",
  workflowInstanceId: "wfi-1",
  roles: ["financeiro"],
  permissions: ["financeiro.aprovar"],
  amount: 3000,
});
assert(wfCtx.workflowInstanceId === "wfi-1", "Workflow adapter");

/* ── Request / single approve ─────────────────────────── */
const req5k = createApprovalRequest({
  definition: amountDef,
  context: ctx,
  amount: 3000,
  target: { type: "payment", id: "pay-1" },
});
assert(req5k.status === "pending", "Request: pending");
assert(req5k.currentLevelIds.includes("supervisor"), "Request: nível supervisor");

assert(
  canDecide(amountDef, req5k, { type: "APPROVE" }, ctx),
  "Allow: APPROVE supervisor",
);
assert(
  cannotDecide(
    amountDef,
    req5k,
    { type: "APPROVE" },
    createApprovalContext({
      tenantId: "tenant-a",
      userId: "u2",
      roles: ["visualizacao"],
      permissions: [],
      amount: 3000,
    }),
  ),
  "Deny: sem permissão",
);

const approved = runApprovalDecision(amountDef, req5k, { type: "APPROVE" }, ctx);
assert(approved.ok === true, "Runner: APPROVE ok");
if (approved.ok) {
  assert(
    approved.request.status === "completed" ||
      approved.request.status === "approved",
    "Runner: status final aprovado/completed",
  );
  assert(
    approved.pendingActions.some((a) => a.type === "WRITE_AUDIT_EVENT"),
    "Audit adapter: WRITE_AUDIT_EVENT",
  );
  assert(
    approved.pendingActions.some((a) => a.type === "SEND_NOTIFICATION"),
    "Notification adapter: SEND_NOTIFICATION",
  );
  assert(
    approved.auditIntent.event === "APPROVAL_DECISION_EXECUTED",
    "Audit intent tipado",
  );
  assert(Object.isFrozen(freezeApprovalHistory(approved.request.history)), "Histórico: freeze");
}

/* ── Reject / cancel / return / expire ────────────────── */
const reqReject = createApprovalRequest({
  definition: amountDef,
  context: ctx,
  amount: 2000,
});
const rejected = runApprovalDecision(
  amountDef,
  reqReject,
  { type: "REJECT" },
  ctx,
);
assert(rejected.ok && rejected.request.status === "rejected", "Decisão: REJECT");

const reqCancel = createApprovalRequest({
  definition: singleDef,
  context: createApprovalContext({
    tenantId: "t1",
    userId: "u",
    permissions: ["os.aprovar"],
  }),
});
const cancelled = runApprovalDecision(singleDef, reqCancel, { type: "CANCEL" });
assert(cancelled.ok && cancelled.request.status === "cancelled", "Decisão: CANCEL");

const reqReturn = createApprovalRequest({
  definition: singleDef,
  context: createApprovalContext({
    tenantId: "t1",
    userId: "u",
    permissions: ["os.aprovar"],
  }),
});
const returned = runApprovalDecision(singleDef, reqReturn, {
  type: "RETURN_FOR_ADJUSTMENT",
});
assert(returned.ok && returned.request.status === "returned", "Decisão: RETURN");

const reqExpire = createApprovalRequest({
  definition: singleDef,
  context: createApprovalContext({
    tenantId: "t1",
    userId: "u",
    permissions: ["os.aprovar"],
  }),
});
const expired = runApprovalDecision(singleDef, reqExpire, { type: "EXPIRE" });
assert(expired.ok && expired.request.status === "expired", "Decisão: EXPIRE");

/* ── Sequencial ───────────────────────────────────────── */
const seqCtx1 = createApprovalContext({
  tenantId: "t1",
  userId: "u1",
  permissions: ["compras.aprovar"],
});
const seqReq = createApprovalRequest({ definition: seqDef, context: seqCtx1 });
const seq1 = runApprovalDecision(seqDef, seqReq, { type: "APPROVE" }, seqCtx1);
assert(seq1.ok && seq1.request.currentLevelIds.includes("l2"), "Sequencial: avança L2");
const seqCtx2 = createApprovalContext({
  tenantId: "t1",
  userId: "u2",
  roles: ["diretor"],
  permissions: ["compras.aprovar"],
});
const seq2 = seq1.ok
  ? runApprovalDecision(seqDef, seq1.request, { type: "APPROVE" }, seqCtx2)
  : { ok: false };
assert(seq2.ok && seq2.request.status === "completed", "Sequencial: completa");

/* ── Paralela ─────────────────────────────────────────── */
const pFin = createApprovalContext({
  tenantId: "t1",
  userId: "fin-1",
  roles: ["financeiro"],
  permissions: ["financeiro.aprovar"],
});
const pOps = createApprovalContext({
  tenantId: "t1",
  userId: "ops-1",
  roles: ["operacoes"],
  permissions: ["estoque.aprovar_ajuste"],
});
const pReq = createApprovalRequest({ definition: parallelDef, context: pFin });
assert(
  pReq.currentLevelIds.includes("finance") && pReq.currentLevelIds.includes("ops"),
  "Paralela: ambos níveis",
);
const p1 = runApprovalDecision(
  parallelDef,
  pReq,
  { type: "APPROVE", levelId: "finance" },
  pFin,
);
assert(p1.ok && p1.request.status === "partially_approved", "Paralela: parcial");
const p2 = p1.ok
  ? runApprovalDecision(
      parallelDef,
      p1.request,
      { type: "APPROVE", levelId: "ops" },
      pOps,
    )
  : { ok: false };
assert(p2.ok && p2.request.status === "completed", "Paralela: completa");

/* ── Multi-tenant ─────────────────────────────────────── */
assert(
  evaluateApprovalDecision(
    amountDef,
    req5k,
    { type: "APPROVE" },
    createApprovalContext({
      tenantId: "tenant-b",
      userId: "u",
      roles: ["financeiro"],
      permissions: ["financeiro.aprovar"],
      amount: 3000,
    }),
  ).reason === "TENANT_MISMATCH",
  "Tenant: divergente",
);
assert(
  evaluateApprovalDecision(
    amountDef,
    req5k,
    { type: "APPROVE" },
    createApprovalContext({
      tenantId: null,
      userId: "u",
      permissions: ["financeiro.aprovar"],
    }),
  ).reason === "MISSING_TENANT",
  "Tenant: ausente",
);

/* ── Rules ────────────────────────────────────────────── */
const ruleSrc = {
  context: createApprovalContext({
    tenantId: "t",
    userId: "u",
    amount: 100,
    category: "opex",
    tags: ["urgent"],
    variables: { hour: 10 },
    priority: "high",
  }),
};
assert(
  evaluateApprovalRule({ op: "greaterThan", path: "amount", value: 50 }, ruleSrc),
  "Rule: amount",
);
assert(
  evaluateApprovalRule({ op: "equals", path: "category", value: "opex" }, ruleSrc),
  "Rule: category",
);
assert(
  evaluateApprovalRule({ op: "contains", path: "tags", value: "urgent" }, ruleSrc),
  "Rule: tags",
);
assert(
  evaluateApprovalRule(
    {
      op: "all",
      rules: [
        { op: "exists", path: "priority" },
        { op: "equals", path: "variables.hour", value: 10 },
      ],
    },
    ruleSrc,
  ),
  "Rule: all",
);
assert(!evaluateApprovalRule(null, ruleSrc), "Rule: null = false (deny-safe)");

/* ── Deny-by-default / already decided ────────────────── */
if (approved.ok) {
  assert(
    explainApprovalDecision(amountDef, approved.request, {
      type: "APPROVE",
    }, ctx).reason === "ALREADY_DECIDED",
    "Deny: já decidido",
  );
}
assert(
  !canDecide(null, req5k, { type: "APPROVE" }, ctx),
  "Deny: definition null",
);
assert(!canDecide(amountDef, null, { type: "APPROVE" }, ctx), "Deny: request null");
assert(
  evaluateApprovalDecision(amountDef, req5k, { type: "NOPE" }, ctx).reason ===
    "INVALID_DECISION",
  "Deny: decision inválida",
);

/* ── Timeline / summary ───────────────────────────────── */
if (approved.ok) {
  const summary = summarizeApproval(approved.request);
  assert(summary.decisionCount >= 1, "Timeline/summary: decisões");
  assert(listApprovalHistory(approved.request).length >= 2, "Histórico: entradas");
}

/* ── Registry / serializer ────────────────────────────── */
const registry = new ApprovalRegistry();
registry.register(amountDef);
registry.register(singleDef);
let threw = false;
try {
  registry.register(amountDef);
} catch {
  threw = true;
}
assert(threw, "Registry: duplicação");
assert(registry.get("payment-amount-approval")?.version === "1.0.0", "Registry: get");

const json = serializeApprovalDefinition(amountDef);
assert(deserializeApprovalDefinition(json).id === amountDef.id, "Serializer: definition");
const rj = serializeApprovalRequest(req5k);
assert(deserializeApprovalRequest(rj).id === req5k.id, "Serializer: request");

/* ── Notification/Audit helpers ───────────────────────── */
const notif = createNotificationActions({
  requestId: "r1",
  definitionId: "d1",
  tenantId: "t1",
});
assert(notif.length === 4, "Notification: 4 ações tipadas");
assert(
  createWriteAuditAction({ event: "X" }, {
    requestId: "r1",
    definitionId: "d1",
    tenantId: "t1",
  }).type === "WRITE_AUDIT_EVENT",
  "Audit helper",
);

/* ── Workflow emit on decision ────────────────────────── */
const wfReq = createApprovalRequest({
  definition: singleDef,
  context: wfCtx,
});
const wfRun = runApprovalDecision(
  singleDef,
  wfReq,
  { type: "APPROVE" },
  {
    ...wfCtx,
    permissions: ["os.aprovar"],
  },
);
assert(
  wfRun.ok &&
    wfRun.pendingActions.some((a) => a.type === "EMIT_WORKFLOW_EVENT"),
  "Workflow adapter: EMIT_WORKFLOW_EVENT",
);

/* ── Edge cases ───────────────────────────────────────── */
assert(createApprovalContext(null).tenantId === null, "Edge: context null");
assert(createApprovalContext(undefined).roles.length === 0, "Edge: context undefined");
assert(
  resolveAmountBracket([], 100) === null,
  "Edge: brackets vazios",
);
assert(resolveAmountBracket(null, 100) === null, "Edge: brackets null");

/* ── Arquivos / UI ────────────────────────────────────── */
const files = [
  "lib/approval/types.ts",
  "lib/approval/approval-definition.ts",
  "lib/approval/approval-policy.ts",
  "lib/approval/approval-level.ts",
  "lib/approval/approval-request.ts",
  "lib/approval/approval-decision.ts",
  "lib/approval/approval-engine.ts",
  "lib/approval/approval-runner.ts",
  "lib/approval/approval-context.ts",
  "lib/approval/approval-history.ts",
  "lib/approval/approval-timeline.ts",
  "lib/approval/approval-rules.ts",
  "lib/approval/approval-validation.ts",
  "lib/approval/approval-errors.ts",
  "lib/approval/approval-registry.ts",
  "lib/approval/approval-serializer.ts",
  "lib/approval/index.ts",
  "components/approval/approval-status-badge.tsx",
  "components/approval/approval-level-card.tsx",
  "components/approval/approval-timeline.tsx",
  "components/approval/approval-history.tsx",
  "components/approval/approval-decision-panel.tsx",
  "components/approval/approval-empty-state.tsx",
  "components/approval/approval-loading.tsx",
  "components/approval/approval-details.tsx",
  "components/approval/approval-summary.tsx",
  "components/approval/approval-progress.tsx",
  "components/approval/index.ts",
];
for (const f of files) {
  assert(read(f).length > 0, `Arquivo: ${f}`);
}

assert(!read("lib/approval/index.ts").includes('from "react"'), "lib/approval: sem React");
assert(!read("lib/approval/approval-rules.ts").includes("eval("), "Rules: sem eval");
assert(
  read("components/approval/approval-decision-panel.tsx").includes("Regras ficam"),
  "UI: painel sem regras de domínio",
);
assert(read("package.json").includes('"test:approval"'), "package.json: test:approval");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
