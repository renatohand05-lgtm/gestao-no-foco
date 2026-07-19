import { SectionCard } from "@/components/ui/section-card";
import { dsElevation } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  action?: React.ReactNode;
};

export function DashboardSection({
  title,
  description,
  children,
  className,
  contentClassName,
  action,
}: DashboardSectionProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      className={cn(dsElevation.section, className)}
      contentClassName={contentClassName}
    >
      {action ? (
        <div className="mb-4 flex justify-end">{action}</div>
      ) : null}
      {children}
    </SectionCard>
  );
}
