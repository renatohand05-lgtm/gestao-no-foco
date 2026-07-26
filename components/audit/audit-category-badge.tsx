"use client";

import { ExecutiveBadge } from "@/components/executive";
import { getAuditCategory, isKnownAuditCategory } from "@/lib/audit";
import { cn } from "@/lib/utils";

type Props = {
  category: string;
  className?: string;
};

export function AuditCategoryBadge({ category, className }: Props) {
  const meta = isKnownAuditCategory(category)
    ? getAuditCategory(category)
    : undefined;

  return (
    <ExecutiveBadge
      tone="neutral"
      variant="outline"
      className={cn("max-w-full", className)}
    >
      <span className="truncate">{meta?.label ?? category}</span>
    </ExecutiveBadge>
  );
}
