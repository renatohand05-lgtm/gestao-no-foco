/**
 * Sprint 30.7 — Engine de avaliação/execução controlada.
 * Ações críticas nunca auto-executam sem aprovação.
 * Dry-run nunca persiste ação final.
 */

import { actionRequiresApproval, validateActions } from "./actions-catalog.ts";
import { canDecideApproval, executionBlockedWithoutApproval } from "./approvals.ts";
import {
  evaluateAllConditions,
  validateConditions,
  type ConditionContext,
} from "./conditions.ts";
import { simulateRule } from "./dry-run.ts";
import {
  buildCorrelationId,
  buildIdempotencyKey,
  classifyRetry,
  findDuplicateExecution,
  windowBucket,
} from "./idempotency.ts";
import { checkLoopPrevention } from "./loop-prevention.ts";
import { getTrigger } from "./triggers.ts";
import type {
  AutomationApproval,
  AutomationExecution,
  AutomationRule,
  DryRunResult,
} from "./types.ts";

export type EngineRunInput = {
  rule: AutomationRule;
  ctx: ConditionContext;
  dryRun: boolean;
  recentExecutions: AutomationExecution[];
  ruleChain?: string[];
  approval?: AutomationApproval | null;
  actorUserId?: string | null;
};

export type EngineRunResult = {
  execution: AutomationExecution;
  dryRunResult?: DryRunResult;
  pauseRule: boolean;
  notificationHints: Array<{
    title: string;
    body: string;
    category: "falha" | "execucao" | "aprovacao" | "alerta";
  }>;
};

function nowIso() {
  return new Date().toISOString();
}

export function runAutomationEngine(input: EngineRunInput): EngineRunResult {
  const started = nowIso();
  const correlationId = buildCorrelationId("exec");
  const entityId = String(input.ctx.fields.entityId ?? "unknown");
  const idempotencyKey = buildIdempotencyKey({
    tenantId: input.rule.tenantId,
    ruleId: input.rule.id,
    triggerType: input.rule.triggerType,
    entityId,
    windowBucket: windowBucket(),
  });

  const baseExecution: AutomationExecution = {
    id: `ex_${correlationId}`,
    tenantId: input.rule.tenantId,
    ruleId: input.rule.id,
    triggerType: input.rule.triggerType,
    triggerPayload: { ...input.ctx.fields },
    matchedConditions: [],
    actionsRequested: input.rule.actions,
    actionsExecuted: [],
    status: "queued",
    errorCode: null,
    errorMessage: null,
    retryCount: 0,
    idempotencyKey,
    correlationId,
    dryRun: input.dryRun,
    startedAt: started,
    finishedAt: null,
    createdAt: started,
  };

  const notifications: EngineRunResult["notificationHints"] = [];

  if (input.ctx.tenantId !== input.rule.tenantId) {
    return {
      execution: {
        ...baseExecution,
        status: "failed",
        errorCode: "CROSS_TENANT",
        errorMessage: "Tenant isolation violado.",
        finishedAt: nowIso(),
      },
      pauseRule: false,
      notificationHints: [
        {
          title: "Execução bloqueada",
          body: "Tentativa cross-tenant bloqueada.",
          category: "falha",
        },
      ],
    };
  }

  if (input.dryRun) {
    const dry = simulateRule({
      rule: input.rule,
      ctx: input.ctx,
      recentExecutions: input.recentExecutions,
      ruleChain: input.ruleChain,
    });
    return {
      execution: {
        ...baseExecution,
        status: dry.matched ? "completed" : "skipped",
        matchedConditions: dry.matchedConditions,
        actionsExecuted: dry.proposedActions.map((a) => ({
          actionId: a.id,
          type: a.type,
          status: "proposed" as const,
          result: { dryRun: true },
        })),
        finishedAt: nowIso(),
      },
      dryRunResult: dry,
      pauseRule: false,
      notificationHints: [],
    };
  }

  const dup = findDuplicateExecution(input.recentExecutions, idempotencyKey);
  if (dup) {
    return {
      execution: {
        ...baseExecution,
        status: "skipped",
        errorCode: "IDEMPOTENT",
        errorMessage: "Execução duplicada ignorada.",
        finishedAt: nowIso(),
      },
      pauseRule: false,
      notificationHints: [],
    };
  }

  const loop = checkLoopPrevention({
    rule: input.rule,
    correlationId,
    ruleChain: input.ruleChain ?? [],
    recentExecutions: input.recentExecutions,
    tenantExecutionCountInWindow: input.recentExecutions.filter((e) => !e.dryRun)
      .length,
  });
  if (!loop.ok) {
    notifications.push({
      title: "Regra pausada por segurança",
      body: loop.message,
      category: "falha",
    });
    return {
      execution: {
        ...baseExecution,
        status: "failed",
        errorCode: loop.code,
        errorMessage: loop.message,
        finishedAt: nowIso(),
      },
      pauseRule: loop.shouldPauseRule,
      notificationHints: notifications,
    };
  }

  const trigger = getTrigger(input.rule.triggerType);
  const issues = validateConditions(input.rule.conditions, trigger?.fields);
  const actionErrors = validateActions(input.rule.actions);
  if (issues.length || actionErrors.length) {
    return {
      execution: {
        ...baseExecution,
        status: "failed",
        errorCode: "VALIDATION",
        errorMessage: [...issues.map((i) => i.message), ...actionErrors].join(
          "; ",
        ),
        finishedAt: nowIso(),
      },
      pauseRule: false,
      notificationHints: [
        {
          title: "Regra falhou na validação",
          body: "Condições ou ações inválidas.",
          category: "falha",
        },
      ],
    };
  }

  let execution: AutomationExecution = {
    ...baseExecution,
    status: "evaluating",
  };

  const { matched, matchedConditions } = evaluateAllConditions(
    input.rule.conditions,
    input.ctx,
  );
  execution = { ...execution, matchedConditions };

  if (!matched) {
    return {
      execution: {
        ...execution,
        status: "skipped",
        finishedAt: nowIso(),
      },
      pauseRule: false,
      notificationHints: [],
    };
  }

  const needsApproval =
    input.rule.requiresApproval ||
    input.rule.actions.some((a) => actionRequiresApproval(a));

  if (
    executionBlockedWithoutApproval({
      requiresApproval: needsApproval,
      approvalStatus: input.approval?.status ?? null,
    })
  ) {
    return {
      execution: {
        ...execution,
        status: "waiting_approval",
        finishedAt: null,
      },
      pauseRule: false,
      notificationHints: [
        {
          title: "Nova aprovação",
          body: `Regra “${input.rule.name}” aguarda aprovação.`,
          category: "aprovacao",
        },
      ],
    };
  }

  execution = { ...execution, status: "executing" };
  const actionsExecuted: AutomationExecution["actionsExecuted"] = [];

  for (const action of input.rule.actions) {
    // Efeito interno controlado — rascunhos/alertas/tarefas marcados como executed
    // apenas no store de automações (não chama financeiro/estoque canônico).
    actionsExecuted.push({
      actionId: action.id,
      type: action.type,
      status: "executed",
      result: {
        entityId,
        draftOnly:
          action.type.startsWith("rascunho_") ||
          action.type === "criar_plano_acao",
        persistedDomainMutation: false,
      },
    });
  }

  const allOk = actionsExecuted.every((a) => a.status === "executed");
  execution = {
    ...execution,
    actionsExecuted,
    status: allOk ? "completed" : "partially_completed",
    finishedAt: nowIso(),
  };

  notifications.push({
    title: allOk ? "Execução concluída" : "Execução parcial",
    body: `Regra “${input.rule.name}” · ${actionsExecuted.length} ação(ões).`,
    category: "execucao",
  });

  return { execution, pauseRule: false, notificationHints: notifications };
}

