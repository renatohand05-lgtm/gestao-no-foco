import { Plus, ShoppingCart } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type VendaEmptyStateProps = {
  tenantSlug: string;
  hasSearch: boolean;
  hasFilters: boolean;
};

export function VendaEmptyState({
  tenantSlug,
  hasSearch,
  hasFilters,
}: VendaEmptyStateProps) {
  const filtered = hasSearch || hasFilters;

  return (
    <EmptyState
      icon={ShoppingCart}
      title={filtered ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
      description={
        filtered
          ? "Tente ajustar a busca ou os filtros, ou registre uma nova venda."
          : "Registre a primeira venda para ver movimento real no Dashboard Executivo."
      }
      impact={
        filtered
          ? undefined
          : "Sem vendas, faturamento, Score e projeções ficam sem base."
      }
      action={{
        label: "Nova venda",
        href: `/${tenantSlug}/vendas/nova`,
        icon: Plus,
      }}
    />
  );
}
