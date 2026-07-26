#!/usr/bin/env node
/**
 * Sprint 21.3 — Enterprise Workflow Engine
 * Domínio + contratos de UI · sem I/O · sem SQL · sem persistência.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  InvalidWorkflowDefinitionError,
  WorkflowRegistry,
  __resetActionSeqForTests,
  __resetInstanceSeqForTests,
  canTransition,
  cannotTransition,
  createAction,
  createState,
  createTransition,
  createWorkflowContext,
  createWorkflowDefinition,
  createWorkflowInstance,
  deserializeWorkflowDefinition,
  deserializeWorkflowInstance,
  evaluateCondition,
  evaluateTransition,
  explainTransition,
  freezeHistory,
  getAvailableTransitions,
  groupHistoryByState,
  listHistory,
  paymentApprovalWorkflow,
  runTransition,
  serializeWorkflowDefinition,
  serializeWorkflowInstance,
  serviceOrderWorkflow,
  stockAdjustmentWorkflow,
  summarizeTimeline,
  validateWorkflowDefinition,
} from "../lib/workflow/index.ts";

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

console.log("\nEnterprise Workflow Engine — Sprint 21.3\n");

__resetActionSeqForTests();
__resetInstanceSeqForTests();

const payment = paymentApprovalWorkflow("tenant-a");
const osWf = serviceOrderWorkflow();
const stock = stockAdjustmentWorkflow();

/* ── Definição ────────────────────────────────────────── */
assert(payment.id === "payment-approval", "Definição: payment criada");
assert(validateWorkflowDefinition(payment).valid, "Definição: payment válida");
assert(validateWorkflowDefinition(osWf).valid, "Definição: OS válida");
assert(validateWorkflowDefinition(stock).valid, "Definição: estoque válida");

let threw = false;
try {
  createWorkflowDefinition({
    id: "bad",
    name: "Bad",
    initialState: "x",
    finalStates: [],
    states: [createState({ id: "x", name: "X", isInitial: true })],
    transitions: [],
  });
} catch (e) {
  threw = e instanceof InvalidWorkflowDefinitionError;
}
assert(threw, "Definição: final ausente lança erro");

const noInitial = validateWorkflowDefinition({
  ...payment,
  initialState: "",
});
assert(!noInitial.valid, "Definição: initial ausente inválida");

const dupStates = validateWorkflowDefinition({
  ...payment,
  states: [
    ...payment.states,
    createState({ id: "draft", name: "Dup" }),
  ],
});
assert(
  dupStates.issues.some((i) => i.code === "DUPLICATE_STATE"),
  "Definição: IDs duplicados",
);

const orphan = validateWorkflowDefinition(
  createWorkflowDefinition({
    id: "orphan-test",
    name: "Orphan",
    initialState: "a",
    finalStates: ["b"],
    states: [
      createState({ id: "a", name: "A", isInitial: true }),
      createState({ id: "b", name: "B", isFinal: true, isTerminal: true }),
      createState({ id: "ghost", name: "Ghost" }),
    ],
    transitions: [
      createTransition({ id: "t1", event: "GO", from: "a", to: "b" }),
    ],
    strict: false,
  }),
);
assert(
  orphan.issues.some((i) => i.code === "ORPHAN_STATE"),
  "Definição: estado órfão",
);

const fromTerminal = validateWorkflowDefinition({
  ...payment,
  transitions: [
    ...payment.transitions,
    createTransition({
      id: "bad_from_paid",
      event: "REOPEN",
      from: "paid",
      to: "draft",
    }),
  ],
});
assert(
  fromTerminal.issues.some((i) => i.code === "TRANSITION_FROM_TERMINAL"),
  "Definição: transição de terminal inválida",
);

/* ── Contexto / instância ──────────────────────────────── */
const ctx = createWorkflowContext({
  tenantId: "tenant-a",
  userId: "user-1",
  roles: ["financeiro", "financeiro"],
  permissions: [
    "financeiro.criar",
    "financeiro.aprovar",
    "financeiro.transferir",
  ],
  variables: { amount: 150 },
  correlationId: "corr-wf-1",
});
assert(ctx.roles.length === 1, "Contexto: roles deduplicadas");
assert(createWorkflowContext(null).tenantId === null, "Contexto: null seguro");

const instance = createWorkflowInstance({
  definition: payment,
  context: ctx,
  target: { type: "payment", id: "pay-1" },
  data: { invoice: "NF-1" },
});
assert(instance.currentState === "draft", "Instância: estado inicial");
assert(instance.status === "active", "Instância: status active");
assert(instance.tenantId === "tenant-a", "Instância: tenant");
assert(instance.history.length === 1, "Instância: histórico criação");

