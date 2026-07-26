"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { WorkflowStatus } from "@/lib/workflow";
import { cn } from "@/lib/utils";

type Props = {
  status: WorkflowStatus | string;
  className?: string;
};

function tone(
  status: string,
): "neutral" | "info" | "success" | "warning" | "danger" | "primary" {
  switch (status) {
    case "active":
      return "info";
    case "completed":
      return "success";
    case "paused":
    case "draft":
      return "neutral";
    case "blocked":
      return "warning";
    case "cancelled":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function WorkflowStatusBadge({ status, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(status)} variant="soft" className={cn(className)}>
      <span className="truncate capitalize">{status}</span>
    </ExecutiveBadge>
  );
}
