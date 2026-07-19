import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  OnboardingChecklistItem,
  OnboardingChecklistResult,
} from "@/lib/onboarding/onboarding-types";

async function countRows(
  supabase: SupabaseClient<Database>,
  table:
    | "contas_bancarias"
    | "clientes"
    | "produtos"
    | "vendas"
    | "metas_vendas_mensais",
  tenantId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) {
    // Metas ou tabelas ausentes não devem quebrar o primeiro acesso
    console.error(`[onboarding-checklist] ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Checklist de primeiro valor — validação só com dados reais.
 * Não altera o motor de inteligência legado.
 */
export async function buildFirstValueChecklist(params: {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: string | null;
}): Promise<OnboardingChecklistResult> {
  const { supabase, tenantId, tenantSlug, tenantName, segment } = params;
  const base = `/${tenantSlug}`;

  const [contas, clientes, produtos, vendas, metas] = await Promise.all([
    countRows(supabase, "contas_bancarias", tenantId),
    countRows(supabase, "clientes", tenantId),
    countRows(supabase, "produtos", tenantId),
    countRows(supabase, "vendas", tenantId),
    countRows(supabase, "metas_vendas_mensais", tenantId),
  ]);

  const items: OnboardingChecklistItem[] = [
    {
      id: "empresa",
      title: "Dados da empresa",
      description: "Empresa ativa no tenant.",
      benefit: "Identidade do painel e isolamento dos dados.",
      required: true,
      completed: Boolean(tenantName?.trim()),
      href: `${base}/configuracoes`,
      ctaLabel: "Revisar empresa",
    },
    {
      id: "segmento",
      title: "Segmento do negócio",
      description: "Define textos e prioridades do checklist.",
      benefit: "Experiência alinhada ao seu tipo de operação.",
      required: true,
      completed: Boolean(segment),
      href: `${base}/configuracoes`,
      ctaLabel: "Ver segmento",
    },
    {
      id: "conta_bancaria",
      title: "Conta bancária",
      description: "Pelo menos uma conta cadastrada.",
      benefit: "Habilita leitura financeira do Dashboard.",
      required: false,
      completed: contas > 0,
      href: `${base}/financeiro/contas-bancarias/novo`,
      ctaLabel: "Cadastrar conta",
    },
    {
      id: "meta_mensal",
      title: "Meta mensal",
      description: "Meta de vendas do período.",
      benefit: "Ativa Score, gap e projeção.",
      required: false,
      completed: metas > 0,
      href: `${base}/configuracoes/metas/nova`,
      ctaLabel: "Criar meta",
    },
    {
      id: "cliente",
      title: "Primeiro cliente",
      description: "Base comercial iniciada.",
      benefit: "Necessário para contextualizar vendas.",
      required: false,
      completed: clientes > 0,
      href: `${base}/clientes/novo`,
      ctaLabel: "Novo cliente",
    },
    {
      id: "produto",
      title: "Produto ou serviço",
      description: "Ao menos um item no catálogo.",
      benefit: "Acelera o registro da primeira venda.",
      required: false,
      completed: produtos > 0,
      href: `${base}/produtos/novo`,
      ctaLabel: "Novo item",
    },
    {
      id: "venda",
      title: "Primeira venda",
      description: "Pelo menos uma venda registrada.",
      benefit: "Primeiro movimento real no Dashboard.",
      required: false,
      completed: vendas > 0,
      href: `${base}/vendas/nova`,
      ctaLabel: "Registrar venda",
    },
    {
      id: "dashboard",
      title: "Dashboard ativado",
      description: "Meta ou venda já liberam o cockpit.",
      benefit: "Visão executiva com dados reais.",
      required: true,
      completed: metas > 0 || vendas > 0,
      href: `${base}/dashboard`,
      ctaLabel: "Abrir Dashboard",
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const required = items.filter((i) => i.required);
  const requiredCompleted = required.filter((i) => i.completed).length;
  const nextItem = items.find((i) => !i.completed) ?? null;
  const firstValueUnlocked = metas > 0 || vendas > 0;
  const dashboardReady =
    Boolean(tenantName?.trim()) && Boolean(segment) && firstValueUnlocked;

  return {
    items,
    completedCount,
    totalCount,
    requiredCompleted,
    requiredTotal: required.length,
    progressPct:
      totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    nextItem,
    firstValueUnlocked,
    dashboardReady,
  };
}
