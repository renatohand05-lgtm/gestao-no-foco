"use client";

import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

/** Wrapper Brand EmptyState — Sprint 29.3. */
export function EnterpriseEmptyState({
  title = "Sem dados Enterprise",
  description = "Nenhum evento ou métrica disponível.",
  className,
}: Props) {
  return (
    <div data-enterprise-state="empty" className={cn(className)}>
      <EmptyState
        icon={Building2}
        title={title}
        description={description}
        className="border-0 bg-transparent py-10 shadow-none"
      />
    </div>
  );
}
