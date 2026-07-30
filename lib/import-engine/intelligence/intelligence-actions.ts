"use server";

/**
 * Sprint 22.6 — Ações server-side agregadas da Import Engine
 * (histórico, perfis, aprendizado, rollback) — multi-módulo.
 *
 * Lê/gere a persistência via `createProductionImportEngine()`; a lógica de negócio de
 * cada módulo continua nos respetivos services (ex.: `lib/finance`). O
 * rollback de dados definitivos é sempre delegado ao módulo dono do dado —
 * hoje só o Financeiro cria registos definitivos via engine (Vendas/OS ainda
 * usam staging, ver `adapters/sales` e `adapters/service-orders`).
 */
import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import {
  assertFinanceAccess,
  assertFinancePermission,
  resolveFinanceEffectivePermissions,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { TenantWithRole } from "@/types";

import { createProductionImportEngine } from "../persistence/create-import-engine.ts";
import { computeMappingConfidence } from "../mapping/mapping-confidence.ts";
import type {
  ImportColumn,
  ImportColumnMapping,
  ImportFieldDef,
  ImportHistoryEntry,
  ImportMappingConfidence,
} from "../types/index.ts";

const ROLES_ALLOWED_TO_MANAGE = new Set(["owner", "admin", "manager"]);
const FINANCE_MODULE_KEYS = new Set(["financeiro", "finance"]);

function toError(error: unknown): { success: false; error: string } {
  return {
    success: false,
    error:
      error instanceof Error ? error.message : "Erro na operação de importação.",
  };
}

async function requireImportTenant(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new Error("Sessão ausente.");
  }
  const client = await createClient();
  const bundle = createProductionImportEngine(client);
  return { tenant, profile, client, bundle };
}

function assertCanManage(tenant: TenantWithRole) {
  if (!ROLES_ALLOWED_TO_MANAGE.has(tenant.role)) {
    throw new Error("Sem permissão para gerir importações neste espaço.");
  }
}

/** Perfis/rollbacks do módulo Financeiro exigem `financeiro.criar` (RBAC fino). */
async function assertModuleMutationAccess(params: {
  tenant: TenantWithRole;
  profile: { id: string };
  client: Awaited<ReturnType<typeof createClient>>;
  module: string;
}) {
  if (!FINANCE_MODULE_KEYS.has(params.module)) {
    assertCanManage(params.tenant);
    return;
  }
  const rbac = createRbacSupabaseAdapter(params.client);
  const snap = await rbac.resolveAuthorizationSnapshot(
    params.tenant.id,
    params.profile.id,
  );
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: params.tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  assertFinanceAccess(effective.permissions);
  assertFinancePermission(effective.permissions, "financeiro.criar");
}

/* ————————————————— Histórico ————————————————— */

export async function listImportRuns(
  tenantSlug: string,
  options?: { module?: string; status?: string; limit?: number; offset?: number },
) {
  try {
    const { tenant, bundle } = await requireImportTenant(tenantSlug);
    const page = await bundle.history.listPage(tenant.id, {
      module: options?.module,
      status: options?.status as ImportHistoryEntry["status"] | undefined,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    });
    return { success: true as const, ...page };
  } catch (error) {
    return toError(error);
  }
}

export async function getImportRun(tenantSlug: string, runId: string) {
  try {
    const { tenant, bundle } = await requireImportTenant(tenantSlug);
    const run = await bundle.history.getById(tenant.id, runId);
    if (!run) throw new Error("Importação não encontrada.");
    const items = await bundle.runItems.listByRun(tenant.id, runId);
    return { success: true as const, run, items };
  } catch (error) {
    return toError(error);
  }
}

/* ————————————————— Perfis de mapeamento ————————————————— */

export async function listImportProfiles(tenantSlug: string, module: string) {
  try {
    const { tenant, bundle } = await requireImportTenant(tenantSlug);
    const profiles = await bundle.mapping.list(tenant.id, module);
    return { success: true as const, profiles };
  } catch (error) {
    return toError(error);
  }
}

