import { Plus, Package } from "lucide-react";

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

  return (
    <EmptyState
      icon={Package}
      title={filtered ? "Nenhum item encontrado" : "Nenhum item cadastrado"}
      description={
        filtered
          ? "Tente ajustar a busca ou os filtros, ou cadastre um novo item."
          : "Cadastre produtos ou serviços para acelerar a primeira venda."
      }
      impact={
        filtered
          ? undefined
          : "Itens do catálogo alimentam vendas e rankings de produtos."
      }
      action={{
        label: "Novo item",
        href: `/${tenantSlug}/produtos/novo`,
        icon: Plus,
      }}
    />
  );
}
