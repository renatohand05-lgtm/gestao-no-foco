import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export async function faturarVendaAtomico(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vendaId: string,
  createdBy: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("faturar_venda_atomico", {
    p_tenant_id: tenantId,
    p_venda_id: vendaId,
    p_created_by: createdBy,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao faturar venda.");
  }

  return data;
}

export async function cancelarVendaAtomico(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vendaId: string,
  createdBy: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("cancelar_venda_atomico", {
    p_tenant_id: tenantId,
    p_venda_id: vendaId,
    p_created_by: createdBy,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao cancelar venda.");
  }

  return data;
}
