/**
 * Sprint 21.4 — Tipos centrais do Approval Engine Enterprise.
 * Domínio puro · orientado a estados/regras · sem React · sem persistência.
 */

export type ApprovalTenantScope = "global" | "tenant";

export type ApprovalDefinitionStatus = "draft" | "active" | "archived";

export type ApprovalRequestStatus =
  | "requested"
  | "waiting"
  | "pending"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "returned"
  | "expired"
  | "cancelled"
  | "completed";

export type ApprovalLevelMode =
  | "single"
  | "sequential"
  | "parallel"
  | "mixed"
  | "group";

export type ApprovalDecisionType =
  | "APPROVE"
  | "REJECT"
  | "RETURN_FOR_ADJUSTMENT"
  | "CANCEL"
  | "EXPIRE"
  | "AUTO_APPROVE"
  | "AUTO_REJECT";

export type ApprovalActor = {
  userId: string | null;
  roles: readonly string[];
  permissions: readonly string[];
  type?: "user" | "system" | "service" | "unknown";
};

export type ApprovalTarget = {
  type: string;
  id: string | null;
  metadata?: Record<string, unknown>;
};

export type ApprovalSlaConfig = {
  /** Tempo máximo em minutos (estrutura · sem timer nesta sprint). */
  maxMinutes?: number | null;
  /** Minutos até alerta. */
  alertAfterMinutes?: number | null;
  /** Minutos até escalonamento. */
  escalateAfterMinutes?: number | null;
  /** Minutos até expiração. */
  expireAfterMinutes?: number | null;
  /** Permite reabertura após expiração/retorno. */
  allowReopen?: boolean;
  metadata?: Record<string, unknown>;
};

export type ApprovalRuleOp =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "exists"
  | "notExists"
  | "contains"
  | "between"
  | "all"
  | "any"
  | "not";

export type ApprovalRule = {
  id?: string;
  op: ApprovalRuleOp;
  path?: string;
  value?: unknown;
  values?: readonly unknown[];
  min?: number;
  max?: number;
  rules?: readonly ApprovalRule[];
  rule?: ApprovalRule;
};

/** Alçada por valor (configurável). */
export type ApprovalAmountBracket = {
  id: string;
  label: string;
  /** Valor máximo inclusivo; null = sem teto. */
  maxAmount: number | null;
  /** Valor mínimo inclusivo. */
  minAmount?: number;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  roleMode?: "any" | "all";
  permissionMode?: "any" | "all";
  levelIds?: readonly string[];
  metadata?: Record<string, unknown>;
};

export type ApprovalLevel = {
  id: string;
  name: string;
  description?: string;
  order: number;
  mode: ApprovalLevelMode;
  /** Quórum para parallel/group (default: todos). */
  quorum?: number | null;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  roleMode?: "any" | "all";
  permissionMode?: "any" | "all";
  /** Grupo lógico de aprovadores. */
  groupId?: string | null;
  /** Escalonar para este levelId após SLA. */
  escalateToLevelId?: string | null;
  sla?: ApprovalSlaConfig | null;
  rules?: readonly ApprovalRule[];
  metadata?: Record<string, unknown>;
};

export type ApprovalPolicy = {
  id: string;
  name: string;
  description?: string;
  brackets?: readonly ApprovalAmountBracket[];
  defaultLevelIds?: readonly string[];
  rules?: readonly ApprovalRule[];
  metadata?: Record<string, unknown>;
};

export type ApprovalDefinition = {
  id: string;
  version: string;
  name: string;
  description: string;
  tenantScope: ApprovalTenantScope;
  tenantId?: string | null;
  status: ApprovalDefinitionStatus;
  levels: readonly ApprovalLevel[];
  policy?: ApprovalPolicy | null;
  rules?: readonly ApprovalRule[];
  sla?: ApprovalSlaConfig | null;
  metadata?: Record<string, unknown>;
};

