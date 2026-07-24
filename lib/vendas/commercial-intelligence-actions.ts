"use server";

import { createOsClienteSearchService } from "@/lib/ordens/os-abrir-rpc";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import {
  CI_CLIENTE_SEARCH_MIN_CHARS,
  shouldRunCiClienteSearch,
} from "@/lib/vendas/commercial-intelligence-compose";

export type CommercialClienteSearchHit = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
};

export async function searchClientesCommercialAction(
  tenantSlug: string,
  q: string,
): Promise<
  | { success: true; hits: CommercialClienteSearchHit[] }
  | { success: false; error: string }
> {
  try {
    if (!shouldRunCiClienteSearch(q, CI_CLIENTE_SEARCH_MIN_CHARS)) {
      return { success: true, hits: [] };
    }
    const tenant = await requireTenant(tenantSlug);
    const service = await createOsClienteSearchService(tenant.id);
    const raw = await service.search(q, 12);
    const seen = new Set<string>();
    const hits: CommercialClienteSearchHit[] = [];
    for (const h of raw) {
      if (seen.has(h.cliente_id)) continue;
      seen.add(h.cliente_id);
      hits.push({
        id: h.cliente_id,
        nome: h.cliente_nome,
        documento: h.documento ?? null,
        telefone: h.telefone ?? h.whatsapp ?? null,
      });
    }
    return { success: true, hits };
  } catch (error) {
    return toActionError(
      error,
      "Erro na busca de clientes.",
      "vendas.searchClientesCommercial",
    );
  }
}
