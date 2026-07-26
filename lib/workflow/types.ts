/**
 * Sprint 21.3 — Tipos centrais do Workflow Engine Enterprise.
 * Domínio puro · orientado a estados/eventos · sem React · sem persistência.
 */

export type WorkflowStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed"
  | "blocked";

export type WorkflowStateType =
  | "initial"
  | "intermediate"
  | "approval"
  | "waiting"
  | "completed"
  | "cancelled"
  | "failed"
  | "blocked";

export type WorkflowTenantScope = "global" | "tenant";

export type WorkflowActor = {
  userId: string | null;
  roles: readonly string[];
  permissions: readonly string[];
  type?: "user" | "system" | "service" | "unknown";
};

export type WorkflowTarget = {
  type: string;
  id: string | null;
  metadata?: Record<string, unknown>;
};

export type WorkflowConditionOp =
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
  | "all"
  | "any"
  | "not";

export type WorkflowCondition = {
  op: WorkflowConditionOp;
  /** Caminho no contexto de avaliação (ex.: variables.amount). */
  path?: string;
  value?: unknown;
  values?: readonly unknown[];
  conditions?: readonly WorkflowCondition[];
  condition?: WorkflowCondition;
};

export type WorkflowActionType =
  | "CREATE_TASK"
  | "REQUEST_APPROVAL"
  | "SEND_NOTIFICATION"
  | "WRITE_AUDIT_EVENT"
  | "ASSIGN_OWNER"
  | "SET_DUE_DATE"
  | "UPDATE_METADATA"
  | "EMIT_DOMAIN_EVENT"
  | "PAUSE_WORKFLOW"
  | "COMPLETE_WORKFLOW";

export type WorkflowAction = {
  type: WorkflowActionType;
  description?: string;
  payload?: Record<string, unknown>;
};

export type WorkflowPendingAction = WorkflowAction & {
  id: string;
  workflowId: string;
  instanceId: string;
  transitionId: string;
  tenantId: string | null;
  createdAt: string;
  origin: "transition";
};

export type WorkflowState = {
  id: string;
  name: string;
  description: string;
  type: WorkflowStateType;
  isInitial: boolean;
  isFinal: boolean;
  isTerminal: boolean;
  metadata?: Record<string, unknown>;
};

export type WorkflowTransition = {
  id: string;
  event: string;
  from: string;
  to: string;
  description: string;
  conditions?: readonly WorkflowCondition[];
  requiredPermissions?: readonly string[];
  requiredRoles?: readonly string[];
  /** any (default) | all */
  permissionMode?: "any" | "all";
  roleMode?: "any" | "all";
  actions?: readonly WorkflowAction[];
  priority?: number;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
};

export type WorkflowDefinition = {
  id: string;
  version: string;
  name: string;
  description: string;
  tenantScope: WorkflowTenantScope;
  /** Obrigatório quando tenantScope = tenant. */
  tenantId?: string | null;
  initialState: string;
  finalStates: readonly string[];
  states: readonly WorkflowState[];
  transitions: readonly WorkflowTransition[];
  metadata?: Record<string, unknown>;
};

export type WorkflowContext = {
  tenantId: string | null;
  userId: string | null;
  roles: readonly string[];
  permissions: readonly string[];
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  correlationId: string | null;
  requestId: string | null;
  actor?: WorkflowActor;
  target?: WorkflowTarget | null;
};

export type WorkflowHistoryEntry = {
  id: string;
  at: string;
  fromState: string | null;
  toState: string;
  event: string | null;
  transitionId: string | null;
  actor: WorkflowActor;
  reason: string | null;
  metadata: Record<string, unknown>;
};

export type WorkflowInstance = {
  id: string;
  workflowId: string;
  workflowVersion: string;
  tenantId: string | null;
  status: WorkflowStatus;
  currentState: string;
  target: WorkflowTarget | null;
  data: Record<string, unknown>;
  context: WorkflowContext;
  history: readonly WorkflowHistoryEntry[];
  pendingActions: readonly WorkflowPendingAction[];
  createdAt: string;
  updatedAt: string;
  transitionCount: number;
  metadata: Record<string, unknown>;
};

export type WorkflowDecisionReason =
  | "ALLOWED"
  | "DENY_BY_DEFAULT"
  | "DEFINITION_NOT_FOUND"
  | "INSTANCE_INVALID"
  | "STATE_MISMATCH"
  | "EVENT_NOT_FOUND"
  | "TRANSITION_DISABLED"
  | "CONDITION_FAILED"
  | "PERMISSION_DENIED"
  | "ROLE_DENIED"
  | "TENANT_MISMATCH"
  | "MISSING_TENANT"
  | "TERMINAL_STATE"
  | "STATUS_BLOCKED"
  | "INVALID_CONTEXT";

export type WorkflowDecision = {
  allowed: boolean;
  reason: WorkflowDecisionReason;
  transition: WorkflowTransition | null;
  message: string;
  evaluatedTransitions: readonly string[];
};

export type WorkflowTransitionResult =
  | {
      ok: true;
      instance: WorkflowInstance;
      decision: WorkflowDecision;
      pendingActions: readonly WorkflowPendingAction[];
      auditIntent: WorkflowAuditIntent;
    }
  | {
      ok: false;
      decision: WorkflowDecision;
      error: string;
      code: string;
    };

/** Intenção de auditoria — sem chamar Audit Platform nesta sprint. */
export type WorkflowAuditIntent = {
  event: "WORKFLOW_TRANSITION_EXECUTED";
  workflowId: string;
  instanceId: string;
  fromState: string;
  toState: string;
  transitionId: string;
  actor: WorkflowActor;
  tenantId: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown>;
};

export type WorkflowValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type WorkflowValidationResult = {
  valid: boolean;
  issues: readonly WorkflowValidationIssue[];
};
