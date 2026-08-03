#!/usr/bin/env node
/**
 * Sprint 30.7 — Dry-run: simulateRule nunca persiste ação final.
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

console.log("\nPhase 30.7 — automation dry-run\n");

const rule = {
  id: "rule-dry",
  tenantId: "tenant-a",
  companyId: null,
  branchId: null,
  name: "Dry run rule",
  description: "",
  module: "crm",
  triggerType: "crm.lead_sem_retorno",
  triggerConfig: {},
  conditions: [{ id: "c1", field: "diasSemContato", op: "gte", value: 3 }],
  actions: [
    { id: "a1", type: "rascunho_followup", label: "Follow-up" },
    { id: "a2", type: "criar_alerta", label: "Alerta" },
  ],
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

const ctx = {
  tenantId: "tenant-a",
  fields: { diasSemContato: 7, entityId: "lead-1", label: "Lead ACME" },
};

const dry = simulateRule({ rule, ctx });
check("simulateRule persistedFinalAction false", dry.persistedFinalAction === false);
check("simulateRule matched", dry.matched === true);
check("simulateRule proposedActions", dry.proposedActions.length === 2);
check("simulateRule correlationId dry", dry.correlationId.startsWith("dry_"));
check("simulateRule affectedRecords", dry.affectedRecords.length >= 1);

const engine = runAutomationEngine({
  rule,
  ctx,
  dryRun: true,
  recentExecutions: [],
});
check("engine dryRun flag", engine.execution.dryRun === true);
check("engine dryRunResult presente", Boolean(engine.dryRunResult));
check(
  "engine dryRunResult persistedFinalAction false",
  engine.dryRunResult?.persistedFinalAction === false,
);
check(
  "engine ações proposed (não executed real)",
  engine.execution.actionsExecuted.every((a) => a.status === "proposed"),
);
check(
  "engine result draftOnly/dryRun",
  engine.execution.actionsExecuted.every(
    (a) => a.result?.dryRun === true || a.result?.persistedDomainMutation === false,
  ),
);

const noMatch = simulateRule({
  rule,
  ctx: { tenantId: "tenant-a", fields: { diasSemContato: 1, entityId: "lead-2" } },
});
check("sem match proposedActions vazio", noMatch.proposedActions.length === 0);
check("sem match persistedFinalAction false", noMatch.persistedFinalAction === false);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
