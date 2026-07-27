"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { OutboxStatus } from "@/lib/enterprise";
import { cn } from "@/lib/utils";

type Props = {
  status: OutboxStatus | string;
  className?: string;
};

function tone(
  status: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
    case "processing":
      return "info";
    case "failed":
      return "warning";
    case "dead":
      return "danger";
    default:
      return "neutral";
  }
}

export function OutboxStatusBadge({ status, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(status)} variant="soft" className={cn(className)}>
      <span className="capitalize">{status}</span>
    </ExecutiveBadge>
  );
}
