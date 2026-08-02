"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createApprovalSupabaseAdapter,
  createIdempotencySupabaseAdapter,
  createNotificationSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  createEnterpriseContext,
  createMemoryIdempotencyRepository,
  MemoryEnterpriseStore,
} from "@/lib/enterprise";
import { createSupabaseFinanceCore } from "@/lib/finance/factory";
import {
  FinanceError,
  FINANCE_ERROR_CODES,
} from "@/lib/finance/shared/errors";
import { assertFinancePermission } from "@/lib/finance/shared/rbac";
import {
  assertFinanceAccess,
  resolveFinanceEffectivePermissions,
} from "@/lib/finance/shared/rbac-compat";
import {
  createProductionImportEngine,
  type ImportColumnMapping,
  type ImportReviewRow,
} from "@/lib/import-engine";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

import {
  FINANCE_IMPORT_ENTITY,
  FINANCE_IMPORT_MODULE,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
  resolveMovementKind,
} from "./finance-import-fields";
import {
  getFinanceImportSession,
  newSessionId,
  putFinanceImportSession,
} from "./finance-import-session";

async function resolveIdempotency() {
  try {
    const { isAdminClientAvailable, createAdminClient } = await import(
      "@/lib/supabase/admin"
    );
    if (isAdminClientAvailable()) {
      return createIdempotencySupabaseAdapter(createAdminClient());
    }
  } catch {
    /* fall through */
  }
  // Sprint 22.10.1 — sem fallback silencioso em produção.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_IMPORT_MEMORY !== "1" &&
    process.env.ALLOW_IMPORT_MEMORY?.toLowerCase() !== "true"
  ) {
    throw new Error(
      "Idempotência: SUPABASE_SERVICE_ROLE_KEY / admin client obrigatório em produção. " +
        "Não há fallback silencioso para memória.",
    );
  }
  return createMemoryIdempotencyRepository(new MemoryEnterpriseStore());
}

async function resolveFinanceImport(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new FinanceError(
      "Sessão ausente.",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const client = await createClient();
  const audit = createAuditSupabaseAdapter(client);
  const outbox = createOutboxSupabaseAdapter(client);
  const notification = createNotificationSupabaseAdapter(client);
  const workflow = createWorkflowSupabaseAdapter(client);
  const approval = createApprovalSupabaseAdapter(client);
  const rbac = createRbacSupabaseAdapter(client);
  const idempotency = await resolveIdempotency();

  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });

  assertFinanceAccess(effective.permissions);
  assertFinancePermission(effective.permissions, "financeiro.criar");

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions: effective.permissions,
    source: "server_action",
    metadata: {
      financeAuthSource: effective.source,
      membershipRole: tenant.role,
      feature: "import-engine",
    },
  });

  const kit = createSupabaseFinanceCore(client, {
    audit,
    outbox,
    notification,
    workflow,
    approval,
    idempotency,
    tenantSlug,
  });

  // Sprint 22.10 — persistência Supabase obrigatória; sem fallback silencioso.
  const bundle = createProductionImportEngine(client);

  return {
    tenant,
    profile,
    context,
    kit,
    audit,
    client,
    engine: bundle.engine,
    mapping: bundle.mapping,
    learning: bundle.learning,
    runItems: bundle.runItems,
    rollback: bundle.rollback,
    tenantSlug,
  };
}

function toError(error: unknown): {
  success: false;
  error: string;
  code?: string;
} {
  return {
    success: false,
    error:
      error instanceof FinanceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro na importação.",
    code: error instanceof FinanceError ? error.code : undefined,
  };
}

export async function listFinanceImportHistory(tenantSlug: string) {
  try {
    const { tenant, engine } = await resolveFinanceImport(tenantSlug);
    const history = await engine.listHistory(
      tenant.id,
      FINANCE_IMPORT_MODULE,
      20,
    );
    return { success: true as const, history };
  } catch (error) {
    return toError(error);
  }
}

export async function previewFinanceImport(
  tenantSlug: string,
  formData: FormData,
) {
  try {
    const { tenant, profile, engine } = await resolveFinanceImport(tenantSlug);
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
      module: FINANCE_IMPORT_MODULE,
      targetEntity: FINANCE_IMPORT_ENTITY,
      parsed,
      targetFields: FINANCE_MOVEMENT_IMPORT_FIELDS,
    });

    const sessionId = newSessionId();
    putFinanceImportSession({
      id: sessionId,
      tenantId: tenant.id,
      userId: profile.id,
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
      targetFields: FINANCE_MOVEMENT_IMPORT_FIELDS,
    };
  } catch (error) {
    return toError(error);
  }
}

