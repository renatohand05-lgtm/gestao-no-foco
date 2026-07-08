import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type ModuleHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
  className?: string;
};

export function ModuleHeader({
  title,
  description,
  breadcrumbs,
  children,
  className,
}: ModuleHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <PageHeader title={title} description={description}>
        {children}
      </PageHeader>
    </div>
  );
}
