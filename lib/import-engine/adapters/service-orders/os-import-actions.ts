"use server";

/**
 * Sprint 22.5.1 / 22.10.1 — Server actions OS.
 * Histórico/mapeamento → Supabase. Staging EXPLÍCITO em memória (sem criar OS reais).
 */
import { revalidatePath } from "next/cache";

import {
  getGlobalMemoryStagingStore,
  type ImportColumnMapping,
  type ImportReviewRow,
} from "@/lib/import-engine";
import {
  STAGING_MEMORY_REASON,
  WIZARD_SESSION_MEMORY_REASON,
  assertImportMemoryUsageAllowed,
} from "@/lib/import-engine/persistence/memory-policy";

import { SERVICE_ORDERS_IMPORT_ADAPTER } from "./adapter.ts";
import { resolveModuleImportRuntime } from "../shared/resolve-module-import-runtime.ts";
import {
  getImportWizardSession,
  newImportWizardSessionId,
  putImportWizardSession,
} from "../../shared/wizard-session-store.ts";

const MODULE_ID = SERVICE_ORDERS_IMPORT_ADAPTER.id;
const MODULE_KEY = SERVICE_ORDERS_IMPORT_ADAPTER.moduleKey;

function toError(error: unknown): { success: false; error: string } {
  return {
    success: false,
    error:
      error instanceof Error ? error.message : "Erro na importação de ordens de serviço.",
  };
}

export async function listOsImportHistory(tenantSlug: string) {
  try {
    const { tenant, engine } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    const history = await engine.listHistory(tenant.id, MODULE_KEY, 20);
    return { success: true as const, history };
  } catch (error) {
    return toError(error);
  }
}

export async function previewOsImport(tenantSlug: string, formData: FormData) {
  try {
    const { tenant, profile, engine } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("Selecione um arquivo Excel (.xlsx/.xls) ou CSV.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = engine.parseFile({
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });

    const preview = await engine.buildPreview({
      tenantId: tenant.id,
      module: MODULE_KEY,
      targetEntity: SERVICE_ORDERS_IMPORT_ADAPTER.targetEntity,
      parsed,
      targetFields: SERVICE_ORDERS_IMPORT_ADAPTER.fields,
    });

    assertImportMemoryUsageAllowed(WIZARD_SESSION_MEMORY_REASON);
    const sessionId = newImportWizardSessionId(MODULE_ID);
    putImportWizardSession({
      id: sessionId,
      tenantId: tenant.id,
      userId: profile.id,
      module: MODULE_ID,
      fileName: file.name,
      parsed,
      preview,
      mapping: preview.mapping,
      review: null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true as const,
      sessionId,
      preview,
      targetFields: SERVICE_ORDERS_IMPORT_ADAPTER.fields,
      sessionMemory: WIZARD_SESSION_MEMORY_REASON,
    };
  } catch (error) {
    return toError(error);
  }
}

export async function updateOsImportMapping(
  tenantSlug: string,
  sessionId: string,
  mapping: ImportColumnMapping,
  persist = true,
) {
  try {
    const { tenant, engine } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    const session = getImportWizardSession(MODULE_ID, sessionId, tenant.id);
    if (!session) throw new Error("Sessão de importação expirada. Envie o arquivo novamente.");

    const preview = await engine.buildPreview({
      tenantId: tenant.id,
      module: MODULE_KEY,
      targetEntity: SERVICE_ORDERS_IMPORT_ADAPTER.targetEntity,
      parsed: session.parsed,
      targetFields: SERVICE_ORDERS_IMPORT_ADAPTER.fields,
      mapping,
    });

    session.mapping = mapping;
    session.preview = preview;
    session.review = null;
    putImportWizardSession(session);

    if (persist) {
      await engine.saveMapping({
        tenantId: tenant.id,
        module: MODULE_KEY,
        targetEntity: SERVICE_ORDERS_IMPORT_ADAPTER.targetEntity,
        mapping,
      });
    }

    return { success: true as const, preview };
  } catch (error) {
    return toError(error);
  }
}