export function decideApprovalAndContinue(args: {
  approval: AutomationApproval;
  actorUserId: string;
  decision: "approved" | "rejected" | "returned" | "cancelled" | "delegated";
  justification?: string | null;
  allowSelfApproval?: boolean;
  rule: AutomationRule;
  ctx: ConditionContext;
  recentExecutions: AutomationExecution[];
}) {
  const decided = canDecideApproval({
    approval: args.approval,
    actorUserId: args.actorUserId,
    decision: args.decision,
    justification: args.justification,
    allowSelfApproval: args.allowSelfApproval,
  });
  if (!decided.ok) return { approvalResult: decided, engine: null as EngineRunResult | null };

  if (args.decision !== "approved") {
    return { approvalResult: decided, engine: null };
  }

  const engine = runAutomationEngine({
    rule: args.rule,
    ctx: args.ctx,
    dryRun: false,
    recentExecutions: args.recentExecutions,
    approval: decided.approval,
    actorUserId: args.actorUserId,
  });
  return { approvalResult: decided, engine };
}

export function retryExecution(args: {
  execution: AutomationExecution;
  rule: AutomationRule;
  ctx: ConditionContext;
  recentExecutions: AutomationExecution[];
  approval?: AutomationApproval | null;
}): EngineRunResult {
  const decision = classifyRetry(args.execution.errorCode, args.execution.retryCount);
  if (!decision.retry) {
    return {
      execution: {
        ...args.execution,
        status: "failed",
        errorMessage: decision.reason,
        finishedAt: nowIso(),
      },
      pauseRule: false,
      notificationHints: [
        {
          title: "Retry negado",
          body: decision.reason,
          category: "falha",
        },
      ],
    };
  }
  const result = runAutomationEngine({
    rule: args.rule,
    ctx: args.ctx,
    dryRun: false,
    recentExecutions: args.recentExecutions.filter(
      (e) => e.idempotencyKey !== args.execution.idempotencyKey,
    ),
    approval: args.approval,
  });
  return {
    ...result,
    execution: {
      ...result.execution,
      retryCount: args.execution.retryCount + 1,
      id: args.execution.id,
    },
  };
}