/* ── Deny-by-default / transições ─────────────────────── */
assert(cannotTransition(payment, instance, "APPROVE", ctx), "Deny: APPROVE no draft");
assert(cannotTransition(payment, instance, "NOPE", ctx), "Deny: evento inexistente");
assert(canTransition(payment, instance, "SUBMIT", ctx), "Allow: SUBMIT");

const noPermCtx = createWorkflowContext({
  tenantId: "tenant-a",
  userId: "u2",
  roles: ["visualizacao"],
  permissions: [],
});
assert(
  cannotTransition(payment, instance, "SUBMIT", noPermCtx),
  "Deny: permissão requerida",
);

const d1 = evaluateTransition(payment, instance, "SUBMIT", ctx);
const d2 = evaluateTransition(payment, instance, "SUBMIT", ctx);
assert(JSON.stringify(d1) === JSON.stringify(d2), "Determinístico: mesma decisão");

/* ── Prioridade ───────────────────────────────────────── */
const prioDef = createWorkflowDefinition({
  id: "prio",
  name: "Prio",
  initialState: "a",
  finalStates: ["b", "c"],
  states: [
    createState({ id: "a", name: "A", isInitial: true }),
    createState({ id: "b", name: "B", isFinal: true, isTerminal: true }),
    createState({ id: "c", name: "C", isFinal: true, isTerminal: true }),
  ],
  transitions: [
    createTransition({
      id: "low",
      event: "GO",
      from: "a",
      to: "c",
      priority: 50,
    }),
    createTransition({
      id: "high",
      event: "GO",
      from: "a",
      to: "b",
      priority: 1,
    }),
  ],
});
const prioInst = createWorkflowInstance({
  definition: prioDef,
  context: createWorkflowContext({ tenantId: "tenant-a", userId: "u" }),
});
const prioDecision = evaluateTransition(prioDef, prioInst, "GO", prioInst.context);
assert(
  prioDecision.allowed && prioDecision.transition?.id === "high",
  "Prioridade: menor número vence",
);

/* ── Runner / histórico / ações / audit intent ────────── */
const submitted = runTransition(payment, instance, "SUBMIT", ctx, {
  now: "2026-07-26T15:00:00.000Z",
});
assert(submitted.ok === true, "Runner: SUBMIT ok");
if (submitted.ok) {
  assert(submitted.instance.currentState === "pending_approval", "Runner: novo estado");
  assert(submitted.instance.transitionCount === 1, "Runner: contador");
  assert(
    submitted.pendingActions.some((a) => a.type === "REQUEST_APPROVAL"),
    "Ações: REQUEST_APPROVAL pendente",
  );
  assert(
    submitted.pendingActions.some((a) => a.type === "WRITE_AUDIT_EVENT"),
    "Audit: WRITE_AUDIT_EVENT preparado",
  );
  assert(
    submitted.auditIntent.event === "WORKFLOW_TRANSITION_EXECUTED",
    "Audit: intent tipado",
  );
  assert(
    submitted.auditIntent.correlationId === "corr-wf-1",
    "Audit: correlationId",
  );

  const hist = listHistory(submitted.instance, "asc");
  assert(hist.length === 2, "Histórico: 2 entradas");
  const frozen = freezeHistory(hist);
  assert(Object.isFrozen(frozen), "Histórico: freeze");

  const approved = runTransition(
    payment,
    submitted.instance,
    "APPROVE",
    ctx,
  );
  assert(approved.ok === true, "Runner: APPROVE ok");

  const paid = approved.ok
    ? runTransition(payment, approved.instance, "PAY", ctx)
    : { ok: false };
  assert(paid.ok === true, "Runner: PAY ok");
  if (paid.ok) {
    assert(paid.instance.status === "completed", "Runner: completed");
    assert(
      cannotTransition(payment, paid.instance, "SUBMIT", ctx),
      "Terminal: nega novas transições",
    );
  }
}

