/**
 * Sprint 25.4.2 — Server actions: desfazer, arquivar, excluir histórico, relatório.
 */

"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  catalogImportPermissionSatisfied,
  resolveCatalogImportEffectivePermissions,
} from "@/lib/catalog-import/rbac-compat";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { createProductionImportEngine } from "@/lib/import-engine/persistence/create-import-engine";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

import {
  buildCatalogStockUndoPreview,
  executeEligibleCatalogStockUndo,
} from "./catalog-stock-undo.ts";
import {
  assertReasonRequired,
  assertTypedConfirmation,
  evaluateNfeUndo,
} from "./eligibility.ts";

function toError(error: unknown): { success: false; error: string } {
  return {
    success: false,
    error:
      error instanceof Error
        ? error.message
        : "Erro na operação de exclusão/histórico.",
  };
}

async function requireHistoryAuth(
  tenantSlug: string,
  needed: readonly string[],
) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");
  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveCatalogImportEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  if (!catalogImportPermissionSatisfied(effective.permissions, needed)) {
    throw new Error(`Sem permissão (${needed.join(" | ")}).`);
  }
  const bundle = createProductionImportEngine(client);
  return { tenant, profile, client, bundle, permissions: effective.permissions };
}

async function recordAudit(input: {
  client: Awaited<ReturnType<typeof createClient>>;
  tenantId: string;
  userId: string;
  action: string;
  importRunId: string;
  reason: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await input.client.from("audit_logs" as never).insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      action: input.action,
      entity_type: "import_run",
      entity_id: input.importRunId,
      metadata: {
        reason: input.reason,
        correlationId: input.correlationId,
        ...input.metadata,
      },
    } as never);
  } catch {
    // Auditoria best-effort — nunca engolir o resultado da operação principal
    // com falso sucesso; apenas não bloqueia se tabela ausente.
  }
}

export async function previewImportUndoAction(
  tenantSlug: string,
  runId: string,
) {
  try {
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.visualizar",
      "importacoes.rollback",
      "produtos.visualizar",
    ]);
    const run = await auth.bundle.history.getById(auth.tenant.id, runId);
    if (!run) throw new Error("Importação não encontrada.");
    if (run.tenantId && run.tenantId !== auth.tenant.id) {
      throw new Error("Acesso cross-tenant negado.");
    }
    const items = await auth.bundle.runItems.listByRun(auth.tenant.id, runId);
    const preview = await buildCatalogStockUndoPreview({
      client: auth.client,
      tenantId: auth.tenant.id,
      runId,
      runCreatedAt: run.createdAt,
      runStatus: run.status,
      archivedAt: run.archivedAt,
      items,
    });
    return { success: true as const, preview, run };
  } catch (error) {
    return toError(error);
  }
}

