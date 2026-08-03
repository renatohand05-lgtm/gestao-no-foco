#!/usr/bin/env node
/**
 * Sprint 30.7 — Idempotência: buildIdempotencyKey + findDuplicateExecution.
 */
import {
  buildIdempotencyKey,
  findDuplicateExecution,
  windowBucket,
  buildCorrelationId,
  shouldSkipIdempotentAction,
} from "../lib/automacoes/idempotency.ts";

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

console.log("\nPhase 30.7 — automation idempotency\n");

const key = buildIdempotencyKey({
  tenantId: "tenant-a",
  ruleId: "rule-1",
  triggerType: "fin.conta_vencida",
  entityId: "conta-99",
  windowBucket: "12345",
});
check(
  "buildIdempotencyKey formato",
  key === "tenant-a:rule-1:fin.conta_vencida:conta-99:12345",
);
check("windowBucket string", typeof windowBucket(120_000, 60_000) === "string");
check("buildCorrelationId prefixo", buildCorrelationId("auto").startsWith("auto_"));

const executions = [
  {
    id: "ex1",
    tenantId: "tenant-a",
    ruleId: "rule-1",
    triggerType: "fin.conta_vencida",
    triggerPayload: {},
    matchedConditions: [],
    actionsRequested: [],
    actionsExecuted: [],
    status: "completed",
    errorCode: null,
    errorMessage: null,
    retryCount: 0,
    idempotencyKey: key,
    correlationId: "c1",
    dryRun: false,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-08-02T10:00:00Z",
  },
  {
    id: "ex2",
    tenantId: "tenant-a",
    ruleId: "rule-1",
    triggerType: "fin.conta_vencida",
    triggerPayload: {},
    matchedConditions: [],
    actionsRequested: [],
    actionsExecuted: [],
    status: "failed",
    errorCode: "X",
    errorMessage: "fail",
    retryCount: 0,
    idempotencyKey: key,
    correlationId: "c2",
    dryRun: false,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-08-02T10:01:00Z",
  },
];

const dup = findDuplicateExecution(executions, key);
check("findDuplicateExecution completed", dup?.id === "ex1");
check(
  "findDuplicateExecution ignora failed-only",
  findDuplicateExecution([executions[1]], key) === undefined,
);

check(
  "shouldSkipIdempotentAction true quando já executou",
  shouldSkipIdempotentAction(
    [
      {
        ...executions[0],
        actionsExecuted: [
          {
            actionId: "a1",
            type: "criar_tarefa",
            status: "executed",
            result: { entityId: "conta-99" },
          },
        ],
      },
    ],
    { id: "rule-1" },
    "a1",
    "conta-99",
  ),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