export async function saveImportProfile(
  tenantSlug: string,
  input: {
    module: string;
    targetEntity: string;
    name: string;
    mapping: ImportColumnMapping;
    description?: string | null;
    makeDefault?: boolean;
  },
) {
  try {
    const { tenant, profile, client, bundle } = await requireImportTenant(tenantSlug);
    await assertModuleMutationAccess({ tenant, profile, client, module: input.module });

    const saved = await bundle.mapping.save({
      tenantId: tenant.id,
      module: input.module,
      targetEntity: input.targetEntity,
      name: input.name,
      mapping: input.mapping,
      description: input.description ?? null,
      makeDefault: input.makeDefault,
      createdBy: profile.id,
    });

    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: true as const, profile: saved };
  } catch (error) {
    return toError(error);
  }
}

export async function duplicateImportProfile(
  tenantSlug: string,
  input: { module: string; id: string; name: string },
) {
  try {
    const { tenant, profile, client, bundle } = await requireImportTenant(tenantSlug);
    await assertModuleMutationAccess({ tenant, profile, client, module: input.module });
    const copy = await bundle.mapping.duplicate(tenant.id, input.id, input.name);
    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: true as const, profile: copy };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteImportProfile(
  tenantSlug: string,
  input: { module: string; id: string },
) {
  try {
    const { tenant, profile, client, bundle } = await requireImportTenant(tenantSlug);
    await assertModuleMutationAccess({ tenant, profile, client, module: input.module });
    await bundle.mapping.remove(tenant.id, input.id);
    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: true as const };
  } catch (error) {
    return toError(error);
  }
}

/* ————————————————— Aprendizado ————————————————— */

export async function listLearningRules(tenantSlug: string, module: string) {
  try {
    const { tenant, bundle } = await requireImportTenant(tenantSlug);
    const rules = await bundle.learning.list(tenant.id, module);
    return { success: true as const, rules };
  } catch (error) {
    return toError(error);
  }
}

/* ————————————————— Confiança de mapeamento ————————————————— */

export async function computeImportMappingConfidence(input: {
  mapping: ImportColumnMapping;
  columns: Array<ImportColumn | string>;
  fields: ImportFieldDef[];
}): Promise<{ success: true; confidence: ImportMappingConfidence[] }> {
  return {
    success: true,
    confidence: computeMappingConfidence(input.mapping, input.columns, input.fields),
  };
}

/* ————————————————— Rollback ————————————————— */

export async function prepareImportRollback(tenantSlug: string, runId: string) {
  try {
    const { tenant, bundle } = await requireImportTenant(tenantSlug);
    const plan = await bundle.rollback.prepareRollback(tenant.id, runId);
    return { success: true as const, plan };
  } catch (error) {
    return toError(error);
  }
}

/**
 * Executa o rollback de um run. Para o módulo Financeiro, delega a
 * `rollbackFinanceImport` (reverte movimentações reais via estorno). Para
 * Vendas/Ordens de Serviço, que ainda não criam registos definitivos através
 * da engine (dados ficam em staging — ver adapters/sales|service-orders),
 * apenas atualiza o estado do run — nenhum dado de negócio é revertido aqui.
 */
export async function executeImportRollback(tenantSlug: string, runId: string) {
  try {
    const { tenant, profile, client, bundle } = await requireImportTenant(tenantSlug);
    const run = await bundle.history.getById(tenant.id, runId);
    if (!run) throw new Error("Importação não encontrada.");

    await assertModuleMutationAccess({ tenant, profile, client, module: run.module });

    if (FINANCE_MODULE_KEYS.has(run.module)) {
      const { rollbackFinanceImport } = await import(
        "@/lib/finance/import/import-actions"
      );
      const result = await rollbackFinanceImport(tenantSlug, runId);
      return result;
    }

    const catalogModules = new Set([
      "catalogo_servicos",
      "estoque_catalogo",
      "notas_fiscais",
    ]);
    if (catalogModules.has(run.module)) {
      const { executeImportUndoAction } = await import(
        "@/lib/import-engine/delete/import-history-actions"
      );
      return executeImportUndoAction(tenantSlug, {
        runId,
        mode: "all_eligible",
        reason: "Rollback via histórico Enterprise",
        confirmed: true,
      });
    }

    // Vendas / Ordens de Serviço — sem persistência definitiva ligada à
    // engine ainda: nada para reverter além do próprio staging.
    const plan = await bundle.rollback.executeRollback(
      tenant.id,
      runId,
      profile.id,
      async () => {
        /* staging-only: não há registo definitivo de negócio a reverter */
      },
    );
    revalidatePath(`/${tenantSlug}/integracoes`);
    return { success: plan.status === "done", plan };
  } catch (error) {
    return toError(error);
  }
}
