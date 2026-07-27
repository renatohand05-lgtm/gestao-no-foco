/**
 * Sprint 21.4 — Engine de avaliação (deny-by-default).
 */

import { isValidApprovalContext } from "./approval-context.ts";
import {
  isApprovalDecision,
  isKnownDecisionType,
  isTerminalDecision,
} from "./approval-decision.ts";
import { evaluateApprovalRules } from "./approval-rules.ts";
import type {
  ApprovalContext,
  ApprovalDecisionInput,
  ApprovalDecisionReason,
  ApprovalDecisionResult,
  ApprovalDefinition,
  ApprovalLevel,
  ApprovalRequest,
  ApprovalRequestStatus,
} from "./types.ts";

const SAFE: Record<ApprovalDecisionReason, string> = {
  ALLOWED: "Decisão permitida.",
  DENY_BY_DEFAULT: "Decisão não permitida.",
  DEFINITION_NOT_FOUND: "Definição de aprovação não encontrada.",
  REQUEST_INVALID: "Solicitação inválida.",
  STATUS_BLOCKED: "Status não permite decisão.",
  LEVEL_MISMATCH: "Nível de aprovação inválido.",
  ROLE_DENIED: "Papel insuficiente.",
  PERMISSION_DENIED: "Permissões insuficientes.",
  RULE_FAILED: "Regras de aprovação não satisfeitas.",
  TENANT_MISMATCH: "Tenant divergente.",
  MISSING_TENANT: "Tenant ausente.",
  INVALID_CONTEXT: "Contexto inválido.",
  INVALID_DECISION: "Tipo de decisão inválido.",
  ALREADY_DECIDED: "Solicitação já finalizada.",
};

const BLOCKED: readonly ApprovalRequestStatus[] = [
  "approved",
  "rejected",
  "returned",
  "expired",
  "cancelled",
  "completed",
];

function decision(
  partial: Omit<ApprovalDecisionResult, "message"> & { message?: string },
): ApprovalDecisionResult {
  return {
    ...partial,
    message: partial.message ?? SAFE[partial.reason],
  };
}

function checkTenant(
  definition: ApprovalDefinition,
  request: ApprovalRequest,
  context: ApprovalContext,
): ApprovalDecisionResult | null {
  if (!context.tenantId?.trim()) {
    return decision({
      allowed: false,
      reason: "MISSING_TENANT",
      levelId: null,
    });
  }

  if (definition.tenantScope === "tenant") {
    const defTenant = definition.tenantId?.trim() || null;
    if (!defTenant) {
      return decision({
        allowed: false,
        reason: "MISSING_TENANT",
        levelId: null,
      });
    }
    if (context.tenantId !== defTenant) {
      return decision({
        allowed: false,
        reason: "TENANT_MISMATCH",
        levelId: null,
      });
    }
  }

  if (request.tenantId && request.tenantId !== context.tenantId) {
    return decision({
      allowed: false,
      reason: "TENANT_MISMATCH",
      levelId: null,
    });
  }

  return null;
}

function checkRoles(level: ApprovalLevel, context: ApprovalContext): boolean {
  const required = level.requiredRoles ?? [];
  if (required.length === 0) return true;
  const mode = level.roleMode ?? "any";
  const roles = context.roles ?? [];
  return mode === "all"
    ? required.every((r) => roles.includes(r))
    : required.some((r) => roles.includes(r));
}

function checkPermissions(
  level: ApprovalLevel,
  context: ApprovalContext,
): boolean {
  const required = level.requiredPermissions ?? [];
  if (required.length === 0) return true;
  const mode = level.permissionMode ?? "all";
  const perms = context.permissions ?? [];
  return mode === "any"
    ? required.some((p) => perms.includes(p))
    : required.every((p) => perms.includes(p));
}

function resolveLevel(
  definition: ApprovalDefinition,
  request: ApprovalRequest,
  levelId?: string | null,
): ApprovalLevel | null {
  if (levelId) {
    return definition.levels.find((l) => l.id === levelId) ?? null;
  }
  if (request.currentLevelIds.length === 1) {
    return (
      definition.levels.find((l) => l.id === request.currentLevelIds[0]) ?? null
    );
  }
  // parallel: prefer first pending current
  for (const id of request.currentLevelIds) {
    const progress = request.levelProgress.find((p) => p.levelId === id);
    if (progress?.status === "pending") {
      return definition.levels.find((l) => l.id === id) ?? null;
    }
  }
  return null;
}

