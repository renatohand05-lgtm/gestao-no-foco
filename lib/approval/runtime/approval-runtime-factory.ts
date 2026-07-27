/**
 * Sprint 21.7 RC1 — Factory do Approval Runtime (Supabase persistente).
 */

import { deserializeApprovalDefinition } from "../approval-serializer.ts";
import { paymentAmountApprovalDefinition } from "../examples.ts";
import type { ApprovalDefinition } from "../types.ts";
import {
  createApprovalSupabaseAdapter,
  createAuditSupabaseAdapter,
  createIdempotencySupabaseAdapter,
  createNotificationSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  type EnterpriseSupabaseClient,
} from "../../enterprise/adapters/index.ts";
import { createEnterpriseContext } from "../../enterprise/context.ts";
import {
  createMemoryEnterpriseKit,
  type MemoryEnterpriseKit,
} from "../../enterprise/repositories/memory.ts";
import type { ApprovalListRequestsQuery } from "../../enterprise/repositories/contracts.ts";
import {
  APPROVAL_RUNTIME_ERROR_CODES,
  ApprovalRuntimeError,
} from "./approval-runtime-errors.ts";
import type { AuthorizationSnapshot } from "./approval-runtime-context.ts";
import {
  createApprovalRuntimeService,
  type ApprovalRuntimeDeps,
  type ApprovalRuntimeService,
} from "./approval-runtime-service.ts";
import type { EnterpriseContext } from "../../enterprise/types.ts";

export type ApprovalRuntimeFactoryInput = {
  tenantId: string;
  userId: string;
  correlationId?: string | null;
  requestId?: string | null;
};

export type ApprovalRuntimeFactoryResult = {
  context: EnterpriseContext;
  runtime: ApprovalRuntimeService;
  deps: ApprovalRuntimeDeps;
};

let memoryKitSingleton: MemoryEnterpriseKit | null = null;

export function isApprovalRuntimeMemoryAllowed(): boolean {
  return (
    process.env.APPROVAL_RUNTIME_USE_MEMORY === "true" ||
    process.env.APPROVAL_RUNTIME_USE_MEMORY === "1"
  );
}

function assertSupabaseConfigured(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    throw new ApprovalRuntimeError(
      "NEXT_PUBLIC_SUPABASE_URL não configurada. Runtime persistente indisponível.",
      APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
    );
  }
}

function getMemoryKit(): MemoryEnterpriseKit {
  if (!memoryKitSingleton) {
    memoryKitSingleton = createMemoryEnterpriseKit();
  }
  return memoryKitSingleton;
}

async function resolveDefinitionFromRow(
  row: { definition: Record<string, unknown> } | null,
  tenantId: string,
  approvalKey: string,
): Promise<ApprovalDefinition | null> {
  if (row?.definition) {
    try {
      return deserializeApprovalDefinition(JSON.stringify(row.definition));
    } catch {
      /* fallback abaixo */
    }
  }
  if (approvalKey === "payment-amount" || approvalKey === "payment-amount-approval") {
    return paymentAmountApprovalDefinition(tenantId);
  }
  return null;
}

function buildMemoryDeps(kit: MemoryEnterpriseKit): ApprovalRuntimeDeps {
  return {
    approval: kit.approval,
    audit: kit.audit,
    notification: kit.notification,
    outbox: kit.outbox,
    idempotency: kit.idempotency,
    workflow: kit.workflow,
    listRequests: (query: ApprovalListRequestsQuery) =>
      kit.approval.listRequests!(query),
    resolveDefinition: async (tenantId, approvalKey, version) => {
      if (approvalKey === "payment-amount" || approvalKey === "multi-level") {
        const { paymentAmountApprovalDefinition: payDef } = await import(
          "../examples.ts"
        );
        if (approvalKey === "multi-level") {
          const { createApprovalDefinition } = await import(
            "../approval-definition.ts"
          );
          const { createApprovalLevel } = await import("../approval-level.ts");
          return createApprovalDefinition({
            id: "multi-level-chain",
            version,
            name: "Multi-level",
            tenantScope: "tenant",
            tenantId,
            levels: [
              createApprovalLevel({
                id: "supervisor",
                name: "Supervisor",
                order: 1,
                mode: "sequential",
                requiredPermissions: ["financeiro.aprovar"],
                escalateToLevelId: "gerente",
              }),
              createApprovalLevel({
                id: "gerente",
                name: "Gerente",
                order: 2,
                mode: "sequential",
                requiredPermissions: ["financeiro.aprovar"],
              }),
            ],
          });
        }
        return payDef(tenantId);
      }
      return paymentAmountApprovalDefinition(tenantId);
    },
    resolveAuthorization: async (context) =>
      ({
        tenantId: context.tenantId,
        userId: context.userId!,
        roles: [...context.roles],
        permissions: [...context.permissions],
      }) satisfies AuthorizationSnapshot,
  };
}