/* ── Roles / permissions any/all ──────────────────────── */
const roleAny = createWorkflowDefinition({
  id: "role-any",
  name: "Role any",
  initialState: "a",
  finalStates: ["b"],
  states: [
    createState({ id: "a", name: "A", isInitial: true }),
    createState({ id: "b", name: "B", isFinal: true, isTerminal: true }),
  ],
  transitions: [
    createTransition({
      id: "t",
      event: "GO",
      from: "a",
      to: "b",
      requiredRoles: ["diretor", "financeiro"],
      roleMode: "any",
      requiredPermissions: ["financeiro.aprovar", "x.y"],
      permissionMode: "any",
    }),
  ],
});
const roleInst = createWorkflowInstance({
  definition: roleAny,
  context: createWorkflowContext({
    tenantId: "t1",
    userId: "u",
    roles: ["financeiro"],
    permissions: ["financeiro.aprovar"],
  }),
});
assert(canTransition(roleAny, roleInst, "GO", roleInst.context), "any role + any permission");

const roleAll = createWorkflowDefinition({
  id: "role-all",
  name: "Role all",
  initialState: "a",
  finalStates: ["b"],
  states: [
    createState({ id: "a", name: "A", isInitial: true }),
    createState({ id: "b", name: "B", isFinal: true, isTerminal: true }),
  ],
  transitions: [
    createTransition({
      id: "t",
      event: "GO",
      from: "a",
      to: "b",
      requiredRoles: ["diretor", "financeiro"],
      roleMode: "all",
      requiredPermissions: ["p1", "p2"],
      permissionMode: "all",
    }),
  ],
});
const roleAllInst = createWorkflowInstance({
  definition: roleAll,
  context: createWorkflowContext({
    tenantId: "t1",
    userId: "u",
    roles: ["financeiro"],
    permissions: ["p1"],
  }),
});
assert(
  explainTransition(roleAll, roleAllInst, "GO", roleAllInst.context).reason ===
    "ROLE_DENIED",
  "all roles: ROLE_DENIED",
);

/* ── Condições ────────────────────────────────────────── */
const src = {
  context: createWorkflowContext({
    tenantId: "t",
    userId: "u",
    variables: { amount: 100, tag: "vip", list: ["a", "b"] },
    metadata: { channel: "web" },
  }),
  instance: { data: { sku: "ABC" } },
};
assert(
  evaluateCondition({ op: "equals", path: "variables.amount", value: 100 }, src),
  "Condição: equals",
);
assert(
  evaluateCondition({ op: "notEquals", path: "variables.amount", value: 1 }, src),
  "Condição: notEquals",
);
assert(
  evaluateCondition({ op: "greaterThan", path: "variables.amount", value: 50 }, src),
  "Condição: greaterThan",
);
assert(
  evaluateCondition({ op: "exists", path: "data.sku" }, src),
  "Condição: exists",
);
assert(
  evaluateCondition({ op: "contains", path: "variables.tag", value: "vi" }, src),
  "Condição: contains",
);
assert(
  evaluateCondition(
    {
      op: "all",
      conditions: [
        { op: "exists", path: "variables.amount" },
        { op: "greaterThanOrEqual", path: "variables.amount", value: 100 },
      ],
    },
    src,
  ),
  "Condição: all",
);
assert(
  evaluateCondition(
    {
      op: "any",
      conditions: [
        { op: "equals", path: "variables.amount", value: 1 },
        { op: "equals", path: "metadata.channel", value: "web" },
      ],
    },
    src,
  ),
  "Condição: any",
);
assert(
  evaluateCondition(
    { op: "not", condition: { op: "equals", path: "variables.amount", value: 1 } },
    src,
  ),
  "Condição: not",
);
assert(
  !evaluateCondition({ op: "equals", path: "variables.missing", value: 1 }, src),
  "Condição: path ausente = false",
);

/* ── Tenant ───────────────────────────────────────────── */
const wrongTenant = createWorkflowContext({
  tenantId: "tenant-b",
  userId: "u",
  permissions: ["financeiro.criar"],
});
assert(
  evaluateTransition(payment, instance, "SUBMIT", wrongTenant).reason ===
    "TENANT_MISMATCH",
  "Tenant: divergente",
);
assert(
  evaluateTransition(
    payment,
    instance,
    "SUBMIT",
    createWorkflowContext({
      tenantId: null,
      userId: "u",
      permissions: ["financeiro.criar"],
    }),
  ).reason === "MISSING_TENANT",
  "Tenant: ausente",
);

const globalOs = createWorkflowInstance({
  definition: osWf,
  context: createWorkflowContext({
    tenantId: "tenant-x",
    userId: "u",
    permissions: ["os.aprovar", "os.finalizar"],
  }),
});
assert(canTransition(osWf, globalOs, "START_DIAGNOSIS", globalOs.context), "Tenant: global ok com tenant");