export async function executeImportUndoAction(
  tenantSlug: string,
  input: {
    runId: string;
    mode: "all_eligible" | "selected";
    selectedIds?: string[];
    reason: string;
    typedConfirmation?: string;
    confirmed: true;
  },
) {
  try {
    if (!input.confirmed) throw new Error("Confirmação humana obrigatória.");
    const reason = assertReasonRequired(input.reason);
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.rollback",
      "produtos.excluir",
      "servicos.excluir",
      "estoque.ajustar",
    ]);
    const run = await auth.bundle.history.getById(auth.tenant.id, input.runId);
    if (!run) throw new Error("Importação não encontrada.");
    if (run.status === "rolled_back") {
      throw new Error("Esta importação já foi desfeita. Segunda reversão bloqueada.");
    }
    if (run.deletedAt) {
      throw new Error("Histórico em soft-delete — restaure antes de desfazer dados.");
    }

    const items = await auth.bundle.runItems.listByRun(
      auth.tenant.id,
      input.runId,
    );
    const preview = await buildCatalogStockUndoPreview({
      client: auth.client,
      tenantId: auth.tenant.id,
      runId: input.runId,
      runCreatedAt: run.createdAt,
      runStatus: run.status,
      archivedAt: run.archivedAt,
      items,
    });

    assertTypedConfirmation({
      required: preview.summary.requiresTypedConfirmation,
      typed: input.typedConfirmation,
    });

    if (preview.summary.status === "bloqueado") {
      throw new Error(
        "Nenhum item elegível para desfazer. Dados em uso foram bloqueados.",
      );
    }
    if (preview.summary.eligibleCount === 0) {
      throw new Error("Nada a desfazer — evitado falso sucesso.");
    }

    const correlationId = run.correlationId ?? randomUUID();
    const result = await executeEligibleCatalogStockUndo({
      client: auth.client,
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      runId: input.runId,
      correlationId,
      decisions: preview.summary.decisions,
      selectedIds: input.selectedIds,
      mode: input.mode,
    });

    if (result.reverted.length === 0 && result.inactivated.length === 0) {
      throw new Error(
        `Falha parcial sem efeito útil: ${result.failed.map((f) => f.error).join("; ") || "bloqueado"}`,
      );
    }

    // Marca itens revertidos
    if (result.reverted.length) {
      await auth.bundle.runItems.markReverted(
        auth.tenant.id,
        input.runId,
        result.reverted,
      );
    }

    const allDone =
      preview.summary.eligibleCount > 0 &&
      result.reverted.length >= preview.summary.eligibleCount &&
      result.failed.length === 0;

    if (allDone || result.reverted.length > 0) {
      await auth.bundle.history.markRolledBack(auth.tenant.id, input.runId);
      try {
        await auth.client
          .from("import_runs")
          .update({ rollback_by: auth.profile.id } as never)
          .eq("tenant_id", auth.tenant.id)
          .eq("id", input.runId);
      } catch {
        /* coluna pode ainda não existir até migration */
      }
    }

    await recordAudit({
      client: auth.client,
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      action: "importacoes.desfazer",
      importRunId: input.runId,
      reason,
      correlationId,
      metadata: {
        mode: input.mode,
        reverted: result.reverted,
        inactivated: result.inactivated,
        blocked: result.blocked,
        failed: result.failed,
        previousStatus: run.status,
        newStatus: allDone ? "rolled_back" : run.status,
      },
    });

    revalidatePath(`/${tenantSlug}/integracoes/historico`);
    revalidatePath(`/${tenantSlug}/produtos`);
    revalidatePath(`/${tenantSlug}/estoque`);

    return {
      success: true as const,
      result,
      partial: result.failed.length > 0 || !allDone,
      preview,
    };
  } catch (error) {
    return toError(error);
  }
}

export async function archiveImportHistoryAction(
  tenantSlug: string,
  input: { runId: string; reason: string },
) {
  try {
    const reason = assertReasonRequired(input.reason);
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.arquivar",
      "importacoes.rollback",
    ]);
    if (!auth.bundle.history.archive) {
      throw new Error(
        "Arquivamento indisponível até aplicar a migration 20260814.",
      );
    }
    const entry = await auth.bundle.history.archive(
      auth.tenant.id,
      input.runId,
      auth.profile.id,
      reason,
    );
    if (!entry) throw new Error("Importação não encontrada ou já arquivada.");
    await recordAudit({
      client: auth.client,
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      action: "importacoes.arquivar",
      importRunId: input.runId,
      reason,
      correlationId: randomUUID(),
      metadata: { archivedAt: entry.archivedAt },
    });
    revalidatePath(`/${tenantSlug}/integracoes/historico`);
    return { success: true as const, entry };
  } catch (error) {
    return toError(error);
  }
}

export async function restoreArchivedImportHistoryAction(
  tenantSlug: string,
  runId: string,
) {
  try {
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.arquivar",
      "importacoes.visualizar",
    ]);
    if (!auth.bundle.history.restoreArchive) {
      throw new Error("Restauração indisponível até aplicar a migration.");
    }
    const entry = await auth.bundle.history.restoreArchive(
      auth.tenant.id,
      runId,
      auth.profile.id,
    );
    if (!entry) throw new Error("Importação não encontrada.");
    revalidatePath(`/${tenantSlug}/integracoes/historico`);
    return { success: true as const, entry };
  } catch (error) {
    return toError(error);
  }
}