export async function updateFinanceImportMapping(
  tenantSlug: string,
  sessionId: string,
  mapping: ImportColumnMapping,
  persist = true,
) {
  try {
    const { tenant, engine } = await resolveFinanceImport(tenantSlug);
    const session = getFinanceImportSession(sessionId, tenant.id);
    if (!session) {
      throw new Error("Sessão de importação expirada. Envie o arquivo novamente.");
    }

    const preview = await engine.buildPreview({
      tenantId: tenant.id,
      module: FINANCE_IMPORT_MODULE,
      targetEntity: FINANCE_IMPORT_ENTITY,
      parsed: session.parsed,
      targetFields: FINANCE_MOVEMENT_IMPORT_FIELDS,
      mapping,
    });

    session.mapping = mapping;
    session.preview = preview;
    session.review = null;
    putFinanceImportSession(session);

    if (persist) {
      await engine.saveMapping({
        tenantId: tenant.id,
        module: FINANCE_IMPORT_MODULE,
        targetEntity: FINANCE_IMPORT_ENTITY,
        mapping,
      });
    }

    return { success: true as const, preview };
  } catch (error) {
    return toError(error);
  }
}

export async function buildFinanceImportReview(
  tenantSlug: string,
  sessionId: string,
) {
  try {
    const { tenant, engine, learning } = await resolveFinanceImport(tenantSlug);
    const session = getFinanceImportSession(sessionId, tenant.id);
    if (!session) {
      throw new Error("Sessão de importação expirada. Envie o arquivo novamente.");
    }

    const normalized = engine.normalize(
      session.parsed,
      session.mapping,
      FINANCE_MOVEMENT_IMPORT_FIELDS,
    );
    // Sprint 22.6 — regras aprendidas do tenant têm prioridade sobre o
    // motor de regras estático.
    const learnedRules = await learning.list(tenant.id, FINANCE_IMPORT_MODULE);
    const review = engine.buildReview(normalized, { learnedRules });
    session.review = review;
    putFinanceImportSession(session);

    const errorCount = review.reduce(
      (acc, r) => acc + r.issues.filter((i) => i.severity === "error").length,
      0,
    );
    const lowConfidence = review.filter(
      (r) =>
        r.classification.status === "low_confidence" ||
        r.classification.status === "unclassified",
    ).length;

    return {
      success: true as const,
      review,
      summary: {
        total: review.length,
        withErrors: review.filter((r) =>
          r.issues.some((i) => i.severity === "error"),
        ).length,
        lowConfidence,
        errorCount,
      },
    };
  } catch (error) {
    return toError(error);
  }
}

export async function patchFinanceImportReviewRow(
  tenantSlug: string,
  sessionId: string,
  rowNumber: number,
  patch: {
    categorySuggested?: string | null;
    status?: ImportReviewRow["classification"]["status"];
  },
) {
  try {
    const { tenant, profile, learning } = await resolveFinanceImport(tenantSlug);
    const session = getFinanceImportSession(sessionId, tenant.id);
    if (!session?.review) {
      throw new Error("Revisão não encontrada. Gere a pré-visualização novamente.");
    }
    const row = session.review.find((r) => r.rowNumber === rowNumber);
    if (!row) throw new Error(`Linha ${rowNumber} não encontrada.`);

    let learnedFromRow = false;
    if (patch.categorySuggested !== undefined) {
      row.classification.categorySuggested = patch.categorySuggested;
      row.classification.status = "edited";
      row.classification.confidence = 1;
      row.classification.reason = "Categoria editada pelo utilizador";
      learnedFromRow = true;
    }
    if (patch.status) {
      row.classification.status = patch.status;
      if (patch.status === "confirmed") {
        row.classification.confidence = Math.max(
          row.classification.confidence,
          0.99,
        );
        row.classification.reason = "Confirmado pelo utilizador";
        learnedFromRow = true;
      }
    }

    // Sprint 22.6 — aprendizado: toda confirmação/edição de categoria vira
    // regra reutilizável para futuras importações do mesmo tenant.
    if (learnedFromRow && row.classification.categorySuggested && row.description.trim()) {
      await learning.upsertFromConfirmation({
        tenantId: tenant.id,
        module: FINANCE_IMPORT_MODULE,
        description: row.description,
        category: row.classification.categorySuggested,
        subcategory: row.classification.subcategorySuggested,
        costCenter: row.classification.costCenterSuggested,
        dreGroup: row.classification.dreGroupSuggested,
        userId: profile.id,
      });
    }

    putFinanceImportSession(session);
    return { success: true as const, row };
  } catch (error) {
    return toError(error);
  }
}

