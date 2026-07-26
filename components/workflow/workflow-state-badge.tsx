"use client";

import { ExecutiveBadge } from "@/components/executive";
import { cn } from "@/lib/utils";

type Props = {
  stateId: string;
  stateName?: string;
  className?: string;
};

export function WorkflowStateBadge({
  stateId,
  stateName,
  className,
}: Props) {
  return (
    <ExecutiveBadge tone="neutral" variant="outline" className={cn(className)}>
      <span className="truncate">{stateName ?? stateId}</span>
    </ExecutiveBadge>
  );
}
