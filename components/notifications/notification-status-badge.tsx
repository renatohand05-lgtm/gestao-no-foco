"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { NotificationStatusId } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Props = {
  status: NotificationStatusId | string;
  className?: string;
};

function tone(
  status: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "sent":
    case "delivered":
    case "read":
      return "success";
    case "queued":
    case "scheduled":
    case "processing":
    case "created":
      return "info";
    case "suppressed":
    case "deduplicated":
    case "expired":
      return "warning";
    case "failed":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function NotificationStatusBadge({ status, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(status)} variant="soft" className={cn(className)}>
      <span className="truncate">{status}</span>
    </ExecutiveBadge>
  );
}
