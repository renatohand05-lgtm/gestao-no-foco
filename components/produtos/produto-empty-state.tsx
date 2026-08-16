import { Plus, Library } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type ProdutoEmptyStateProps = {
  tenantSlug: string;
  hasSearch: boolean;
  hasFilters: boolean;
  hasLibrary?: boolean;
  title?: string;
  description?: string;
};

export function ProdutoEmptyState({
  tenantSlug,
  hasSearch,
  hasFilters,
  hasLibrary = true,
  title,
  description,
}: ProdutoEmptyStateProps) {
  const filtered = hasSearch || hasFilters;
  const catalogHref = `/${tenantSlug}/produtos/catalogo-inicial`;
  const createHref = `/${tenantSlug}/produtos/novo`;
  const showLibrary = !filtered && hasLibrary;

  return (
    <EmptyState
      icon={Library}
      title={
        filtered
          ? "Nenhum item encontrado"
          : (title ?? "Monte seu catálogo inicial")
      }
      description={
        filtered
          ? "Tente ajustar a busca ou os filtros, ou cadastre um novo item."
          : (description ??
            "Selecionamos serviços comuns para o seu tipo de negócio. Escolha os que sua empresa oferece e personalize preços e duração.")
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
          : showLibrary
            ? {
                label: "Montar catálogo inicial",
                href: catalogHref,
                icon: Library,
              }
            : {
                label: "Criar serviço do zero",
                href: createHref,
                icon: Plus,
              }
      }
      secondaryAction={
        filtered || !showLibrary
          ? undefined
          : {
              label: "Criar serviço do zero",
              href: createHref,
              icon: Plus,
            }
      }
    />
  );
}
