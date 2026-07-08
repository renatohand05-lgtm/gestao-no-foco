import { Plus, Warehouse } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type EstoqueEmptyStateProps = {
  tenantSlug: string;
  hasFilters: boolean;
};

export function EstoqueEmptyState({
  tenantSlug,
  hasFilters,
}: EstoqueEmptyStateProps) {
  return (
    <EmptyState
      icon={Warehouse}
      title={
        hasFilters
          ? "Nenhuma movimentação encontrada"
          : "Nenhuma movimentação registrada"
      }
      description={
        hasFilters
          ? "Tente ajustar a busca ou os filtros, ou registre uma nova movimentação."
          : "Registre entradas, saídas ou ajustes para começar o controle de estoque."
      }
      action={{
        label: "Nova movimentação",
        href: `/${tenantSlug}/estoque/nova-movimentacao`,
        icon: Plus,
      }}
    />
  );
}
