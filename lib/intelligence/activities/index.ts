import type { SupabaseClient } from "@supabase/supabase-js";

import { INTELLIGENCE_THRESHOLDS } from "@/lib/intelligence/alerts/thresholds";
import type { Database } from "@/types/database";
import type { ActivityItem } from "@/types/intelligence";

function sortByDateDesc(items: ActivityItem[]) {
  return items.sort((a, b) => {
    if (a.occurredAt === b.occurredAt) return a.title.localeCompare(b.title, "pt-BR");
    return a.occurredAt < b.occurredAt ? 1 : -1;
  });
}

export async function buildRecentActivities(params: {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  limit?: number;
}): Promise<ActivityItem[]> {
  const { supabase, tenantId, tenantSlug } = params;
  const limit = params.limit ?? INTELLIGENCE_THRESHOLDS.activitiesLimit;
  const base = `/${tenantSlug}`;
  const perSource = Math.max(5, Math.ceil(limit / 2));

  const [
    vendas,
    recebimentos,
    pagamentos,
    clientes,
    produtos,
    estoque,
  ] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, numero, total, created_at, data_venda, cliente:clientes(nome)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("contas_receber")
      .select("id, descricao, valor_recebido, data_recebimento, numero")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .eq("status", "recebido")
      .not("data_recebimento", "is", null)
      .order("data_recebimento", { ascending: false })
      .limit(perSource),
    supabase
      .from("contas_pagar")
      .select("id, descricao, valor_pago, data_pagamento, numero")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["pago", "parcial"])
      .not("data_pagamento", "is", null)
      .order("data_pagamento", { ascending: false })
      .limit(perSource),
    supabase
      .from("clientes")
      .select("id, nome, created_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("produtos")
      .select("id, nome, created_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("estoque_movimentacoes")
      .select(
        "id, tipo, quantidade, created_at, produto:produtos(nome)",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(perSource),
  ]);

  if (vendas.error) throw new Error(vendas.error.message);
  if (recebimentos.error) throw new Error(recebimentos.error.message);
  if (pagamentos.error) throw new Error(pagamentos.error.message);
  if (clientes.error) throw new Error(clientes.error.message);
  if (produtos.error) throw new Error(produtos.error.message);
  if (estoque.error) throw new Error(estoque.error.message);

  const items: ActivityItem[] = [];

  for (const row of vendas.data ?? []) {
    const cliente = row.cliente as { nome: string } | null;
    items.push({
      id: `venda-${row.id}`,
      kind: "venda_faturada",
      title: `Venda #${row.numero} faturada`,
      description: `${cliente?.nome ?? "Cliente"} · R$ ${Number(row.total).toFixed(2)}`,
      occurredAt: row.created_at,
      href: `${base}/vendas/${row.id}`,
    });
  }

  for (const row of recebimentos.data ?? []) {
    items.push({
      id: `cr-${row.id}`,
      kind: "recebimento",
      title: `Recebimento · título #${row.numero}`,
      description: `${row.descricao} · R$ ${Number(row.valor_recebido).toFixed(2)}`,
      occurredAt: `${row.data_recebimento}T12:00:00.000Z`,
      href: `${base}/financeiro/contas-receber/${row.id}`,
    });
  }

  for (const row of pagamentos.data ?? []) {
    items.push({
      id: `cp-${row.id}`,
      kind: "pagamento",
      title: `Pagamento · título #${row.numero}`,
      description: `${row.descricao} · R$ ${Number(row.valor_pago).toFixed(2)}`,
      occurredAt: `${row.data_pagamento}T12:00:00.000Z`,
      href: `${base}/financeiro/contas-pagar/${row.id}`,
    });
  }

  for (const row of clientes.data ?? []) {
    items.push({
      id: `cliente-${row.id}`,
      kind: "cliente_cadastrado",
      title: "Cliente cadastrado",
      description: row.nome,
      occurredAt: row.created_at,
      href: `${base}/clientes/${row.id}`,
    });
  }

  for (const row of produtos.data ?? []) {
    items.push({
      id: `produto-${row.id}`,
      kind: "produto_cadastrado",
      title: "Produto cadastrado",
      description: row.nome,
      occurredAt: row.created_at,
      href: `${base}/produtos/${row.id}`,
    });
  }

  for (const row of estoque.data ?? []) {
    const produto = row.produto as { nome: string } | null;
    items.push({
      id: `estoque-${row.id}`,
      kind: "estoque_movimentacao",
      title: `Estoque · ${row.tipo}`,
      description: `${produto?.nome ?? "Produto"} · qtd ${Number(row.quantidade)}`,
      occurredAt: row.created_at,
      href: `${base}/estoque`,
    });
  }

  return sortByDateDesc(items).slice(0, limit);
}
