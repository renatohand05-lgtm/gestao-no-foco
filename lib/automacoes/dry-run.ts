/**
 * Sprint 30.7 — Simulação / dry-run (não persiste ação final).
 */

import { actionRequiresApproval, validateActions } from "./actions-catalog.ts";
import {
  evaluateAllConditions,
  validateConditions,
  type ConditionContext,
} from "./conditions.ts";
import { buildCorrelationId } from "./idempotency.ts";
import { checkLoopPrevention } from "./loop-prevention.ts";
import { getTrigger } from "./triggers.ts";
import type {
  AutomationExecution,
  AutomationRule,
  DryRunResult,
} from "./types.ts";

export function simulateRule(args: {
  rule: AutomationRule;
  ctx: ConditionContext;
  recentExecutions?: AutomationExecution[];
  ruleChain?: string[];
  affectedRecords?: DryRunResult["affectedRecords"];
}): DryRunResult {
  const correlationId = buildCorrelationId("dry");
  const trigger = getTrigger(args.rule.triggerType);
  const knownFields = trigger?.fields ?? [];
  const condIssues = validateConditions(args.rule.conditions, knownFields);
  const actionErrors = validateActions(args.rule.actions);
  const risks: string[] = [
    ...condIssues.map((i) => i.message),
    ...actionErrors,
  ];

  if (args.ctx.tenantId !== args.rule.tenantId) {
    return {
      ok: false,
      ruleId: args.rule.id,
      tenantId: args.rule.tenantId,
      matched: false,
      matchedConditions: [],
      affectedRecords: [],
      proposedActions: [],
      risks: ["Cross-tenant bloqueado na simulação."],
      requiresApproval: true,
      blockedActions: args.rule.actions.map((a) => a.type),
      correlationId,
      persistedFinalAction: false,
    };
  }

  const loop = checkLoopPrevention({
    rule: args.rule,
    correlationId,
    ruleChain: args.ruleChain ?? [],
    recentExecutions: args.recentExecutions ?? [],
    tenantExecutionCountInWindow: (args.recentExecutions ?? []).filter(
      (e) => !e.dryRun,
    ).length,
  });
  if (!loop.ok) risks.push(loop.message);

  const { matched, matchedConditions } = evaluateAllConditions(
    args.rule.conditions,
    args.ctx,
  );

  const requiresApproval =
    args.rule.requiresApproval ||
    args.rule.actions.some((a) => actionRequiresApproval(a));

  const blockedActions = args.rule.actions
    .filter((a) => actionRequiresApproval(a) && !args.rule.requiresApproval)
    .map((a) => `${a.type} (sensível — aprovação recomendada)`);

  const affected =
    args.affectedRecords ??
    (matched
      ? [
          {
            id: String(args.ctx.fields.entityId ?? "sim-1"),
            label: String(args.ctx.fields.label ?? trigger?.label ?? "Registro"),
            evidence: `Gatilho ${args.rule.triggerType} com campos do contexto.`,
          },
        ]
      : []);

  return {
    ok: condIssues.length === 0 && actionErrors.length === 0 && loop.ok,
    ruleId: args.rule.id,
    tenantId: args.rule.tenantId,
    matched,
    matchedConditions,
    affectedRecords: affected,
    proposedActions: matched ? args.rule.actions : [],
    risks,
    requiresApproval,
    blockedActions,
    correlationId,
    persistedFinalAction: false,
  };
}
