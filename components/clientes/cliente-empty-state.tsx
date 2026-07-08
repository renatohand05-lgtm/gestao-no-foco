import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type ClienteEmptyStateProps = {
  tenantSlug: string;
  hasSearch: boolean;
};

export function ClienteEmptyState({
  tenantSlug,
  hasSearch,
}: ClienteEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title={hasSearch ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
      description={
        hasSearch
          ? "Tente outro termo de busca ou cadastre um novo cliente."
          : "Comece cadastrando seu primeiro cliente para organizar vendas e atendimentos."
      }
      action={{
        label: "Novo cliente",
        href: `/${tenantSlug}/clientes/novo`,
        icon: Plus,
      }}
    />
  );
}