export function evaluateApprovalDecision(
  definition: ApprovalDefinition | null | undefined,
  request: ApprovalRequest | null | undefined,
  input: ApprovalDecisionInput | null | undefined,
  context?: ApprovalContext | null,
): ApprovalDecisionResult {
  if (!definition) {
    return decision({
      allowed: false,
      reason: "DEFINITION_NOT_FOUND",
      levelId: null,
    });
  }
  if (!request?.id) {
    return decision({
      allowed: false,
      reason: "REQUEST_INVALID",
      levelId: null,
    });
  }
  if (!input || !isKnownDecisionType(input.type)) {
    return decision({
      allowed: false,
      reason: "INVALID_DECISION",
      levelId: null,
    });
  }

  const ctx = context ?? request.context;
  if (!isValidApprovalContext(ctx)) {
    return decision({
      allowed: false,
      reason: "INVALID_CONTEXT",
      levelId: null,
    });
  }

  const tenantDeny = checkTenant(definition, request, ctx);
  if (tenantDeny) return tenantDeny;

  if (BLOCKED.includes(request.status)) {
    return decision({
      allowed: false,
      reason: "ALREADY_DECIDED",
      levelId: null,
    });
  }

  // CANCEL / EXPIRE / AUTO_* podem atuar sem nível específico
  const systemWide =
    input.type === "CANCEL" ||
    input.type === "EXPIRE" ||
    input.type === "AUTO_APPROVE" ||
    input.type === "AUTO_REJECT";

  if (systemWide) {
    if (
      !evaluateApprovalRules(definition.rules, {
        context: ctx,
        requestData: request.metadata,
      })
    ) {
      return decision({
        allowed: false,
        reason: "RULE_FAILED",
        levelId: null,
      });
    }
    return decision({
      allowed: true,
      reason: "ALLOWED",
      levelId: input.levelId ?? request.currentLevelIds[0] ?? null,
    });
  }

  const level = resolveLevel(definition, request, input.levelId);
  if (!level) {
    return decision({
      allowed: false,
      reason: "LEVEL_MISMATCH",
      levelId: input.levelId ?? null,
    });
  }

  if (!request.currentLevelIds.includes(level.id)) {
    return decision({
      allowed: false,
      reason: "LEVEL_MISMATCH",
      levelId: level.id,
    });
  }

  const progress = request.levelProgress.find((p) => p.levelId === level.id);
  if (!progress || progress.status !== "pending") {
    return decision({
      allowed: false,
      reason: "STATUS_BLOCKED",
      levelId: level.id,
    });
  }

  if (ctx.userId && progress.decidedBy.includes(ctx.userId)) {
    return decision({
      allowed: false,
      reason: "DENY_BY_DEFAULT",
      levelId: level.id,
      message: "Usuário já decidiu neste nível.",
    });
  }

  if (!checkRoles(level, ctx)) {
    return decision({
      allowed: false,
      reason: "ROLE_DENIED",
      levelId: level.id,
    });
  }

  if (!checkPermissions(level, ctx)) {
    return decision({
      allowed: false,
      reason: "PERMISSION_DENIED",
      levelId: level.id,
    });
  }

  const rulesOk =
    evaluateApprovalRules(definition.rules, {
      context: ctx,
      requestData: request.metadata,
    }) &&
    evaluateApprovalRules(definition.policy?.rules, {
      context: ctx,
      requestData: request.metadata,
    }) &&
    evaluateApprovalRules(level.rules, {
      context: ctx,
      requestData: request.metadata,
    });

  if (!rulesOk) {
    return decision({
      allowed: false,
      reason: "RULE_FAILED",
      levelId: level.id,
    });
  }

  if (
    !isApprovalDecision(input.type) &&
    !isTerminalDecision(input.type) &&
    input.type !== "RETURN_FOR_ADJUSTMENT"
  ) {
    return decision({
      allowed: false,
      reason: "INVALID_DECISION",
      levelId: level.id,
    });
  }

  return decision({
    allowed: true,
    reason: "ALLOWED",
    levelId: level.id,
  });
}

export function canDecide(
  definition: ApprovalDefinition | null | undefined,
  request: ApprovalRequest | null | undefined,
  input: ApprovalDecisionInput | null | undefined,
  context?: ApprovalContext | null,
): boolean {
  return evaluateApprovalDecision(definition, request, input, context).allowed;
}

export function cannotDecide(
  definition: ApprovalDefinition | null | undefined,
  request: ApprovalRequest | null | undefined,
  input: ApprovalDecisionInput | null | undefined,
  context?: ApprovalContext | null,
): boolean {
  return !canDecide(definition, request, input, context);
}

export function explainApprovalDecision(
  definition: ApprovalDefinition | null | undefined,
  request: ApprovalRequest | null | undefined,
  input: ApprovalDecisionInput | null | undefined,
  context?: ApprovalContext | null,
): ApprovalDecisionResult {
  return evaluateApprovalDecision(definition, request, input, context);
}
