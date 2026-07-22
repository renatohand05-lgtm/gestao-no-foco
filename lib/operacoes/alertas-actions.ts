"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { createAlertasOperacionaisService } from "@/lib/operacoes/alertas-service";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

export async function syncAlertasAction(
  tenantSlug: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    await createPermissionService(tenant.id, tenant.role).then((p) =>
      p.require("centro_operacoes.ver_alertas"),
    );
    const service = await createAlertasOperacionaisService(
      tenant.id,
      tenantSlug,
    );
    await service.syncAndList();
    revalidatePath(`/${tenantSlug}/centro-operacoes/alertas`);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao sincronizar alertas.", "alertas.sync");
  }
}

export async function tratarAlertaAction(
  tenantSlug: string,
  alertaId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = z
      .object({
        observacao: z.string().optional().nullable(),
        responsavel_id: z.string().uuid().optional().nullable(),
      })
      .parse(values ?? {});
    const service = await createAlertasOperacionaisService(
      tenant.id,
      tenantSlug,
    );
    await service.tratar(
      alertaId,
      profile?.id ?? null,
      parsed.observacao,
      parsed.responsavel_id,
    );
    revalidatePath(`/${tenantSlug}/centro-operacoes/alertas`);
    return { success: true, id: alertaId };
  } catch (error) {
    return toActionError(error, "Erro ao tratar alerta.", "alertas.tratar");
  }
}

export async function reabrirAlertaAction(
  tenantSlug: string,
  alertaId: string,
  observacao?: string | null,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createAlertasOperacionaisService(
      tenant.id,
      tenantSlug,
    );
    await service.reabrir(alertaId, profile?.id ?? null, observacao);
    revalidatePath(`/${tenantSlug}/centro-operacoes/alertas`);
    return { success: true, id: alertaId };
  } catch (error) {
    return toActionError(error, "Erro ao reabrir alerta.", "alertas.reabrir");
  }
}
