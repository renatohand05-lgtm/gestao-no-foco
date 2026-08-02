/**
 * Sprint 27.8 — Gestão segura da base de serviços (soft-delete / desativar).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ServiceManagementRow = {
  id: string;
  nome: string;
  codigo_interno: string | null;
  sku: string | null;
  categoria: string | null;
  custo: number | null;
  preco_venda: number | null;
  preco_sugerido: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  observacoes: string | null;
  origem: "importacao" | "manual";
  importRunId: string | null;
};

export type ServiceCleanupPreview = {
  total: number;
  excluiveis: number;
  arquivaveis: number;
  custoZero: number;
  precoZero: number;
  duplicados: number;
  excluivelIds: string[];
  arquivavelIds: string[];
};

function parseImportRun(observacoes: string | null): string | null {
  if (!observacoes) return null;
  const m = observacoes.match(/import_run:([a-zA-Z0-9-_]+)/);
  return m?.[1] ?? null;
}

export class ServiceBulkService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listServices(search?: string): Promise<ServiceManagementRow[]> {
    let query = this.supabase
      .from("produtos")
      .select(
        "id, nome, codigo_interno, sku, categoria, custo, preco_venda, preco_sugerido, ativo, created_at, updated_at, observacoes",
      )
      .eq("tenant_id", this.tenantId)
      .eq("tipo", "servico")
      .is("deleted_at", null)
      .order("nome", { ascending: true })
      .limit(2000);

    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(
        `nome.ilike.${q},codigo_interno.ilike.${q},sku.ilike.${q}`,
      );
    }

    const { data, error } = await query;
    if (error) {
      // Colunas novas podem não existir até aplicar migration — retry sem preco_sugerido
      const fallback = await this.supabase
        .from("produtos")
        .select(
          "id, nome, codigo_interno, sku, categoria, custo, preco_venda, ativo, created_at, updated_at, observacoes",
        )
        .eq("tenant_id", this.tenantId)
        .eq("tipo", "servico")
        .is("deleted_at", null)
        .order("nome", { ascending: true })
        .limit(2000);
      if (fallback.error) throw new Error(fallback.error.message);
      return (fallback.data ?? []).map((row) => {
        const importRunId = parseImportRun(row.observacoes);
        return {
          ...row,
          preco_sugerido: null,
          origem: importRunId ? ("importacao" as const) : ("manual" as const),
          importRunId,
        };
      });
    }

    return (data ?? []).map((row) => {
      const importRunId = parseImportRun(row.observacoes);
      return {
        ...row,
        preco_sugerido: row.preco_sugerido ?? null,
        origem: importRunId ? ("importacao" as const) : ("manual" as const),
        importRunId,
      };
    });
  }

  async findUsedServiceIds(ids: string[]): Promise<Set<string>> {
    const used = new Set<string>();
    if (ids.length === 0) return used;

    const chunk = 200;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const [vendas, os] = await Promise.all([
        this.supabase
          .from("venda_itens")
          .select("produto_id")
          .eq("tenant_id", this.tenantId)
          .in("produto_id", slice)
          .limit(5000),
        this.supabase
          .from("ordem_servico_itens")
          .select("produto_id")
          .eq("tenant_id", this.tenantId)
          .in("produto_id", slice)
          .limit(5000),
      ]);

      for (const row of vendas.data ?? []) {
        if (row.produto_id) used.add(row.produto_id);
      }
      for (const row of os.data ?? []) {
        if (row.produto_id) used.add(row.produto_id);
      }
    }

    return used;
  }

  async previewCleanup(): Promise<ServiceCleanupPreview> {
    const services = await this.listServices();
    const ids = services.map((s) => s.id);
    const used = await this.findUsedServiceIds(ids);

    const excluivelIds = ids.filter((id) => !used.has(id));
    const arquivavelIds = ids.filter((id) => used.has(id));

    const byCode = new Map<string, number>();
    for (const s of services) {
      const key = (s.codigo_interno || s.sku || s.nome).toLowerCase();
      byCode.set(key, (byCode.get(key) ?? 0) + 1);
    }
    const duplicados = [...byCode.values()].filter((n) => n > 1).length;

    return {
      total: services.length,
      excluiveis: excluivelIds.length,
      arquivaveis: arquivavelIds.length,
      custoZero: services.filter((s) => !s.custo || s.custo === 0).length,
      precoZero: services.filter((s) => !s.preco_venda || s.preco_venda === 0)
        .length,
      duplicados,
      excluivelIds,
      arquivavelIds,
    };
  }

  async deactivateServices(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { data, error } = await this.supabase
      .from("produtos")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("tipo", "servico")
      .is("deleted_at", null)
      .in("id", ids)
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async softDeleteServices(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const used = await this.findUsedServiceIds(ids);
    const safe = ids.filter((id) => !used.has(id));
    if (safe.length === 0) return 0;
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("produtos")
      .update({ deleted_at: now, ativo: false, updated_at: now })
      .eq("tenant_id", this.tenantId)
      .eq("tipo", "servico")
      .is("deleted_at", null)
      .in("id", safe)
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  /**
   * Limpa base: soft-delete sem dependência; desativa com dependência.
   * Exige confirmação digitada LIMPAR SERVIÇOS. Nunca hard delete. Nunca toca produtos.
   */
  async limparBaseServicos(input: {
    confirmation: string;
    userId: string;
  }): Promise<{
    softDeleted: number;
    deactivated: number;
    preview: ServiceCleanupPreview;
  }> {
    if (input.confirmation.trim() !== "LIMPAR SERVIÇOS") {
      throw new Error('Confirmação inválida. Digite exatamente: LIMPAR SERVIÇOS');
    }

    const preview = await this.previewCleanup();
    const softDeleted = await this.softDeleteServices(preview.excluivelIds);
    const deactivated = await this.deactivateServices(preview.arquivavelIds);

    console.info("[audit:servicos:limpar-base]", {
      tenantId: this.tenantId,
      userId: input.userId,
      softDeleted,
      deactivated,
      at: new Date().toISOString(),
    });

    return { softDeleted, deactivated, preview };
  }
}

export async function createServiceBulkService(tenantId: string) {
  const supabase = await createClient();
  return new ServiceBulkService(supabase, tenantId);
}