export async function commitFinanceImport(
  tenantSlug: string,
  input: {
    sessionId: string;
    bankAccountId: string;
    confirmedRowNumbers: number[];
    profileId?: string | null;
  },
) {
  try {
    const {
      tenant,
      profile,
      context,
      kit,
      engine,
      mapping,
      runItems,
      client,
      rollback,
    } = await resolveFinanceImport(tenantSlug);

    if (!input.bankAccountId) {
      throw new Error("Selecione a conta bancária de destino.");
    }
    if (!input.confirmedRowNumbers.length) {
      throw new Error("Confirme ao menos uma linha para importar.");
    }

    const session = getFinanceImportSession(input.sessionId, tenant.id);
    if (!session?.review) {
      throw new Error("Sessão de revisão inválida.");
    }

    const accounts = await kit.bankAccounts.list(context);
    const account = accounts.find((a) => a.id === input.bankAccountId);
    if (!account || account.status !== "active") {
      throw new Error("Conta bancária inválida ou arquivada.");
    }

    const categories = await kit.categories.list(context);
    const costCenters = await kit.costCenters.list(context);

    const findCategoryId = (name: string | null | undefined) => {
      if (!name?.trim()) return null;
      const n = name.trim().toLowerCase();
      return categories.find((c) => c.name.toLowerCase() === n)?.id ?? null;
    };
    const findCostCenterId = (name: string | null | undefined) => {
      if (!name?.trim()) return null;
      const n = name.trim().toLowerCase();
      return costCenters.find((c) => c.name.toLowerCase() === n)?.id ?? null;
    };

    // Sprint 22.6 — cada movimentação criada vira um `ImportRunItem`, âncora
    // do rollback (nunca altera a lógica de cálculo/criação da movimentação).
    const createdItems: Array<{
      rowNumber: number;
      targetId: string;
      payloadSnapshot: Record<string, unknown>;
    }> = [];

    const result = await engine.commit({
      userLabel: profile.name ?? profile.email ?? profile.id,
      profileId: input.profileId ?? null,
      request: {
        tenantId: tenant.id,
        userId: profile.id,
        module: FINANCE_IMPORT_MODULE,
        targetEntity: FINANCE_IMPORT_ENTITY,
        fileName: session.fileName,
        format: session.parsed.format,
        mapping: session.mapping,
        rows: session.review,
        confirmedRowNumbers: input.confirmedRowNumbers,
      },
      onCommitRow: async (row) => {
        const amountRaw = Number(row.values.amount);
        if (!Number.isFinite(amountRaw) || amountRaw === 0) {
          throw new Error("Valor inválido.");
        }
        const amount = Math.abs(amountRaw);
        const kind = resolveMovementKind(amountRaw, row.values.kind);
        const date = String(row.values.date ?? "");
        const description = String(row.values.description ?? "").trim();
        if (!description || !date) {
          throw new Error("Descrição/data obrigatórias.");
        }

        // Nunca cria categorias/centros silenciosamente — apenas associa existentes.
        const categoryName =
          row.classification.categorySuggested ??
          (typeof row.values.category === "string" ? row.values.category : null);
        const categoryId = findCategoryId(categoryName);
        const costCenterId = findCostCenterId(
          row.classification.costCenterSuggested ??
            (typeof row.values.cost_center === "string"
              ? row.values.cost_center
              : null),
        );

        const supplierNote =
          typeof row.values.supplier === "string" && row.values.supplier
            ? `Fornecedor: ${row.values.supplier}`
            : null;

        const movement = await kit.movements.create(context, {
          bankAccountId: input.bankAccountId,
          kind,
          amount,
          movementDate: date,
          description,
          categoryId,
          costCenterId,
          notes: [
            supplierNote,
            row.classification.categorySuggested
              ? `Classificação: ${row.classification.categorySuggested} (${Math.round(row.classification.confidence * 100)}%)`
              : null,
            "Origem: Import Engine 22.5",
          ]
            .filter(Boolean)
            .join(" · "),
        });

        createdItems.push({
          rowNumber: row.rowNumber,
          targetId: movement.id,
          payloadSnapshot: {
            bankAccountId: input.bankAccountId,
            kind,
            amount,
            movementDate: date,
            description,
            categoryId,
            costCenterId,
          },
        });
      },
    });

    // Sprint 22.6 — persiste os itens do run (base do rollback) e atualiza
    // o uso do perfil de mapeamento, se houver um selecionado.
    if (createdItems.length) {
      await runItems.appendMany(
        createdItems.map((it) => ({
          tenantId: tenant.id,
          runId: result.logId,
          rowNumber: it.rowNumber,
          targetType: "cash_movement",
          targetId: it.targetId,
          operation: "create",
          payloadSnapshot: it.payloadSnapshot,
        })),
      );
    }
    if (input.profileId) {
      await mapping.touchUsage(tenant.id, input.profileId);
    }

    // Sprint 22.6.2.1 — staging de extrato para conciliação (sem alterar Import Engine).
    // Erro de persistência NÃO é silencioso.
    try {
      const {
        createStatementPersistenceFromClient,
        persistStatementLinesFromFinanceImport,
      } = await import(
        "@/lib/finance/reconciliation/statement-import-persistence"
      );
      const stmtRepo = createStatementPersistenceFromClient(client);
      const reviewByRow = new Map(
        (session.review ?? []).map((r) => [r.rowNumber, r]),
      );
      const stmtRows = createdItems.map((it) => {
        const snap = it.payloadSnapshot;
        const review = reviewByRow.get(it.rowNumber);
        const values = review?.values ?? {};
        const externalRaw = values.external_id;
        const docRaw = values.document;
        const supplierRaw = values.supplier;
        const balanceRaw = values.balance;
        return {
          rowNumber: it.rowNumber,
          date: String(snap.movementDate ?? ""),
          amount:
            snap.kind === "saida"
              ? -Math.abs(Number(snap.amount))
              : Math.abs(Number(snap.amount)),
          description: String(snap.description ?? ""),
          document: typeof docRaw === "string" ? docRaw : null,
          counterparty: typeof supplierRaw === "string" ? supplierRaw : null,
          externalId: typeof externalRaw === "string" ? externalRaw : null,
          balanceAfter:
            typeof balanceRaw === "number" || typeof balanceRaw === "string"
              ? Number(balanceRaw)
              : null,
          movementId: it.targetId,
        };
      });
      await persistStatementLinesFromFinanceImport({
        repository: stmtRepo,
        tenantId: tenant.id,
        bankAccountId: input.bankAccountId,
        importRunId: result.logId,
        rows: stmtRows,
      });
    } catch (persistError) {
      const msg =
        persistError instanceof Error
          ? persistError.message
          : "Falha ao gravar extrato para conciliação.";

      // Sprint 22.10.1 — operação parcial não fica escondida: tenta compensar via rollback.
      let compensation = "rollback não executado";
      try {
        if (createdItems.length && result.logId) {
          const plan = await rollback.executeRollback(
            tenant.id,
            result.logId,
            profile.id,
            async (item) => {
              if (typeof kit.movements.delete !== "function") {
                throw new Error(
                  "Reversão de movimentações não disponível nesta instalação.",
                );
              }
              await kit.movements.delete(context, item.targetId);
            },
          );
          compensation =
            plan.status === "done"
              ? `rollback concluído (${plan.affectedRows} itens)`
              : `rollback status=${plan.status}: ${plan.reason ?? "sem detalhe"}`;
        }
      } catch (rollbackError) {
        const rmsg =
          rollbackError instanceof Error
            ? rollbackError.message
            : "falha no rollback";
        compensation = `rollback falhou: ${rmsg}`;
      }

      return {
        success: false as const,
        partial: true as const,
        runId: result.logId,
        error:
          `Operação parcial: movimentos foram criados (run ${result.logId}), ` +
          `mas falhou ao persistir linhas de extrato: ${msg}. Compensação: ${compensation}. ` +
          `Não trate esta importação como concluída.`,
      };
    }

    revalidatePath(`/${tenantSlug}/financeiro`);
    revalidatePath(`/${tenantSlug}/financeiro/movimentacoes`);
    revalidatePath(`/${tenantSlug}/financeiro/importar`);
    revalidatePath(`/${tenantSlug}/financeiro/conciliacao`);

    return { success: true as const, result };
  } catch (error) {
    return toError(error);
  }
}

