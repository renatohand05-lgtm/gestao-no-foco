"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { NotificationPriorityId } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Props = {
  priority: NotificationPriorityId | string;
  className?: string;
};

function tone(
  priority: string,
): "neutral" | "info" | "warning" | "danger" | "success" {
  switch (priority) {
    case "critical":
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "normal":
      return "info";
    default:
      return "neutral";
  }
}

export function NotificationPriorityBadge({ priority, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(priority)} variant="soft" className={cn(className)}>
      <span className="truncate capitalize">{priority}</span>
    </ExecutiveBadge>
  );
}
