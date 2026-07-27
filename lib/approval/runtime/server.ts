/**
 * Sprint 21.7 RC1 — API server-only do Approval Runtime.
 * Importar apenas em Server Actions / Route Handlers / jobs.
 */
import "server-only";

export {
  createApprovalRuntimeFactory,
  createSupabaseApprovalRuntimeDeps,
  isApprovalRuntimeMemoryAllowed,
  __getApprovalRuntimeMemoryKitForTests,
  __resetApprovalRuntimeMemoryKitForTests,
  type ApprovalRuntimeFactoryInput,
  type ApprovalRuntimeFactoryResult,
} from "./approval-runtime-factory.ts";

export {
  processApprovalSla,
  type ApprovalSlaProcessorReport,
  type ProcessApprovalSlaInput,
} from "./approval-sla-processor.ts";
