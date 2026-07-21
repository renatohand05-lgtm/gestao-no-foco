import { CRM_DEFAULT_TAGS } from "@/lib/crm/constants";
import { MasterDataRepository } from "@/lib/master-data/master-data-repository";
import { createClient } from "@/lib/supabase/server";

/** Garante etiquetas padrão do CRM (VIP, Frota, etc.) para o tenant. */
export async function ensureCrmDefaultTags(tenantId: string): Promise<void> {
  const supabase = await createClient();
  const repo = new MasterDataRepository(supabase, tenantId);

  for (const tag of CRM_DEFAULT_TAGS) {
    await repo.ensureTag(tag.nome, tag.cor);
  }
}
