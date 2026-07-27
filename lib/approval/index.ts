/**
 * Sprint 21.4 — Approval Engine Enterprise · API pública.
 * Domínio puro · sem React · sem SQL · sem I/O.
 */

export type {
  ApprovalActor,
  ApprovalAmountBracket,
  ApprovalAuditIntent,
  ApprovalContext,
  ApprovalDecisionInput,
  ApprovalDecisionReason,
  ApprovalDecisionResult,
  ApprovalDecisionType,
  ApprovalDefinition,
  ApprovalDefinitionStatus,
  ApprovalHistoryEntry,
  ApprovalLevel,
  ApprovalLevelMode,
  ApprovalLevelProgress,
  ApprovalPendingAction,
  ApprovalPendingActionType,
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalRule,
  ApprovalRuleOp,
  ApprovalRunResult,
  ApprovalSlaConfig,
  ApprovalTarget,
  ApprovalTenantScope,
  ApprovalValidationIssue,
  ApprovalValidationResult,
} from "./types.ts";

export {
  APPROVAL_ERROR_CODES,
  ApprovalError,
  ApprovalNotFoundError,
  InvalidApprovalDecisionError,
  InvalidApprovalDefinitionError,
  isApprovalError,
  type ApprovalErrorCode,
} from "./approval-errors.ts";

export {
  evaluateApprovalRule,
  evaluateApprovalRules,
  type RuleEvalSource,
} from "./approval-rules.ts";

export {
  APPROVAL_LEVEL_MODES,
  createAmountBracket,
  createApprovalLevel,
  createApprovalPolicy,
  isKnownLevelMode,
  requiredApprovalsForLevel,
  resolveAmountBracket,
  sortLevelsByOrder,
} from "./approval-level.ts";

export {
  nextSequentialLevels,
  resolveInitialLevels,
} from "./approval-policy.ts";

export {
  createApprovalDefinition,
  createSlaConfig,
  definitionKey,
  normalizeApprovalDefinition,
  type CreateApprovalDefinitionInput,
} from "./approval-definition.ts";

export {
  contextFromAuthSnapshot,
  contextFromWorkflowSnapshot,
  createApprovalContext,
  isValidApprovalContext,
  type CreateApprovalContextInput,
} from "./approval-context.ts";

export {
  __resetApprovalRequestSeqForTests,
  createApprovalRequest,
  type CreateApprovalRequestInput,
} from "./approval-request.ts";

export {
  APPROVAL_ACTION_TYPES,
  APPROVAL_DECISION_TYPES,
  __resetApprovalActionSeqForTests,
  createNotificationActions,
  createPendingAction,
  createWriteAuditAction,
  isApprovalDecision,
  isKnownDecisionType,
  isTerminalDecision,
} from "./approval-decision.ts";

export {
  canDecide,
  cannotDecide,
  evaluateApprovalDecision,
  explainApprovalDecision,
} from "./approval-engine.ts";

export { runApprovalDecision } from "./approval-runner.ts";

export {
  appendApprovalHistory,
  freezeApprovalHistory,
  listApprovalHistory,
} from "./approval-history.ts";

export {
  approvalProgressPercent,
  groupApprovalHistoryByDecision,
  groupApprovalHistoryByLevel,
  summarizeApproval,
  type ApprovalTimelineGroup,
} from "./approval-timeline.ts";

export { validateApprovalDefinition } from "./approval-validation.ts";

export { ApprovalRegistry, approvalRegistry } from "./approval-registry.ts";

export {
  deserializeApprovalDefinition,
  deserializeApprovalRequest,
  serializeApprovalDefinition,
  serializeApprovalRequest,
} from "./approval-serializer.ts";

export {
  parallelApprovalDefinition,
  paymentAmountApprovalDefinition,
  sequentialApprovalDefinition,
  singleApprovalDefinition,
} from "./examples.ts";
