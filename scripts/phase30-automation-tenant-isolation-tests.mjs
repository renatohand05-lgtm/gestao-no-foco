#!/usr/bin/env node
/**
 * Sprint 30.7 — Isolamento multi-tenant (dry-run + engine).
 */
import { simulateRule } from "../lib/automacoes/dry-run.ts";
import { runAutomationEngine } from "../lib/automacoes/engine.ts";

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

console.log("\nPhase 30.7 — automation tenant isolation\n");

const rule = {
  id: "rule-1",
  tenantId: "tenant-a",
  companyId: null,
  branchId: null,
  name: "Cross tenant test",
  description: "",
  module: "financeiro",
  triggerType: "fin.conta_vencida",
  triggerConfig: {},
  conditions: [{ id: "c1", field: "diasAtraso", op: "gte", value: 1 }],
  actions: [{ id: "a1", type: "criar_tarefa", label: "Tarefa" }],
  status: "active",
  priority: "media",
  requiresApproval: false,
  approvalRole: null,
  cooldownSeconds: 0,
  maxExecutions: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-08-02T10:00:00Z",
  updatedAt: "2026-08-02T10:00:00Z",
  archivedAt: null,
  templateId: null,
  segmentHints: [],
};

const ctxWrong = {
  tenantId: "tenant-b",
  fields: { diasAtraso: 5, entityId: "x1" },
};

const dry = simulateRule({ rule, ctx: ctxWrong });
check("simulateRule cross-tenant ok=false", dry.ok === false);
check(
  "simulateRule risco cross-tenant",
  dry.risks.some((r) => /cross-tenant/i.test(r)),
);
check("simulateRule persistedFinalAction false", dry.persistedFinalAction === false);
check("simulateRule blockedActions preenchido", dry.blockedActions.length >= 1);

const engine = runAutomationEngine({
  rule,
  ctx: ctxWrong,
  dryRun: false,
  recentExecutions: [],
});
check("engine status failed", engine.execution.status === "failed");
check("engine errorCode CROSS_TENANT", engine.execution.errorCode === "CROSS_TENANT");
check(
  "engine notification cross-tenant",
  engine.notificationHints.some((n) => /cross-tenant/i.test(n.body)),
);

const engineDry = runAutomationEngine({
  rule,
  ctx: ctxWrong,
  dryRun: true,
  recentExecutions: [],
});
check("engine dry-run cross-tenant failed", engineDry.execution.status === "failed");
check(
  "engine dry-run cross-tenant CROSS_TENANT",
  engineDry.execution.errorCode === "CROSS_TENANT",
);

const okCtx = { tenantId: "tenant-a", fields: { diasAtraso: 5, entityId: "x1" } };
const okDry = simulateRule({ rule, ctx: okCtx });
check("mesmo tenant simula", okDry.risks.every((r) => !/cross-tenant/i.test(r)));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
