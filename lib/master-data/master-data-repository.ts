import type { SupabaseClient } from "@supabase/supabase-js";

import {
  masterCacheGet,
  masterCacheInvalidate,
  masterCacheSet,
  MASTER_CACHE_BUCKETS,
} from "@/lib/master-data/master-data-cache";
import { slugifyTag } from "@/lib/master-data/master-data-validation";
import type { TagRecord, MasterEntityTagTarget } from "@/lib/master-data/master-data-types";
import type { Database } from "@/types/database";

/** Acesso de baixo nível a tags — isolado por tenant. */
export class MasterDataRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listTags(): Promise<TagRecord[]> {
    const cached = masterCacheGet<TagRecord[]>(this.tenantId, "tags_ativas");
    if (cached) return cached;

    const { data, error } = await this.supabase
      .from("tags" as never)
      .select("id, tenant_id, nome, slug, cor, ativo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      if (error.message.toLowerCase().includes("tags")) return [];
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as TagRecord[];
    masterCacheSet(this.tenantId, "tags_ativas", rows);
    return rows;
  }

  async ensureTag(nome: string, cor?: string | null): Promise<TagRecord | null> {
    const slug = slugifyTag(nome);
    if (!slug) return null;

    const existing = await this.supabase
      .from("tags" as never)
      .select("id, tenant_id, nome, slug, cor, ativo")
      .eq("tenant_id", this.tenantId)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing.data) return existing.data as unknown as TagRecord;

    const { data, error } = await this.supabase
      .from("tags" as never)
      .insert({
        tenant_id: this.tenantId,
        nome: nome.trim(),
        slug,
        cor: cor ?? null,
        ativo: true,
      } as never)
      .select("id, tenant_id, nome, slug, cor, ativo")
      .single();

    if (error) throw new Error(error.message);
    masterCacheInvalidate(this.tenantId, "tags_ativas");
    return data as unknown as TagRecord;
  }

  async setEntityTags(
    entityType: MasterEntityTagTarget,
    entityId: string,
    tagIds: string[],
  ): Promise<void> {
    const { error: delError } = await this.supabase
      .from("entity_tags" as never)
      .delete()
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (delError && !delError.message.toLowerCase().includes("entity_tags")) {
      throw new Error(delError.message);
    }

    if (tagIds.length === 0) return;

    const { error } = await this.supabase.from("entity_tags" as never).insert(
      tagIds.map((tag_id) => ({
        tenant_id: this.tenantId,
        tag_id,
        entity_type: entityType,
        entity_id: entityId,
      })) as never,
    );

    if (error) throw new Error(error.message);
  }

  async listEntityTagNames(
    entityType: MasterEntityTagTarget,
    entityId: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("entity_tags" as never)
      .select("tag_id, tags:tags ( nome )")
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (error) {
      if (error.message.toLowerCase().includes("entity_tags")) return [];
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => (row as { tags?: { nome?: string } | null }).tags?.nome)
      .filter(Boolean) as string[];
  }
}

export { MASTER_CACHE_BUCKETS };