/* ── Paused / cancelled ───────────────────────────────── */
const paused = { ...instance, status: "paused" };
assert(
  evaluateTransition(payment, paused, "SUBMIT", ctx).reason === "STATUS_BLOCKED",
  "Status: paused bloqueia",
);
const cancelled = { ...instance, status: "cancelled" };
assert(
  evaluateTransition(payment, cancelled, "SUBMIT", ctx).reason ===
    "TERMINAL_STATE",
  "Status: cancelled terminal",
);

/* ── Timeline / available ─────────────────────────────── */
if (submitted.ok) {
  const groups = groupHistoryByState(submitted.instance);
  assert(groups.length >= 1, "Timeline: groups");
  const summary = summarizeTimeline(submitted.instance);
  assert(summary.currentState === "pending_approval", "Timeline: summary");
  const available = getAvailableTransitions(
    payment,
    submitted.instance,
    ctx,
  );
  assert(
    available.some((t) => t.event === "APPROVE"),
    "Available: APPROVE",
  );
}

/* ── Registry / serializer ────────────────────────────── */
const registry = new WorkflowRegistry();
registry.register(payment);
registry.register(osWf);
threw = false;
try {
  registry.register(payment);
} catch {
  threw = true;
}
assert(threw, "Registry: previne duplicação");
assert(registry.get("payment-approval")?.version === "1.0.0", "Registry: get active");
assert(registry.list().length === 2, "Registry: list");

const json = serializeWorkflowDefinition(payment);
const round = deserializeWorkflowDefinition(json);
assert(round.id === payment.id && round.version === payment.version, "Serializer: definition roundtrip");
const ij = serializeWorkflowInstance(instance);
const ir = deserializeWorkflowInstance(ij);
assert(ir.id === instance.id, "Serializer: instance roundtrip");

/* ── Edge cases ───────────────────────────────────────── */
assert(!canTransition(null, instance, "SUBMIT", ctx), "Edge: definition null");
assert(!canTransition(payment, null, "SUBMIT", ctx), "Edge: instance null");
assert(!canTransition(payment, instance, null, ctx), "Edge: event null");
assert(!canTransition(payment, instance, undefined, ctx), "Edge: event undefined");
assert(
  evaluateCondition(null, src) === false,
  "Edge: condition null",
);
assert(
  evaluateCondition({ op: "all", conditions: [] }, src) === false,
  "Edge: all vazio",
);

/* ── Ações tipadas ────────────────────────────────────── */
assert(createAction("CREATE_TASK").type === "CREATE_TASK", "Ação: CREATE_TASK");
assert(
  createAction("SEND_NOTIFICATION").type === "SEND_NOTIFICATION",
  "Ação: SEND_NOTIFICATION",
);

/* ── Arquivos / UI ────────────────────────────────────── */
const files = [
  "lib/workflow/types.ts",
  "lib/workflow/definitions.ts",
  "lib/workflow/states.ts",
  "lib/workflow/transitions.ts",
  "lib/workflow/conditions.ts",
  "lib/workflow/actions.ts",
  "lib/workflow/engine.ts",
  "lib/workflow/runner.ts",
  "lib/workflow/context.ts",
  "lib/workflow/instance.ts",
  "lib/workflow/history.ts",
  "lib/workflow/timeline.ts",
  "lib/workflow/validation.ts",
  "lib/workflow/errors.ts",
  "lib/workflow/registry.ts",
  "lib/workflow/serializer.ts",
  "lib/workflow/index.ts",
  "components/workflow/workflow-status-badge.tsx",
  "components/workflow/workflow-state-badge.tsx",
  "components/workflow/workflow-timeline.tsx",
  "components/workflow/workflow-history.tsx",
  "components/workflow/workflow-transition-list.tsx",
  "components/workflow/workflow-empty-state.tsx",
  "components/workflow/workflow-loading.tsx",
  "components/workflow/workflow-details.tsx",
  "components/workflow/workflow-action-list.tsx",
  "components/workflow/index.ts",
];
for (const f of files) {
  assert(read(f).length > 0, `Arquivo: ${f}`);
}

assert(
  !read("lib/workflow/index.ts").includes('from "react"'),
  "lib/workflow: sem React",
);
assert(
  !read("lib/workflow/engine.ts").includes("eval("),
  "Engine: sem eval",
);
assert(
  read("components/workflow/workflow-transition-list.tsx").includes(
    "Sem regras de domínio",
  ) ||
    read("components/workflow/workflow-transition-list.tsx").includes(
      "dados já avaliados",
    ),
  "UI: transition list sem regras",
);
assert(read("package.json").includes('"test:workflow"'), "package.json: test:workflow");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
