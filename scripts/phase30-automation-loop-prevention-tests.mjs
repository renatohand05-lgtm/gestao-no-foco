#!/usr/bin/env node
/**
 * Sprint 30.7 — Loop prevention: self/cycle/cooldown.
 */
import { checkLoopPrevention, detectPotentialSelfLoop } from "../lib/automacoes/loop-prevention.ts";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 30.7 — automation loop prevention\n");

const rule = {
  id: "rule-a",
  tenantId: "tenant-a",
  companyId: null,
  branchId: null,
  name: "Regra A",
  description: "",
  module: "financeiro",
  triggerType: "fin.conta_vencida",
  triggerConfig: {},
  conditions: [],
  actions: [],
  status: "active",
  priority: "media",
  requiresApproval: false,
  approvalRole: null,
  cooldownSeconds: 300,
  maxExecutions: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-08-02T08:00:00Z",
  updatedAt: "2026-08-02T08:00:00Z",
  archivedAt: null,
  templateId: null,
  segmentHints: [],
};

const recentExec = {
  id: "ex-recent",
  tenantId: "tenant-a",
  ruleId: "rule-a",
  triggerType: "fin.conta_vencida",
  triggerPayload: {},
  matchedConditions: [],
  actionsRequested: [],
  actionsExecuted: [],
  status: "completed",
  errorCode: null,
  errorMessage: null,
  retryCount: 0,
  idempotencyKey: "k",
  correlationId: "c",
  dryRun: false,
  startedAt: "2026-08-02T10:00:00Z",
  finishedAt: "2026-08-02T10:00:01Z",
  createdAt: "2026-08-02T10:00:00Z",
};

const selfTrigger = checkLoopPrevention({
  rule,
  correlationId: "corr-1",
  ruleChain: ["rule-a"],
  recentExecutions: [],
  tenantExecutionCountInWindow: 0,
});
check("SELF_TRIGGER", !selfTrigger.ok && selfTrigger.code === "SELF_TRIGGER");
check("SELF_TRIGGER pausa regra", !selfTrigger.ok && selfTrigger.shouldPauseRule === true);

const cycle = checkLoopPrevention({
  rule: { ...rule, id: "rule-c" },
  correlationId: "corr-2",
  ruleChain: ["rule-a", "rule-b", "rule-a"],
  recentExecutions: [],
  tenantExecutionCountInWindow: 0,
});
check("CYCLE detectado", !cycle.ok && cycle.code === "CYCLE");

const cooldown = checkLoopPrevention({
  rule,
  correlationId: "corr-3",
  ruleChain: [],
  recentExecutions: [recentExec],
  nowMs: Date.parse("2026-08-02T10:01:00Z"),
  tenantExecutionCountInWindow: 1,
});
check("COOLDOWN ativo", !cooldown.ok && cooldown.code === "COOLDOWN");
check("COOLDOWN não pausa", !cooldown.ok && cooldown.shouldPauseRule === false);

const ok = checkLoopPrevention({
  rule: { ...rule, cooldownSeconds: 0 },
  correlationId: "corr-4",
  ruleChain: [],
  recentExecutions: [recentExec],
  nowMs: Date.parse("2026-08-02T10:01:00Z"),
  tenantExecutionCountInWindow: 1,
});
check("sem cooldown passa", ok.ok === true);

check(
  "detectPotentialSelfLoop",
  detectPotentialSelfLoop(rule, "rule-a") && !detectPotentialSelfLoop(rule, "rule-b"),
);

const recursion = checkLoopPrevention({
  rule: { ...rule, id: "rule-z", cooldownSeconds: 0 },
  correlationId: "corr-5",
  ruleChain: ["r1", "r2", "r3", "r4", "r5"],
  recentExecutions: [],
  tenantExecutionCountInWindow: 0,
});
check("RECURSION profundidade", !recursion.ok && recursion.code === "RECURSION");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