export async function rollbackFinanceImport(tenantSlug: string, runId: string) {
  try {
    const { tenant, profile, context, kit, audit, rollback } =
      await resolveFinanceImport(tenantSlug);

    const plan = await rollback.executeRollback(
      tenant.id,
      runId,
      profile.id,
      async (item) => {
        if (typeof kit.movements.delete !== "function") {
          throw new Error(
            "Reversão de movimentações não disponível nesta instalação.",
          );
        }
        await kit.movements.delete(context, item.targetId);
      },
    );

    await audit.append({
      tenantId: tenant.id,
      userId: profile.id,
      actorType: context.actorType,
      systemActorKey: context.systemActorKey,
      event: "import.rollback",
      category: "import",
      severity: plan.status === "done" ? "info" : "warning",
      targetType: "import_run",
      targetId: runId,
      resource: "import_run",
      module: "integracoes",
      description: plan.reason,
      metadata: {
        status: plan.status,
        affectedRows: plan.affectedRows,
        module: plan.module,
      },
      origin: context.source,
      correlationId: context.correlationId,
      requestId: context.requestId,
      sessionId: context.sessionId,
      ipAddress: null,
      device: null,
    });

    revalidatePath(`/${tenantSlug}/financeiro`);
    revalidatePath(`/${tenantSlug}/financeiro/movimentacoes`);
    revalidatePath(`/${tenantSlug}/financeiro/importar`);
    revalidatePath(`/${tenantSlug}/integracoes/importar/financeiro`);

    return { success: plan.status === "done", plan };
  } catch (error) {
    return toError(error);
  }
}
