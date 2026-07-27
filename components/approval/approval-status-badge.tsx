"use client";

import { ExecutiveBadge } from "@/components/executive";
import type { ApprovalRequestStatus } from "@/lib/approval";
import { cn } from "@/lib/utils";

type Props = {
  status: ApprovalRequestStatus | string;
  className?: string;
};

function tone(
  status: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "approved":
    case "completed":
      return "success";
    case "pending":
    case "waiting":
    case "requested":
    case "partially_approved":
      return "info";
    case "returned":
    case "expired":
      return "warning";
    case "rejected":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function ApprovalStatusBadge({ status, className }: Props) {
  return (
    <ExecutiveBadge tone={tone(status)} variant="soft" className={cn(className)}>
      <span className="truncate">{status.replaceAll("_", " ")}</span>
    </ExecutiveBadge>
  );
}
