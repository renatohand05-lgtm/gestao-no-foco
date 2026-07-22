"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { createDashboardPreferenciasService } from "@/lib/operacoes/dashboard-prefs-service";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

const saveSchema = z.object({
  dashboardTipo: z.string().min(1),
  modo: z.enum(["normal", "executivo", "comercial"]).optional(),
  cardsVisiveis: z.array(z.string()).optional(),
  order: z.array(z.string()).optional(),
  fullscreenDefault: z.boolean().optional(),
});

export async function saveDashboardPrefsAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    if (!profile?.id) throw new Error("Usuário não autenticado.");
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("dashboard.personalizar");
    const parsed = saveSchema.parse(values);
    const service = await createDashboardPreferenciasService(
      tenant.id,
      profile.id,
    );
    await service.save(parsed.dashboardTipo, {
      modo: parsed.modo,
      cardsVisiveis: parsed.cardsVisiveis,
      fullscreenDefault: parsed.fullscreenDefault,
      layout: parsed.order ? { order: parsed.order } : undefined,
    });
    revalidatePath(`/${tenantSlug}/centro-operacoes`);
    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/vendas/dashboard`);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao salvar layout.", "dash.prefs");
  }
}

export async function restoreDashboardPrefsAction(
  tenantSlug: string,
  dashboardTipo: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    if (!profile?.id) throw new Error("Usuário não autenticado.");
    const service = await createDashboardPreferenciasService(
      tenant.id,
      profile.id,
    );
    await service.restoreDefault(dashboardTipo);
    revalidatePath(`/${tenantSlug}/centro-operacoes`);
    revalidatePath(`/${tenantSlug}/dashboard`);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao restaurar padrão.", "dash.restore");
  }
}
