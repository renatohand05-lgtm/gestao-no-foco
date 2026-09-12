"use server";

import { revalidatePath } from "next/cache";

import { getPlatformAccess } from "@/lib/platform/platform-access-service";
import { deleteTenantPermanently } from "@/lib/platform/tenant-delete-service";
import type { ActionResult } from "@/types/action-result";

/**
 * Exclui uma empresa de vez. Só o dono da plataforma pode usar (parceiros
 * não podem apagar empresa) — e exige digitar o slug exato da empresa
 * como confirmação, pra nunca acontecer por engano.
 */
export async function deleteTenantPermanentlyAction(
  tenantId: string,
  confirmSlug: string,
): Promise<ActionResult> {
  try {
    const access = await getPlatformAccess();
    if (!access) {
      throw new Error("Acesso restrito ao dono/parceiro da plataforma.");
    }
    if (access.role !== "owner") {
      throw new Error("Só o dono da plataforma pode excluir uma empresa.");
    }

    const tenant = access.tenants.find((t) => t.tenantId === tenantId);
    if (!tenant) {
      throw new Error("Empresa não encontrada.");
    }
    if (confirmSlug.trim() !== tenant.tenantSlug) {
      throw new Error(
        "O texto digitado não confere com o identificador da empresa.",
      );
    }

    const result = await deleteTenantPermanently(tenantId);
    if (!result.ok) {
      throw new Error(result.error);
    }

    revalidatePath("/master/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Falha ao excluir a empresa.",
    };
  }
}