export async function softDeleteImportHistoryAction(
  tenantSlug: string,
  input: { runId: string; reason: string; typedConfirmation?: string },
) {
  try {
    const reason = assertReasonRequired(input.reason);
    assertTypedConfirmation({
      required: true,
      typed: input.typedConfirmation,
      expected: "EXCLUIR",
    });
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.excluir_historico",
    ]);
    if (!auth.bundle.history.softDeleteHistory) {
      throw new Error(
        "Exclusão de histórico indisponível até aplicar a migration 20260814.",
      );
    }
    const entry = await auth.bundle.history.softDeleteHistory(
      auth.tenant.id,
      input.runId,
      auth.profile.id,
      reason,
    );
    if (!entry) throw new Error("Importação não encontrada.");
    await recordAudit({
      client: auth.client,
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      action: "importacoes.excluir_historico",
      importRunId: input.runId,
      reason,
      correlationId: randomUUID(),
      metadata: {
        note: "Soft-delete visual apenas — dados operacionais preservados.",
        deletedAt: entry.deletedAt,
      },
    });
    revalidatePath(`/${tenantSlug}/integracoes/historico`);
    return { success: true as const, entry, operationalDataTouched: false };
  } catch (error) {
    return toError(error);
  }
}

export async function restoreSoftDeletedImportHistoryAction(
  tenantSlug: string,
  runId: string,
) {
  try {
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.excluir_historico",
      "importacoes.arquivar",
    ]);
    if (!auth.bundle.history.restoreSoftDelete) {
      throw new Error("Restauração indisponível até aplicar a migration.");
    }
    const entry = await auth.bundle.history.restoreSoftDelete(
      auth.tenant.id,
      runId,
      auth.profile.id,
    );
    if (!entry) throw new Error("Importação não encontrada.");
    revalidatePath(`/${tenantSlug}/integracoes/historico`);
    return { success: true as const, entry };
  } catch (error) {
    return toError(error);
  }
}

export async function downloadImportRunReportAction(
  tenantSlug: string,
  runId: string,
) {
  try {
    const auth = await requireHistoryAuth(tenantSlug, [
      "importacoes.visualizar",
      "produtos.visualizar",
      "estoque.visualizar",
    ]);
    const run = await auth.bundle.history.getById(auth.tenant.id, runId);
    if (!run) throw new Error("Importação não encontrada.");
    const items = await auth.bundle.runItems.listByRun(auth.tenant.id, runId);
    const report = {
      generatedAt: new Date().toISOString(),
      run,
      items: items.map((i) => ({
        rowNumber: i.rowNumber,
        targetType: i.targetType,
        targetId: i.targetId,
        operation: i.operation,
        rollbackStatus: i.rollbackStatus,
      })),
    };
    const json = JSON.stringify(report, null, 2);
    return {
      success: true as const,
      fileName: `import-report-${runId.slice(0, 8)}.json`,
      mimeType: "application/json",
      base64: Buffer.from(json, "utf8").toString("base64"),
    };
  } catch (error) {
    return toError(error);
  }
}

export async function evaluateNfeUndoEligibilityAction(
  tenantSlug: string,
  flags: Parameters<typeof evaluateNfeUndo>[0],
) {
  try {
    await requireHistoryAuth(tenantSlug, [
      "importacoes.rollback",
      "compras.receber",
    ]);
    return { success: true as const, ...evaluateNfeUndo(flags) };
  } catch (error) {
    return toError(error);
  }
}

export async function clearImportDraftAction(_tenantSlug: string) {
  // Server-side: nada a limpar em memória de processo (draft é client-only).
  // Mantém action para UI simétrica e auditoria leve futura.
  void _tenantSlug;
  return {
    success: true as const,
    message: "Rascunho de importação limpo no cliente.",
  };
}
