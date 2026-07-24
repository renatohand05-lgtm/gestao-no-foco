import type { LucideIcon } from "lucide-react";

import { ExecutiveEmptyState } from "@/components/executive";

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
  const desc = filtered
    ? "Tente ajustar a busca ou os filtros, ou cadastre um novo registro."
    : [description, impact].filter(Boolean).join(" ");

  return (
    <ExecutiveEmptyState
      icon={icon}
      title={filtered ? "Nenhum registro encontrado" : title}
      description={desc}
      action={
        createLabel
          ? {
              label: createLabel,
              href: createHref ?? `/${tenantSlug}/financeiro/${basePath}/novo`,
            }
          : undefined
      }
    />
  );
}
