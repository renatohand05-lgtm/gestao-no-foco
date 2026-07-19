import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ChecklistItem, ChecklistResult } from "@/types/intelligence";

async function countTenantRows(
  supabase: SupabaseClient<Database>,
  table:
    | "contas_bancarias"
    | "categorias_financeiras"
    | "plano_contas"
    | "produtos"
    | "clientes"
    | "vendas"
    | "contas_pagar",
  tenantId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function buildImplementationChecklist(params: {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: string | null;
}): Promise<ChecklistResult> {
  const { supabase, tenantId, tenantSlug, tenantName, segment } = params;
  const base = `/${tenantSlug}`;

  const [
    contasBancarias,
    categorias,
    planoContas,
    produtos,
    clientes,
    vendas,
    compras,
    usuariosResult,
  ] = await Promise.all([
    countTenantRows(supabase, "contas_bancarias", tenantId),
    countTenantRows(supabase, "categorias_financeiras", tenantId),
    countTenantRows(supabase, "plano_contas", tenantId),
    countTenantRows(supabase, "produtos", tenantId),
    countTenantRows(supabase, "clientes", tenantId),
    countTenantRows(supabase, "vendas", tenantId),
    countTenantRows(supabase, "contas_pagar", tenantId),
    supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  if (usuariosResult.error) throw new Error(usuariosResult.error.message);
  const usuarios = usuariosResult.count ?? 0;

  const items: ChecklistItem[] = [
    {
      id: "empresa",
      title: "Empresa",
      description: tenantName
        ? `Tenant ${tenantName} ativo`
        : "Cadastre os dados da empresa",
      completed: Boolean(tenantName?.trim()),
      href: `${base}/configuracoes`,
    },
    {
      id: "contas_bancarias",
      title: "Contas bancárias",
      description: "Pelo menos uma conta bancária cadastrada",
      completed: contasBancarias > 0,
      href: `${base}/financeiro/contas-bancarias`,
    },
    {
      id: "categorias",
      title: "Categorias financeiras",
      description: "Classificação gerencial de receitas e despesas",
      completed: categorias > 0,
      href: `${base}/financeiro/categorias`,
    },
    {
      id: "plano_contas",
      title: "Plano de contas",
      description: "Estrutura contábil básica configurada",
      completed: planoContas > 0,
      href: `${base}/financeiro/plano-contas`,
    },
    {
      id: "produtos",
      title: "Produtos e serviços",
      description: "Catálogo com ao menos um item",
      completed: produtos > 0,
      href: `${base}/produtos`,
    },
    {
      id: "clientes",
      title: "Clientes",
      description: "Base de clientes iniciada",
      completed: clientes > 0,
      href: `${base}/clientes`,
    },
    {
      id: "vendas",
      title: "Vendas",
      description: "Ao menos uma venda registrada",
      completed: vendas > 0,
      href: `${base}/vendas`,
    },
    {
      id: "compras",
      title: "Compras / contas a pagar",
      description: "Ao menos um título a pagar cadastrado",
      completed: compras > 0,
      href: `${base}/financeiro/contas-pagar`,
    },
    {
      id: "usuarios",
      title: "Usuários",
      description: "Equipe com membros no tenant",
      completed: usuarios > 0,
      href: `${base}/configuracoes`,
    },
    {
      id: "configuracoes",
      title: "Configurações essenciais",
      description: "Segmento definido e conta bancária ativa",
      completed: Boolean(segment) && contasBancarias > 0,
      href: `${base}/configuracoes`,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    progressPct:
      totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}
