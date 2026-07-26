"use client";

import { ExecutiveBadge } from "@/components/executive";
import { getAuditSeverity, isKnownAuditSeverity } from "@/lib/audit";
import { cn } from "@/lib/utils";

type Props = {
  severity: string;
  className?: string;
};

function toneFor(severity: string): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (severity) {
    case "Trace":
      return "neutral";
    case "Info":
      return "info";
    case "Success":
      return "success";
    case "Warning":
      return "warning";
    case "Error":
    case "Critical":
      return "danger";
    default:
      return "neutral";
  }
}

export function AuditSeverityBadge({ severity, className }: Props) {
  const meta = isKnownAuditSeverity(severity)
    ? getAuditSeverity(severity)
    : undefined;

  return (
    <ExecutiveBadge
      tone={toneFor(severity)}
      variant="soft"
      className={cn("max-w-full", className)}
    >
      <span className="truncate">{meta?.label ?? severity}</span>
    </ExecutiveBadge>
  );
}
