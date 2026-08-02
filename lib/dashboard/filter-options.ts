import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { DashboardFilterOptions } from "@/types/dashboard-executive";

/**
 * Opções de filtro do dashboard — memoizado por request (React.cache).
 * Sem cache cross-request / cross-tenant (Sprint 29.1).
 */
export const fetchDashboardFilterOptions = cache(
  async (tenantId: string): Promise<DashboardFilterOptions> => {
    const supabase = await createClient();

    const [centrosResult, categoriasResult, contasResult] = await Promise.all([
      supabase
        .from("centros_custo")
        .select("id, nome")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("contas_bancarias")
        .select("id, nome")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (centrosResult.error) throw new Error(centrosResult.error.message);
    if (categoriasResult.error) throw new Error(categoriasResult.error.message);
    if (contasResult.error) throw new Error(contasResult.error.message);

    return {
      centrosCusto: centrosResult.data ?? [],
      categorias: categoriasResult.data ?? [],
      contasBancarias: contasResult.data ?? [],
    };
  },
);
