import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

type DashboardHeaderProps = {
  greeting: string;
  subtitle: string;
  periodLabel: string;
};

export function DashboardHeader({
  greeting,
  subtitle,
  periodLabel,
}: DashboardHeaderProps) {
  return (
    <PageHeader
      title={greeting}
      description={subtitle}
    >
      <Badge
        variant="secondary"
        className="w-fit gap-1.5 px-3 py-1.5 text-xs font-normal capitalize"
      >
        <CalendarDays className="size-3.5" />
        {periodLabel}
      </Badge>
    </PageHeader>
  );
}