export type ApprovalContext = {
  tenantId: string | null;
  userId: string | null;
  roles: readonly string[];
  permissions: readonly string[];
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  correlationId: string | null;
  requestId: string | null;
  workflowId?: string | null;
  workflowInstanceId?: string | null;
  actor?: ApprovalActor;
  target?: ApprovalTarget | null;
  /** Valor monetário para alçadas (opcional). */
  amount?: number | null;
  category?: string | null;
  priority?: string | null;
  tags?: readonly string[];
};

export type ApprovalLevelProgress = {
  levelId: string;
  status: "waiting" | "pending" | "approved" | "rejected" | "skipped" | "expired";
  approvals: number;
  rejections: number;
  required: number;
  decidedBy: readonly string[];
};

export type ApprovalHistoryEntry = {
  id: string;
  at: string;
  decision: ApprovalDecisionType | null;
  levelId: string | null;
  fromStatus: ApprovalRequestStatus | null;
  toStatus: ApprovalRequestStatus;
  actor: ApprovalActor;
  comment: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
};

export type ApprovalPendingActionType =
  | "WRITE_AUDIT_EVENT"
  | "SEND_NOTIFICATION"
  | "SEND_EMAIL"
  | "SEND_PUSH"
  | "CREATE_INBOX"
  | "ESCALATE_LEVEL"
  | "EXPIRE_REQUEST"
  | "EMIT_WORKFLOW_EVENT";

export type ApprovalPendingAction = {
  id: string;
  type: ApprovalPendingActionType;
  description: string;
  payload: Record<string, unknown>;
  requestId: string;
  definitionId: string;
  tenantId: string | null;
  createdAt: string;
  origin: "decision" | "sla" | "system";
};

export type ApprovalRequest = {
  id: string;
  definitionId: string;
  definitionVersion: string;
  tenantId: string | null;
  status: ApprovalRequestStatus;
  currentLevelIds: readonly string[];
  levelProgress: readonly ApprovalLevelProgress[];
  target: ApprovalTarget | null;
  amount: number | null;
  category: string | null;
  priority: string | null;
  tags: readonly string[];
  context: ApprovalContext;
  history: readonly ApprovalHistoryEntry[];
  pendingActions: readonly ApprovalPendingAction[];
  sla: ApprovalSlaConfig | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  metadata: Record<string, unknown>;
};

export type ApprovalDecisionInput = {
  type: ApprovalDecisionType;
  levelId?: string | null;
  comment?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  now?: string | Date;
};

export type ApprovalDecisionReason =
  | "ALLOWED"
  | "DENY_BY_DEFAULT"
  | "DEFINITION_NOT_FOUND"
  | "REQUEST_INVALID"
  | "STATUS_BLOCKED"
  | "LEVEL_MISMATCH"
  | "ROLE_DENIED"
  | "PERMISSION_DENIED"
  | "RULE_FAILED"
  | "TENANT_MISMATCH"
  | "MISSING_TENANT"
  | "INVALID_CONTEXT"
  | "INVALID_DECISION"
  | "ALREADY_DECIDED";

export type ApprovalDecisionResult = {
  allowed: boolean;
  reason: ApprovalDecisionReason;
  message: string;
  levelId: string | null;
};

export type ApprovalRunResult =
  | {
      ok: true;
      request: ApprovalRequest;
      decision: ApprovalDecisionResult;
      pendingActions: readonly ApprovalPendingAction[];
      auditIntent: ApprovalAuditIntent;
    }
  | {
      ok: false;
      decision: ApprovalDecisionResult;
      error: string;
      code: string;
    };

export type ApprovalAuditIntent = {
  event: "APPROVAL_DECISION_EXECUTED";
  definitionId: string;
  requestId: string;
  decision: ApprovalDecisionType;
  levelId: string | null;
  fromStatus: ApprovalRequestStatus;
  toStatus: ApprovalRequestStatus;
  actor: ApprovalActor;
  tenantId: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown>;
};

export type ApprovalValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ApprovalValidationResult = {
  valid: boolean;
  issues: readonly ApprovalValidationIssue[];
};
