"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { createDashboardLayoutService } from "@/lib/dashboard-layout/persistence/layout-service";
import { LayoutValidationError } from "@/lib/dashboard-layout/persistence/layout-validation";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateDashboard(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}/dashboard`);
}

function toError(error: unknown, fallback: string): string {
  if (error instanceof LayoutValidationError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? fallback;
  if (error instanceof Error) {
    if (error.message === "CONFLICT_VERSION") {
      return "Conflito de versão: o layout foi alterado em outro lugar. Recarregue e tente novamente.";
    }
    return error.message || fallback;
  }
  return fallback;
}

async function resolveActor(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new Error("Sessão inválida.");
  }
  return { tenant, userId: profile.id };
}

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  presetKey: z.string().nullable().optional(),
  layoutData: z.unknown(),
  density: z
    .enum(["executive", "comfortable", "compact"])
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export async function saveDashboardLayoutAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const parsed = saveSchema.parse(values);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const row = await service.save({
      id: parsed.id,
      name: parsed.name,
      presetKey: (parsed.presetKey as never) ?? null,
      layoutData: parsed.layoutData as never,
      density: parsed.density ?? null,
      isDefault: parsed.isDefault,
      expectedVersion: parsed.expectedVersion,
    });
    revalidateDashboard(tenantSlug);
    return { success: true, id: row.id };
  } catch (error) {
    return { success: false, error: toError(error, "Erro ao salvar layout.") };
  }
}

export async function duplicateDashboardLayoutAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const row = await service.duplicate(id);
    revalidateDashboard(tenantSlug);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao duplicar layout."),
    };
  }
}

export async function renameDashboardLayoutAction(
  tenantSlug: string,
  id: string,
  name: string,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    await service.rename(id, name);
    revalidateDashboard(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao renomear layout."),
    };
  }
}

export async function setDefaultDashboardLayoutAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    await service.setDefault(id);
    revalidateDashboard(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao definir layout padrão."),
    };
  }
}

export async function deleteDashboardLayoutAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    await service.softDelete(id);
    revalidateDashboard(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao excluir layout."),
    };
  }
}

export async function restoreDashboardPresetAction(
  tenantSlug: string,
  presetKey: string,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const row = await service.restorePreset(presetKey as never);
    revalidateDashboard(tenantSlug);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao restaurar preset."),
    };
  }
}

export async function importDashboardLayoutAction(
  tenantSlug: string,
  rawJson: string,
  options?: { name?: string; setDefault?: boolean },
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const row = await service.importJson(rawJson, options);
    revalidateDashboard(tenantSlug);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao importar layout."),
    };
  }
}

export async function loadDashboardLayoutAction(
  tenantSlug: string,
  id: string,
): Promise<
  | { success: true; record: Awaited<ReturnType<Awaited<ReturnType<typeof createDashboardLayoutService>>["get"]>> }
  | { success: false; error: string }
> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const record = await service.get(id);
    if (!record) return { success: false, error: "Layout não encontrado." };
    return { success: true, record };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao carregar layout."),
    };
  }
}

export async function listDashboardLayoutsAction(
  tenantSlug: string,
): Promise<
  | {
      success: true;
      items: Awaited<
        ReturnType<Awaited<ReturnType<typeof createDashboardLayoutService>>["list"]>
      >;
    }
  | { success: false; error: string }
> {
  try {
    const { tenant, userId } = await resolveActor(tenantSlug);
    const service = await createDashboardLayoutService(tenant.id, userId);
    const items = await service.list();
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: toError(error, "Erro ao listar layouts."),
    };
  }
}
