/**
 * Sprint 30.3 — Checklist de implantação (config).
 * Progresso é calculado; itens não forçam inserts.
 */

export type ImplantationItemId =
  | "empresa_criada"
  | "usuarios"
  | "equipe"
  | "produtos"
  | "servicos"
  | "clientes"
  | "financeiro"
  | "contas_bancarias"
  | "centro_custo"
  | "metas"
  | "primeira_venda"
  | "primeiro_relatorio"
  | "primeiro_dre";

export type ImplantationChecklistItem = {
  id: ImplantationItemId;
  title: string;
  description: string;
  hrefSuffix: string;
  /** Se true, conta para o núcleo mínimo de implantação */
  core: boolean;
};

export const IMPLANTATION_CHECKLIST: readonly ImplantationChecklistItem[] = [
  {
    id: "empresa_criada",
    title: "Empresa criada",
    description: "Tenant ativo com nome e segmento.",
    hrefSuffix: "/configuracoes",
    core: true,
  },
  {
    id: "usuarios",
    title: "Usuários",
    description: "Convide colaboradores quando estiver pronto.",
    hrefSuffix: "/configuracoes/equipe?tab=convites",
    core: false,
  },
  {
    id: "equipe",
    title: "Equipe",
    description: "Organize equipes, cargos e papéis.",
    hrefSuffix: "/configuracoes/equipe",
    core: false,
  },
  {
    id: "produtos",
    title: "Produtos",
    description: "Cadastre o catálogo de produtos.",
    hrefSuffix: "/produtos",
    core: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Cadastre serviços do seu segmento.",
    hrefSuffix: "/produtos/servicos",
    core: false,
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Inicie a base comercial.",
    hrefSuffix: "/clientes",
    core: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Estruture categorias e rotinas.",
    hrefSuffix: "/financeiro",
    core: true,
  },
  {
    id: "contas_bancarias",
    title: "Contas bancárias",
    description: "Pelo menos uma conta para leitura financeira.",
    hrefSuffix: "/financeiro/contas-bancarias/novo",
    core: true,
  },
  {
    id: "centro_custo",
    title: "Centro de custo",
    description: "Organize custos por área.",
    hrefSuffix: "/financeiro/centros-custo",
    core: false,
  },
  {
    id: "metas",
    title: "Metas",
    description: "Defina a meta mensal.",
    hrefSuffix: "/configuracoes/metas/nova",
    core: false,
  },
  {
    id: "primeira_venda",
    title: "Primeira venda / OS",
    description: "Registre a primeira operação.",
    hrefSuffix: "/vendas/nova",
    core: true,
  },
  {
    id: "primeiro_relatorio",
    title: "Primeiro relatório",
    description: "Explore relatórios executivos.",
    hrefSuffix: "/relatorios",
    core: false,
  },
  {
    id: "primeiro_dre",
    title: "Primeiro DRE",
    description: "Leitura do resultado (quando houver movimentos).",
    hrefSuffix: "/financeiro/dre",
    core: false,
  },
] as const;

export function implantationProgressPct(completedIds: readonly string[]): number {
  if (IMPLANTATION_CHECKLIST.length === 0) return 0;
  const done = IMPLANTATION_CHECKLIST.filter((i) =>
    completedIds.includes(i.id),
  ).length;
  return Math.round((done / IMPLANTATION_CHECKLIST.length) * 100);
}
