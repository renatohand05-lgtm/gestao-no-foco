"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { EnterpriseHealthStatus } from "@/lib/enterprise";
import { cn } from "@/lib/utils";

type Props = {
  status: EnterpriseHealthStatus | string;
  className?: string;
};

function tone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    case "unhealthy":
      return "danger";
    default:
      return "neutral";
  }
}

export function EnterpriseHealthBadge({ status, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(status)} variant="soft" className={cn(className)}>
      <span className="capitalize">{status}</span>
    </ExecutiveBadge>
  );
}
