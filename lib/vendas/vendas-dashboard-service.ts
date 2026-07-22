import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type VendasDashboardFilters = {
  de?: string;
  ate?: string;
  preset?: string;
  vendedor_id?: string;
  forma?: string;
};

export type VendasDashboardKpis = {
  vendasDia: number;
  vendasMes: number;
  quantidade: number;
  ticketMedio: number;
  margemBruta: number;
  custoProdutos: number;
  lucroBruto: number;
  descontos: number;
  canceladas: number;
  devolucoes: number;
  comCliente: number;
  consumidorNI: number;
  itensVendidos: number;
  clientesUnicos: number;
};

export type VendasDashboardData = {
  kpis: VendasDashboardKpis;
  porDia: { label: string; valor: number }[];
  porHora: { label: string; valor: number }[];
  porForma: { label: string; valor: number }[];
  topProdutos: { label: string; valor: number; qtd: number; margem: number }[];
  topCategorias: { label: string; valor: number; qtd: number }[];
  topVendedores: { label: string; valor: number }[];
  topClientes: { label: string; valor: number }[];
  descontosPorResponsavel: { label: string; valor: number }[];
};

function resolvePeriod(filters: VendasDashboardFilters) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (filters.de || filters.ate) {
    return { de: filters.de ?? hoje, ate: filters.ate ?? hoje, hoje };
  }
  const d = new Date();
  switch (filters.preset) {
    case "hoje":
      return { de: hoje, ate: hoje, hoje };
    case "ontem": {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      const ys = y.toISOString().slice(0, 10);
      return { de: ys, ate: ys, hoje };
    }
    case "semana": {
      const s = new Date(d);
      s.setDate(s.getDate() - 6);
      return { de: s.toISOString().slice(0, 10), ate: hoje, hoje };
    }
    default: {
      const m = new Date(d.getFullYear(), d.getMonth(), 1);
      return { de: m.toISOString().slice(0, 10), ate: hoje, hoje };
    }
  }
}

