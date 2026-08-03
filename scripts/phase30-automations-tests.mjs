#!/usr/bin/env node
/**
 * Sprint 30.7 — Central de Automações: catálogo, templates, compose.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUTOMATION_TEMPLATES } from "../lib/automacoes/templates.ts";
import {
  ALLOWED_ACTIONS,
  BLOCKED_EXTERNAL_ACTIONS,
  isBlockedExternal,
} from "../lib/automacoes/actions-catalog.ts";
import { TRIGGER_CATALOG } from "../lib/automacoes/triggers.ts";
import { composeAutomationCentral } from "../lib/automacoes/compose-central.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

console.log("\nPhase 30.7 — automations (catalog / templates / compose)\n");

const coreFiles = [
  "lib/automacoes/types.ts",
  "lib/automacoes/triggers.ts",
  "lib/automacoes/actions-catalog.ts",
  "lib/automacoes/templates.ts",
  "lib/automacoes/compose-central.ts",
  "lib/automacoes/dry-run.ts",
  "lib/automacoes/engine.ts",
  "lib/automacoes/approvals.ts",
  "lib/automacoes/idempotency.ts",
  "lib/automacoes/loop-prevention.ts",
  "lib/automacoes/guards.ts",
  "lib/automacoes/index.ts",
  "components/automacoes/automacoes-central.tsx",
  "app/(app)/[tenant]/automacoes/page.tsx",
];

for (const f of coreFiles) {
  check(`arquivo ${f}`, existsSync(join(root, f)));
}

check("AUTOMATION_TEMPLATES >= 10", AUTOMATION_TEMPLATES.length >= 10);
check(
  "templates defaultActive false",
  AUTOMATION_TEMPLATES.every((t) => t.defaultActive === false),
);
check(
  "templates triggerType no catálogo",
  AUTOMATION_TEMPLATES.every((t) =>
    TRIGGER_CATALOG.some((tr) => tr.type === t.triggerType && tr.enabled),
  ),
);

check("ALLOWED_ACTIONS >= 15", ALLOWED_ACTIONS.length >= 15);
check(
  "BLOCKED externals inclui whatsapp/email/pagamento",
  ["whatsapp", "email", "pagamento", "baixa_estoque"].every(isBlockedExternal),
);
check(
  "validateActions bloqueia externo",
  BLOCKED_EXTERNAL_ACTIONS.every((t) => isBlockedExternal(t)),
);

const snapshot = composeAutomationCentral({
  tenantId: "tenant-a",
  schemaReady: true,
  rules: [
    {
      id: "r1",
      tenantId: "tenant-a",
      companyId: null,
      branchId: null,
      name: "Conta vencida",
      description: "",
      module: "financeiro",
      triggerType: "fin.conta_vencida",
      triggerConfig: {},
      conditions: [],
      actions: [{ id: "a1", type: "criar_tarefa", label: "Tarefa" }],
      status: "active",
      priority: "media",
      requiresApproval: false,
      approvalRole: null,
      cooldownSeconds: 3600,
      maxExecutions: null,
      createdBy: null,
      updatedBy: null,
      createdAt: "2026-08-02T10:00:00Z",
      updatedAt: "2026-08-02T10:00:00Z",
      archivedAt: null,
      templateId: null,
      segmentHints: [],
    },
    {
      id: "r2",
      tenantId: "tenant-a",
      companyId: null,
      branchId: null,
      name: "Pausada",
      description: "",
      module: "crm",
      triggerType: "crm.lead_sem_retorno",
      triggerConfig: {},
      conditions: [],
      actions: [{ id: "a1", type: "criar_alerta", label: "Alerta" }],
      status: "paused",
      priority: "baixa",
      requiresApproval: false,
      approvalRole: null,
      cooldownSeconds: 0,
      maxExecutions: null,
      createdBy: null,
      updatedBy: null,
      createdAt: "2026-08-02T09:00:00Z",
      updatedAt: "2026-08-02T09:00:00Z",
      archivedAt: null,
      templateId: null,
      segmentHints: [],
    },
  ],
  executions: [
    {
      id: "ex1",
      tenantId: "tenant-a",
      ruleId: "r1",
      triggerType: "fin.conta_vencida",
      triggerPayload: {},
      matchedConditions: [],
      actionsRequested: [],
      actionsExecuted: [
        {
          actionId: "a1",
          type: "criar_tarefa",
          status: "executed",
        },
      ],
      status: "completed",
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      idempotencyKey: "k1",
      correlationId: "c1",
      dryRun: false,
      startedAt: "2026-08-02T11:00:00Z",
      finishedAt: "2026-08-02T11:00:01Z",
      createdAt: "2026-08-02T11:00:00Z",
    },
  ],
  approvals: [
    {
      id: "ap1",
      tenantId: "tenant-a",
      ruleId: "r1",
      executionId: null,
      status: "pending",
      requestedBy: "u1",
      decidedBy: null,
      justification: null,
      createdAt: "2026-08-02T11:30:00Z",
      decidedAt: null,
      expiresAt: null,
      history: [],
    },
  ],
  notifications: [],
  audit: [],
  timeSavedMinutes: null,
});

check("compose tenantId", snapshot.tenantId === "tenant-a");
check("compose activeRules", snapshot.activeRules === 1);
check("compose pausedRules", snapshot.pausedRules === 1);
check("compose generatedTasks", snapshot.generatedTasks === 1);
check("compose waitingApproval", snapshot.waitingApproval.length === 1);
check(
  "compose health saudavel (1 pendência < limiar atenção)",
  snapshot.health === "saudavel",
);
check("compose modulesAutomated", snapshot.modulesAutomated.length >= 2);
check("compose nextTriggers", snapshot.nextTriggers.length >= 1);

const typesSrc = readFileSync(join(root, "lib/automacoes/types.ts"), "utf8");
check("types DryRunResult persistedFinalAction false", /persistedFinalAction:\s*false/.test(typesSrc));
check("types AutomationCentralSnapshot", /export type AutomationCentralSnapshot/.test(typesSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
