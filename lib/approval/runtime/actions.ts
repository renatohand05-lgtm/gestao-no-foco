"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  type ApprovalRuntimeFilters,
  type ApprovalRuntimeResult,
  type DelegateApprovalInput,
  type EscalateApprovalInput,
  type RequestApprovalRuntimeInput,
  ApprovalRuntimeError,
  APPROVAL_RUNTIME_ERROR_CODES,
} from "@/lib/approval/runtime";
import {
  createApprovalRuntimeFactory,
} from "@/lib/approval/runtime/approval-runtime-factory";
import { processApprovalSla } from "@/lib/approval/runtime/approval-sla-processor";
import { toDomainApprovalRequest } from "@/lib/approval/runtime/approval-runtime";
import { createEnterpriseContext } from "@/lib/enterprise";
import { requireTenant } from "@/lib/tenants";

type RuntimeActionResult =
  | { success: true; result: ApprovalRuntimeResult }
  | { success: false; error: string };

async function resolveAuthenticatedRuntime(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new ApprovalRuntimeError(
      "Sessão ausente. Faça login novamente.",
      APPROVAL_RUNTIME_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const { context, runtime, deps } = await createApprovalRuntimeFactory({
    tenantId: tenant.id,
    userId: profile.id,
  });

  if (context.tenantId !== tenant.id) {
    throw new ApprovalRuntimeError(
      "Isolamento multi-tenant violado.",
      APPROVAL_RUNTIME_ERROR_CODES.VALIDATION_FAILED,
    );
  }

  return { tenant, profile, context, runtime, deps };
}

function toActionResult(result: ApprovalRuntimeResult): RuntimeActionResult {
  return { success: true, result };
}

function toErrorResult(error: unknown): RuntimeActionResult {
  const message =
    error instanceof ApprovalRuntimeError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Erro no runtime de aprovação.";
  return { success: false, error: message };
}

export async function requestApprovalRuntimeAction(
  tenantSlug: string,
  input: RequestApprovalRuntimeInput,
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.requestApproval(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function approveApprovalRuntimeAction(
  tenantSlug: string,
  input: {
    requestId: string;
    levelId?: string | null;
    comment?: string | null;
    idempotencyKey?: string;
  },
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.approve(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function rejectApprovalRuntimeAction(
  tenantSlug: string,
  input: {
    requestId: string;
    reason?: string | null;
    idempotencyKey?: string;
  },
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.reject(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function cancelApprovalRuntimeAction(
  tenantSlug: string,
  input: {
    requestId: string;
    reason?: string | null;
    idempotencyKey?: string;
  },
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.cancel(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function delegateApprovalRuntimeAction(
  tenantSlug: string,
  input: DelegateApprovalInput,
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.delegate(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function escalateApprovalRuntimeAction(
  tenantSlug: string,
  input: EscalateApprovalInput,
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.escalate(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function reopenApprovalRuntimeAction(
  tenantSlug: string,
  input: { requestId: string; reason?: string | null; idempotencyKey?: string },
): Promise<RuntimeActionResult> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    return toActionResult(await runtime.reopen(context, input));
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listApprovalRuntimeAction(
  tenantSlug: string,
  filters: ApprovalRuntimeFilters & {
    page?: number;
    limit?: number;
    orderBy?: "createdAt" | "updatedAt";
    orderDir?: "asc" | "desc";
  } = {},
): Promise<
  | {
      success: true;
      items: Awaited<
        ReturnType<
          Awaited<
            ReturnType<typeof createApprovalRuntimeFactory>
          >["runtime"]["list"]
        >
      >["items"];
      total: number;
      page: number;
      limit: number;
      kpis: ReturnType<
        Awaited<
          ReturnType<typeof createApprovalRuntimeFactory>
        >["runtime"]["computeKpis"]
      >;
    }
  | { success: false; error: string }
> {
  try {
    const { context, runtime } = await resolveAuthenticatedRuntime(tenantSlug);
    const listed = await runtime.list(context, filters);
    return {
      success: true,
      items: listed.items,
      total: listed.total,
      page: listed.page,
      limit: listed.limit,
      kpis: runtime.computeKpis(listed.items),
    };
  } catch (error) {
    const message =
      error instanceof ApprovalRuntimeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao listar aprovações.";
    return { success: false, error: message };
  }
}

export async function processApprovalSlaAction(tenantSlug: string): Promise<
  | { success: true; report: Awaited<ReturnType<typeof processApprovalSla>> }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    if (!profile?.id) {
      throw new ApprovalRuntimeError(
        "Sessão ausente.",
        APPROVAL_RUNTIME_ERROR_CODES.PERMISSION_DENIED,
      );
    }

    const { runtime, deps } = await createApprovalRuntimeFactory({
      tenantId: tenant.id,
      userId: profile.id,
    });

    const systemContext = createEnterpriseContext({
      tenantId: tenant.id,
      actorType: "system",
      allowSystemActor: true,
      systemActorKey: "approval-sla-processor",
      source: "server_action",
      correlationId: `sla-${tenant.id}-${Date.now()}`,
    });

    const report = await processApprovalSla({
      context: systemContext,
      runtime,
      listRequests: async (query) => {
        if (!deps.listRequests) return { items: [], total: 0 };
        const result = await deps.listRequests(query);
        return { items: result.items, total: result.total };
      },
      resolveDomain: async (requestId) => {
        const row = await deps.approval.getRequest(tenant.id, requestId);
        if (!row) return null;
        const definition = await deps.resolveDefinition(
          tenant.id,
          row.approvalKey,
          row.approvalVersion,
        );
        if (!definition) return null;
        return toDomainApprovalRequest(row, definition);
      },
    });

    return { success: true, report };
  } catch (error) {
    const message =
      error instanceof ApprovalRuntimeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao processar SLA.";
    return { success: false, error: message };
  }
}