export async function createSupabaseApprovalRuntimeDeps(
  authenticatedClient: EnterpriseSupabaseClient,
  adminClient: EnterpriseSupabaseClient,
): Promise<ApprovalRuntimeDeps> {
  const approval = createApprovalSupabaseAdapter(authenticatedClient);
  const rbac = createRbacSupabaseAdapter(authenticatedClient);

  return {
    approval,
    audit: createAuditSupabaseAdapter(authenticatedClient),
    notification: createNotificationSupabaseAdapter(authenticatedClient),
    outbox: createOutboxSupabaseAdapter(authenticatedClient),
    idempotency: createIdempotencySupabaseAdapter(adminClient),
    workflow: createWorkflowSupabaseAdapter(authenticatedClient),
    listRequests: (query) => {
      if (!approval.listRequests) {
        throw new ApprovalRuntimeError(
          "listRequests não disponível no adapter de approval.",
          APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
        );
      }
      return approval.listRequests(query);
    },
    resolveDefinition: async (tenantId, approvalKey, version) => {
      const row = approval.getDefinition
        ? await approval.getDefinition(tenantId, approvalKey, version)
        : null;
      if (row) {
        return resolveDefinitionFromRow(row, tenantId, approvalKey);
      }
      if (tenantId) {
        const global = approval.getDefinition
          ? await approval.getDefinition(null, approvalKey, version)
          : null;
        if (global) {
          return resolveDefinitionFromRow(global, tenantId, approvalKey);
        }
      }
      return resolveDefinitionFromRow(null, tenantId, approvalKey);
    },
    resolveAuthorization: async (context) => {
      if (!context.userId) {
        throw new ApprovalRuntimeError(
          "Utilizador autenticado obrigatório.",
          APPROVAL_RUNTIME_ERROR_CODES.PERMISSION_DENIED,
        );
      }
      return rbac.resolveAuthorizationSnapshot(context.tenantId, context.userId);
    },
  };
}

export async function createApprovalRuntimeFactory(
  input: ApprovalRuntimeFactoryInput,
): Promise<ApprovalRuntimeFactoryResult> {
  if (!input.tenantId?.trim()) {
    throw new ApprovalRuntimeError(
      "tenantId obrigatório.",
      APPROVAL_RUNTIME_ERROR_CODES.VALIDATION_FAILED,
    );
  }
  if (!input.userId?.trim()) {
    throw new ApprovalRuntimeError(
      "Sessão ausente: userId obrigatório.",
      APPROVAL_RUNTIME_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  let deps: ApprovalRuntimeDeps;

  if (isApprovalRuntimeMemoryAllowed()) {
    deps = buildMemoryDeps(getMemoryKit());
  } else {
    assertSupabaseConfigured();
    const { isAdminClientAvailable, createAdminClient } = await import(
      "../../supabase/admin.ts"
    );
    if (!isAdminClientAvailable()) {
      throw new ApprovalRuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY obrigatória para idempotência/outbox admin. Configure ou defina APPROVAL_RUNTIME_USE_MEMORY=true apenas em testes.",
        APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
      );
    }
    const { createClient } = await import("../../supabase/server.ts");
    const authenticatedClient = (await createClient()) as unknown as EnterpriseSupabaseClient;
    const adminClient = createAdminClient() as unknown as EnterpriseSupabaseClient;
    deps = await createSupabaseApprovalRuntimeDeps(
      authenticatedClient,
      adminClient,
    );
  }

  const context = createEnterpriseContext({
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId: input.correlationId ?? undefined,
    requestId: input.requestId ?? undefined,
    source: "server_action",
  });

  const auth = deps.resolveAuthorization
    ? await deps.resolveAuthorization(context)
    : null;

  const runtime = createApprovalRuntimeService({
    ...deps,
    resolveAuthorization: async () => auth,
  });

  return {
    context: {
      ...context,
      roles: auth?.roles?.length ? auth.roles : context.roles,
      permissions: auth?.permissions?.length
        ? auth.permissions
        : context.permissions,
    },
    runtime,
    deps,
  };
}

/** Expõe kit de memória apenas para testes explícitos. */
export function __getApprovalRuntimeMemoryKitForTests(): MemoryEnterpriseKit {
  if (!isApprovalRuntimeMemoryAllowed()) {
    throw new ApprovalRuntimeError(
      "Memory kit bloqueado. Defina APPROVAL_RUNTIME_USE_MEMORY=true.",
      APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
    );
  }
  return getMemoryKit();
}

/** Reseta singleton de memória entre testes. */
export function __resetApprovalRuntimeMemoryKitForTests(): void {
  if (memoryKitSingleton) {
    memoryKitSingleton.store.clear();
  }
  memoryKitSingleton = null;
}