export class VendasDashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(
    filters: VendasDashboardFilters = {},
  ): Promise<VendasDashboardData> {
    const { de, ate, hoje } = resolvePeriod(filters);

    let query = this.supabase
      .from("vendas")
      .select(
        "id, data_venda, status, total, subtotal, desconto_total, margem_total, forma_pagamento, created_by, cliente_id, consumidor_nao_identificado, desconto_autorizado_por, created_at",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_venda", de)
      .lte("data_venda", ate);

    if (filters.vendedor_id) {
      query = query.eq("created_by", filters.vendedor_id);
    }

    const { data: vendas } = await query;

    let rows = (vendas ?? []) as Array<{
      id: string;
      data_venda: string;
      status: string;
      total: number;
      subtotal: number;
      desconto_total: number;
      margem_total: number | null;
      forma_pagamento: string | null;
      created_by: string | null;
      cliente_id: string | null;
      consumidor_nao_identificado: boolean | null;
      desconto_autorizado_por: string | null;
      created_at: string;
    }>;

    if (filters.forma) {
      rows = rows.filter(
        (v) =>
          (v.forma_pagamento || "").toLowerCase() ===
          filters.forma!.toLowerCase(),
      );
    }

    const faturadas = rows.filter((v) => v.status === "faturado");
    const canceladas = rows.filter((v) => v.status === "cancelado");
    const sum = (list: typeof faturadas) =>
      list.reduce((s, v) => s + Number(v.total), 0);

    const doDia = faturadas.filter((v) => v.data_venda === hoje);
    const vendasMes = sum(faturadas);
    const vendasDia = sum(doDia);
    const descontos = faturadas.reduce(
      (s, v) => s + Number(v.desconto_total ?? 0),
      0,
    );
    const margemBruta = faturadas.reduce(
      (s, v) => s + Number(v.margem_total ?? 0),
      0,
    );

    const ids = faturadas.map((v) => v.id);
    let custoProdutos = 0;
    let itensVendidos = 0;
    const topMap = new Map<
      string,
      { valor: number; qtd: number; margem: number }
    >();
    const catMap = new Map<string, { valor: number; qtd: number }>();

    if (ids.length) {
      const { data: itens } = await this.supabase
        .from("venda_itens")
        .select(
          "descricao, quantidade, total, custo_unitario, venda_id, produto_id",
        )
        .eq("tenant_id", this.tenantId)
        .in("venda_id", ids.slice(0, 800))
        .is("deleted_at", null);

      const produtoIds = [
        ...new Set(
          (itens ?? [])
            .map((i) => i.produto_id)
            .filter((x): x is string => Boolean(x)),
        ),
      ];
      const catByProd = new Map<string, string>();
      if (produtoIds.length) {
        const { data: prods } = await this.supabase
          .from("produtos")
          .select("id, categoria")
          .eq("tenant_id", this.tenantId)
          .in("id", produtoIds.slice(0, 500));
        for (const p of prods ?? []) {
          catByProd.set(p.id, p.categoria || "Sem categoria");
        }
      }

      for (const it of itens ?? []) {
        const qtd = Number(it.quantidade);
        const total = Number(it.total);
        const custo = Number(it.custo_unitario ?? 0) * qtd;
        custoProdutos += custo;
        itensVendidos += qtd;
        const cur = topMap.get(it.descricao) ?? {
          valor: 0,
          qtd: 0,
          margem: 0,
        };
        cur.valor += total;
        cur.qtd += qtd;
        cur.margem += total - custo;
        topMap.set(it.descricao, cur);

        const cat = it.produto_id
          ? catByProd.get(it.produto_id) ?? "Sem categoria"
          : "Avulso";
        const c = catMap.get(cat) ?? { valor: 0, qtd: 0 };
        c.valor += total;
        c.qtd += qtd;
        catMap.set(cat, c);
      }
    }

    const { count: devolucoes } = await this.supabase
      .from("venda_devolucoes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .gte("created_at", `${de}T00:00:00`);

    const porDiaMap = new Map<string, number>();
    const porHoraMap = new Map<string, number>();
    const porFormaMap = new Map<string, number>();
    const porVendMap = new Map<string, number>();
    const porCliMap = new Map<string, number>();
    const descRespMap = new Map<string, number>();

    for (const v of faturadas) {
      porDiaMap.set(
        v.data_venda,
        (porDiaMap.get(v.data_venda) ?? 0) + Number(v.total),
      );
      const hora = (v.created_at || "").slice(11, 13) || "00";
      porHoraMap.set(hora, (porHoraMap.get(hora) ?? 0) + Number(v.total));
      const forma = v.forma_pagamento || "não informado";
      porFormaMap.set(forma, (porFormaMap.get(forma) ?? 0) + Number(v.total));
      const vend = v.created_by || "sem_vendedor";
      porVendMap.set(vend, (porVendMap.get(vend) ?? 0) + Number(v.total));
      if (v.cliente_id && !v.consumidor_nao_identificado) {
        porCliMap.set(
          v.cliente_id,
          (porCliMap.get(v.cliente_id) ?? 0) + Number(v.total),
        );
      }
      if (Number(v.desconto_total) > 0) {
        const resp = v.desconto_autorizado_por || v.created_by || "sem_resp";
        descRespMap.set(
          resp,
          (descRespMap.get(resp) ?? 0) + Number(v.desconto_total),
        );
      }
    }

    const consumidorNI = faturadas.filter(
      (v) => v.consumidor_nao_identificado,
    ).length;

    const resolveNames = async (idsMap: Map<string, number>) => {
      const idsList = [...idsMap.keys()].filter(
        (id) => id !== "sem_vendedor" && id !== "sem_resp",
      );
      const nameById = new Map<string, string>();
      if (idsList.length) {
        const { data: profiles } = await this.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", idsList.slice(0, 50));
        for (const p of profiles ?? []) {
          nameById.set(p.id, p.full_name || p.id.slice(0, 8));
        }
      }
      return [...idsMap.entries()]
        .map(([id, valor]) => ({
          label: nameById.get(id) ?? id.slice(0, 12),
          valor,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
    };

    const resolveClientes = async (idsMap: Map<string, number>) => {
      const idsList = [...idsMap.keys()];
      if (!idsList.length) return [] as { label: string; valor: number }[];
      const { data: clientes } = await this.supabase
        .from("clientes")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .in("id", idsList.slice(0, 50));
      const nameById = new Map(
        (clientes ?? []).map((c) => [c.id, c.nome]),
      );
      return [...idsMap.entries()]
        .map(([id, valor]) => ({
          label: nameById.get(id) ?? id.slice(0, 8),
          valor,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
    };

    return {
      kpis: {
        vendasDia,
        vendasMes,
        quantidade: faturadas.length,
        ticketMedio:
          faturadas.length > 0
            ? Number((vendasMes / faturadas.length).toFixed(2))
            : 0,
        margemBruta,
        custoProdutos: Number(custoProdutos.toFixed(2)),
        lucroBruto: Number((vendasMes - custoProdutos).toFixed(2)),
        descontos: Number(descontos.toFixed(2)),
        canceladas: canceladas.length,
        devolucoes: devolucoes ?? 0,
        comCliente: Math.max(0, faturadas.length - consumidorNI),
        consumidorNI,
        itensVendidos,
        clientesUnicos: porCliMap.size,
      },
      porDia: [...porDiaMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      porHora: [...porHoraMap.entries()]
        .map(([label, valor]) => ({ label: `${label}h`, valor }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      porForma: [...porFormaMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor),
      topProdutos: [...topMap.entries()]
        .map(([label, v]) => ({
          label,
          valor: v.valor,
          qtd: v.qtd,
          margem: Number(v.margem.toFixed(2)),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      topCategorias: [...catMap.entries()]
        .map(([label, v]) => ({ label, valor: v.valor, qtd: v.qtd }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      topVendedores: await resolveNames(porVendMap),
      topClientes: await resolveClientes(porCliMap),
      descontosPorResponsavel: await resolveNames(descRespMap),
    };
  }
}

export async function createVendasDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new VendasDashboardService(supabase, tenantId);
}
