/**
 * Loader — Central Executiva de Estoque (Gate 18.4).
 * Não altera EstoqueDashboardService / contratos públicos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  assertEscTenantIsolation,
  composeExecutiveStock,
  type EscFilters,
  type EscMovRow,
  type EscOsItemRow,
  type EscProdutoRow,
  type EscVendaItemAgg,
  type ExecutiveStockData,
} from "./executive-stock-compose";

export type ExecutiveStockFilters = {
  categoria?: string;
  fornecedor?: string;
  criticidade?: string;
  saldo?: string;
  movimentacao?: string;
  q?: string;
};

export class ExecutiveStockService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async load(
    tenantSlug: string,
    raw: ExecutiveStockFilters = {},
  ): Promise<ExecutiveStockData> {
    const filters: EscFilters = {
      categoria: raw.categoria || null,
      fornecedor: raw.fornecedor || null,
      criticidade: raw.criticidade || null,
      saldo: raw.saldo || null,
      movimentacao: raw.movimentacao || null,
      q: raw.q || null,
    };

    const [produtos, movimentacoes, osBundle, vendaItens, fornCount] =
      await Promise.all([
        this.loadProdutos(),
        this.loadMovimentacoes(),
        this.loadOsItensReservados(),
        this.loadVendaItensRecentes(),
        this.loadFornecedoresAtivosCount(),
      ]);

    const scopedProdutos = assertEscTenantIsolation(produtos, this.tenantId);
    const scopedMovs = assertEscTenantIsolation(movimentacoes, this.tenantId);

    return composeExecutiveStock({
      tenantSlug,
      produtos: scopedProdutos,
      movimentacoes: scopedMovs,
      osItensReservados: osBundle.items,
      osItensDisponiveis: osBundle.ok,
      vendaItens,
      fornecedoresAtivosCount: fornCount,
      filters,
    });
  }

  private async loadProdutos(): Promise<EscProdutoRow[]> {
    const { data, error } = await this.supabase
      .from("produtos")
      .select(
        "id, tenant_id, nome, sku, categoria, fornecedor_principal, estoque_atual, estoque_minimo, custo, preco_venda, tipo, ativo, deleted_at",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .limit(4000);

    if (error) throw new Error(error.message);
    return (data ?? []) as EscProdutoRow[];
  }

  private async loadMovimentacoes(): Promise<EscMovRow[]> {
    const limiar = new Date();
    limiar.setUTCDate(limiar.getUTCDate() - 365);
    const { data, error } = await this.supabase
      .from("estoque_movimentacoes")
      .select(
        "id, produto_id, tipo, quantidade, created_at, deleted_at, origem, tenant_id",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("created_at", limiar.toISOString())
      .order("created_at", { ascending: false })
      .limit(12000);

    if (error) throw new Error(error.message);
    return (data ?? []) as EscMovRow[];
  }

  private async loadOsItensReservados(): Promise<{
    ok: boolean;
    items: EscOsItemRow[];
  }> {
    try {
      const { data, error } = await this.supabase
        .from("ordem_servico_itens")
        .select(
          "produto_id, quantidade, estoque_status, peca_origem, ordem_servico_id",
        )
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .in("estoque_status", ["reservado", "separado"])
        .limit(4000);

      if (error) return { ok: false, items: [] };
      return { ok: true, items: (data ?? []) as EscOsItemRow[] };
    } catch {
      return { ok: false, items: [] };
    }
  }

  private async loadVendaItensRecentes(): Promise<EscVendaItemAgg[]> {
    const limiar = new Date();
    limiar.setUTCDate(limiar.getUTCDate() - 90);
    const de = limiar.toISOString().slice(0, 10);

    const { data: vendas, error } = await this.supabase
      .from("vendas")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("status", "faturado")
      .is("deleted_at", null)
      .gte("data_venda", de)
      .limit(800);

    if (error || !vendas?.length) return [];

    const ids = vendas.map((v) => v.id).slice(0, 400);
    const { data: itens } = await this.supabase
      .from("venda_itens")
      .select("produto_id, descricao, quantidade")
      .eq("tenant_id", this.tenantId)
      .in("venda_id", ids)
      .is("deleted_at", null)
      .limit(5000);

    return (itens ?? []).map((it) => ({
      produto_id: it.produto_id,
      descricao: it.descricao || "Item",
      quantidade: Number(it.quantidade ?? 0),
    }));
  }

  private async loadFornecedoresAtivosCount(): Promise<number | null> {
    try {
      const { count, error } = await this.supabase
        .from("fornecedores")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .eq("ativo", true)
        .is("deleted_at", null);

      if (error) return null;
      return count ?? 0;
    } catch {
      return null;
    }
  }
}

export async function createExecutiveStockService(tenantId: string) {
  const supabase = await createClient();
  return new ExecutiveStockService(supabase, tenantId);
}
