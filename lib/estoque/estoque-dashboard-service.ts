import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EstoqueDashboardData = {
  kpis: {
    quantidadeProdutos: number;
    valorTotal: number;
    abaixoMinimo: number;
    zerados: number;
    semCusto: number;
    semGiro: number;
    entradasPeriodo: number;
    saidasPeriodo: number;
    margemPotencial: number;
  };
  porCategoria: { label: string; valor: number }[];
  alertas: { tipo: string; titulo: string; href?: string }[];
  topVendidos: { label: string; valor: number }[];
  syncedAt: string;
};

export class EstoqueDashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(opts?: {
    de?: string;
    ate?: string;
    tenantSlug?: string;
  }): Promise<EstoqueDashboardData> {
    const hoje = new Date().toISOString().slice(0, 10);
    const de =
      opts?.de ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);
    const ate = opts?.ate ?? hoje;
    const slug = opts?.tenantSlug ?? "";

    const { data: produtos, error } = await this.supabase
      .from("produtos")
      .select(
        "id, nome, categoria, estoque_atual, estoque_minimo, custo, preco_venda, tipo",
      )
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null)
      .neq("tipo", "servico")
      .limit(2000);

    if (error) throw new Error(error.message);

    let abaixoMinimo = 0;
    let zerados = 0;
    let semCusto = 0;
    let valorTotal = 0;
    let margemPotencial = 0;
    const catMap = new Map<string, number>();
    const alertas: EstoqueDashboardData["alertas"] = [];
    const produtoIds: string[] = [];

    for (const p of produtos ?? []) {
      produtoIds.push(p.id);
      const est = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      const custo = Number(p.custo ?? 0);
      const preco = Number(p.preco_venda ?? 0);
      valorTotal += est * (custo > 0 ? custo : preco);
      margemPotencial += est * Math.max(0, preco - custo);
      if (est <= 0) {
        zerados += 1;
        alertas.push({
          tipo: "zerado",
          titulo: `${p.nome} sem estoque`,
          href: slug ? `/${slug}/produtos/${p.id}` : undefined,
        });
      } else if (min > 0 && est <= min) {
        abaixoMinimo += 1;
        alertas.push({
          tipo: "critico",
          titulo: `${p.nome} abaixo do mínimo`,
          href: slug ? `/${slug}/produtos/${p.id}` : undefined,
        });
      }
      if (custo <= 0) {
        semCusto += 1;
        alertas.push({
          tipo: "sem_custo",
          titulo: `${p.nome} sem custo cadastrado`,
          href: slug ? `/${slug}/produtos/${p.id}` : undefined,
        });
      }
      const cat = p.categoria || "Sem categoria";
      catMap.set(cat, (catMap.get(cat) ?? 0) + est * (custo || preco));
    }

    const limiar = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: movs } = await this.supabase
      .from("estoque_movimentacoes")
      .select("produto_id, tipo, quantidade, created_at")
      .eq("tenant_id", this.tenantId)
      .gte("created_at", `${de}T00:00:00`)
      .lte("created_at", `${ate}T23:59:59`)
      .limit(5000);

    let entradasPeriodo = 0;
    let saidasPeriodo = 0;
    for (const m of movs ?? []) {
      const q = Number(m.quantidade ?? 0);
      if (m.tipo === "entrada") entradasPeriodo += q;
      if (m.tipo === "saida") saidasPeriodo += q;
    }

    const { data: mov90 } = await this.supabase
      .from("estoque_movimentacoes")
      .select("produto_id")
      .eq("tenant_id", this.tenantId)
      .gte("created_at", `${limiar}T00:00:00`)
      .limit(8000);
    const comGiro = new Set((mov90 ?? []).map((m) => m.produto_id));
    const semGiro = produtoIds.filter((id) => !comGiro.has(id)).length;

    // Top vendidos via venda_itens no período
    const { data: vendas } = await this.supabase
      .from("vendas")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("status", "faturado")
      .is("deleted_at", null)
      .gte("data_venda", de)
      .lte("data_venda", ate)
      .limit(500);
    const vendaIds = (vendas ?? []).map((v) => v.id);
    const prodQty = new Map<string, number>();
    if (vendaIds.length) {
      const { data: itens } = await this.supabase
        .from("venda_itens")
        .select("produto_id, descricao, quantidade")
        .eq("tenant_id", this.tenantId)
        .in("venda_id", vendaIds.slice(0, 300))
        .is("deleted_at", null);
      for (const it of itens ?? []) {
        const key = String(it.descricao || it.produto_id || "item");
        prodQty.set(key, (prodQty.get(key) ?? 0) + Number(it.quantidade));
      }
    }

    return {
      kpis: {
        quantidadeProdutos: (produtos ?? []).length,
        valorTotal: Number(valorTotal.toFixed(2)),
        abaixoMinimo,
        zerados,
        semCusto,
        semGiro,
        entradasPeriodo: Number(entradasPeriodo.toFixed(2)),
        saidasPeriodo: Number(saidasPeriodo.toFixed(2)),
        margemPotencial: Number(margemPotencial.toFixed(2)),
      },
      porCategoria: [...catMap.entries()]
        .map(([label, valor]) => ({ label, valor: Number(valor.toFixed(2)) }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 12),
      alertas: alertas.slice(0, 30),
      topVendidos: [...prodQty.entries()]
        .map(([label, valor]) => ({ label: label.slice(0, 40), valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 12),
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function createEstoqueDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new EstoqueDashboardService(supabase, tenantId);
}
