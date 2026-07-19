import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type FinanceiroEmptyStateProps = {
  tenantSlug: string;
  basePath: string;
  icon: LucideIcon;
  title: string;
  description: string;
  impact?: string;
  createLabel?: string;
  createHref?: string;
  hasSearch: boolean;
  hasFilters: boolean;
};

export function FinanceiroEmptyState({
  tenantSlug,
  basePath,
  icon,
  title,
  description,
  impact,
  createLabel,
  createHref,
  hasSearch,
  hasFilters,
}: FinanceiroEmptyStateProps) {
  const filtered = hasSearch || hasFilters;

  return (
    <EmptyState
      icon={icon}
      title={filtered ? "Nenhum registro encontrado" : title}
      description={
        filtered
          ? "Tente ajustar a busca ou os filtros, ou cadastre um novo registro."
          : description
      }
      impact={filtered ? undefined : impact}
      action={
        createLabel
          ? {
              label: createLabel,
              href: createHref ?? `/${tenantSlug}/financeiro/${basePath}/novo`,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}
