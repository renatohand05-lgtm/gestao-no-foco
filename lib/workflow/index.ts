/**
 * Sprint 21.3 — Workflow Engine Enterprise · API pública.
 * Domínio puro · sem React · sem SQL · sem I/O.
 */

export type {
  WorkflowAction,
  WorkflowActionType,
  WorkflowActor,
  WorkflowAuditIntent,
  WorkflowCondition,
  WorkflowConditionOp,
  WorkflowContext,
  WorkflowDecision,
  WorkflowDecisionReason,
  WorkflowDefinition,
  WorkflowHistoryEntry,
  WorkflowInstance,
  WorkflowPendingAction,
  WorkflowState,
  WorkflowStateType,
  WorkflowStatus,
  WorkflowTarget,
  WorkflowTenantScope,
  WorkflowTransition,
  WorkflowTransitionResult,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "./types.ts";

export {
  BLOCKED_STATUSES,
  TERMINAL_STATUSES,
  WORKFLOW_STATE_TYPES,
  WORKFLOW_STATUSES,
  createState,
  findState,
  isBlockedStatus,
  isKnownStateType,
  isKnownWorkflowStatus,
  isTerminalState,
  isTerminalStatus,
} from "./states.ts";

export {
  createTransition,
  sortTransitionsByPriority,
  transitionsForEvent,
} from "./transitions.ts";

export {
  evaluateCondition,
  evaluateConditions,
  type ConditionEvalSource,
} from "./conditions.ts";

export {
  WORKFLOW_ACTION_TYPES,
  __resetActionSeqForTests,
  createAction,
  createWriteAuditAction,
  isKnownActionType,
  materializePendingActions,
} from "./actions.ts";

export {
  createWorkflowDefinition,
  definitionKey,
  normalizeWorkflowDefinition,
  type CreateDefinitionInput,
} from "./definitions.ts";

export {
  canTransition,
  cannotTransition,
  evaluateTransition,
  explainTransition,
  getAvailableTransitions,
} from "./engine.ts";

export { runTransition } from "./runner.ts";

export {
  contextFromAuthSnapshot,
  createWorkflowContext,
  isValidWorkflowContext,
  type CreateWorkflowContextInput,
} from "./context.ts";

export {
  __resetInstanceSeqForTests,
  createWorkflowInstance,
  type CreateInstanceInput,
} from "./instance.ts";

export { appendHistory, freezeHistory, listHistory } from "./history.ts";

export {
  groupHistoryByActor,
  groupHistoryByState,
  historyByPeriod,
  historyByTargetState,
  summarizeTimeline,
  type WorkflowTimelineGroup,
} from "./timeline.ts";

export { validateWorkflowDefinition } from "./validation.ts";

export {
  InvalidTransitionError,
  InvalidWorkflowDefinitionError,
  WORKFLOW_ERROR_CODES,
  WorkflowConditionError,
  WorkflowError,
  WorkflowNotFoundError,
  isWorkflowError,
  type WorkflowErrorCode,
} from "./errors.ts";

export { WorkflowRegistry, workflowRegistry } from "./registry.ts";

export {
  deserializeWorkflowDefinition,
  deserializeWorkflowInstance,
  serializeWorkflowDefinition,
  serializeWorkflowInstance,
} from "./serializer.ts";

export {
  paymentApprovalWorkflow,
  serviceOrderWorkflow,
  stockAdjustmentWorkflow,
} from "./examples.ts";
