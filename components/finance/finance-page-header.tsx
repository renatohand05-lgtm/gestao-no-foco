import { FinanceNavigation } from "@/components/finance/finance-navigation";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName?: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
};

/**
 * Cabeçalho padronizado das páginas Financeiro Enterprise (Sprint 22.3).
 */
export function FinancePageHeader({
  tenantSlug,
  tenantName,
  title,
  description,
  breadcrumbs,
  actions,
  showNavigation = true,
  className,
}: Props) {
  const crumbs: BreadcrumbItem[] = breadcrumbs?.length
    ? breadcrumbs
    : [
        { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
        { label: title },
      ];

  return (
    <header
      data-finance-page-header
      className={cn("space-y-4", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Breadcrumbs items={crumbs} />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={cn(gofTypography.title, "text-2xl tracking-tight")}>
              {title}
            </h1>
            {tenantName ? (
              <Badge variant="secondary" className="font-normal">
                {tenantName}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className={cn(gofTypography.caption, "max-w-2xl text-sm")}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {showNavigation ? <FinanceNavigation tenantSlug={tenantSlug} /> : null}
    </header>
  );
}
