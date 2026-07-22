"use server";

import { createResumoVendasMesService } from "@/lib/dashboard/resumo-vendas-mes-service";
import { requireTenant } from "@/lib/tenants";
import type { ResumoMesDiaDetail } from "@/lib/dashboard/resumo-vendas-mes-service";

export async function loadResumoDiaDetailAction(
  tenantSlug: string,
  data: string,
  filters: {
    centroCustoId?: string | null;
    vendedorId?: string | null;
    origem?: string | null;
  },
): Promise<{ success: true; data: ResumoMesDiaDetail } | { success: false; error: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createResumoVendasMesService(tenant.id);
    const detail = await service.getDiaDetail(data, filters);
    return { success: true, data: detail };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o detalhe do dia.",
    };
  }
}
