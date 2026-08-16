import { Plus, Library } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type ProdutoEmptyStateProps = {
  tenantSlug: string;
  hasSearch: boolean;
  hasFilters: boolean;
};

export function ProdutoEmptyState({
  tenantSlug,
  hasSearch,
  hasFilters,
}: ProdutoEmptyStateProps) {
  const filtered = hasSearch || hasFilters;
  const catalogHref = `/${tenantSlug}/produtos/catalogo-inicial`;
  const createHref = `/${tenantSlug}/produtos/novo`;

  return (
    <EmptyState
      icon={Library}
      title={filtered ? "Nenhum item encontrado" : "Monte seu catálogo inicial"}
      description={
        filtered
          ? "Tente ajustar a busca ou os filtros, ou cadastre um novo item."
          : "Selecionamos serviços comuns para o seu tipo de negócio. Escolha os que sua empresa oferece. Você poderá editar e adicionar outros depois."
      }
      impact={
        filtered
          ? undefined
          : "Itens do catálogo alimentam vendas e o fluxo operacional."
      }
      action={
        filtered
          ? {
              label: "Novo item",
              href: createHref,
              icon: Plus,
            }
          : {
              label: "Montar catálogo inicial",
              href: catalogHref,
              icon: Library,
            }
      }
      secondaryAction={
        filtered
          ? undefined
          : {
              label: "Criar do zero",
              href: createHref,
              icon: Plus,
            }
      }
    />
  );
}