export async function buildOsImportReview(tenantSlug: string, sessionId: string) {
  try {
    const { tenant, engine } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    const session = getImportWizardSession(MODULE_ID, sessionId, tenant.id);
    if (!session) throw new Error("Sessão de importação expirada. Envie o arquivo novamente.");

    const normalized = engine.normalize(
      session.parsed,
      session.mapping,
      SERVICE_ORDERS_IMPORT_ADAPTER.fields,
    );
    const review: ImportReviewRow[] = engine.buildReview(normalized, {
      domain: SERVICE_ORDERS_IMPORT_ADAPTER.classificationDomain,
    });
    session.review = review;
    putImportWizardSession(session);

    return {
      success: true as const,
      review,
      summary: {
        total: review.length,
        withErrors: review.filter((r) => r.issues.some((i) => i.severity === "error")).length,
        lowConfidence: review.filter(
          (r) =>
            r.classification.status === "low_confidence" ||
            r.classification.status === "unclassified",
        ).length,
      },
    };
  } catch (error) {
    return toError(error);
  }
}

export async function patchOsImportReviewRow(
  tenantSlug: string,
  sessionId: string,
  rowNumber: number,
  patch: {
    categorySuggested?: string | null;
    status?: ImportReviewRow["classification"]["status"];
  },
) {
  try {
    const { tenant } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    const session = getImportWizardSession(MODULE_ID, sessionId, tenant.id);
    if (!session?.review) {
      throw new Error("Revisão não encontrada. Gere a pré-visualização novamente.");
    }
    const row = session.review.find((r) => r.rowNumber === rowNumber);
    if (!row) throw new Error(`Linha ${rowNumber} não encontrada.`);

    if (patch.categorySuggested !== undefined) {
      row.classification.categorySuggested = patch.categorySuggested;
      row.classification.status = "edited";
      row.classification.confidence = 1;
      row.classification.reason = "Categoria editada pelo utilizador";
    }
    if (patch.status) {
      row.classification.status = patch.status;
      if (patch.status === "confirmed") {
        row.classification.confidence = Math.max(row.classification.confidence, 0.99);
        row.classification.reason = "Confirmado pelo utilizador";
      }
    }
    putImportWizardSession(session);
    return { success: true as const, row };
  } catch (error) {
    return toError(error);
  }
}

export async function commitOsImport(
  tenantSlug: string,
  input: { sessionId: string; confirmedRowNumbers: number[] },
) {
  try {
    const { tenant, profile, engine, stagingDisclaimer } = await resolveModuleImportRuntime(
      tenantSlug,
      SERVICE_ORDERS_IMPORT_ADAPTER,
    );
    if (!input.confirmedRowNumbers.length) {
      throw new Error("Confirme ao menos uma linha para importar.");
    }

    const session = getImportWizardSession(MODULE_ID, input.sessionId, tenant.id);
    if (!session?.review) throw new Error("Sessão de revisão inválida.");

    assertImportMemoryUsageAllowed(STAGING_MEMORY_REASON);
    const staging = getGlobalMemoryStagingStore(MODULE_ID);
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await engine.commit({
      userLabel: profile.name ?? profile.email ?? profile.id,
      request: {
        tenantId: tenant.id,
        userId: profile.id,
        module: MODULE_KEY,
        targetEntity: SERVICE_ORDERS_IMPORT_ADAPTER.targetEntity,
        fileName: session.fileName,
        format: session.parsed.format,
        mapping: session.mapping,
        rows: session.review,
        confirmedRowNumbers: input.confirmedRowNumbers,
      },
      onCommitRow: async (row: ImportReviewRow) => {
        await staging.stage({
          tenantId: tenant.id,
          module: MODULE_ID,
          logId: batchId,
          row,
        });
      },
    });

    revalidatePath(`/${tenantSlug}/integracoes/importar/ordens`);

    return {
      success: true as const,
      result,
      stagingMemoryExplicit: true as const,
      message:
        `Linhas validadas e histórico gravado no Supabase. ${stagingDisclaimer} ` +
        "Nenhuma ordem de serviço real foi criada nesta etapa.",
    };
  } catch (error) {
    return toError(error);
  }
}
