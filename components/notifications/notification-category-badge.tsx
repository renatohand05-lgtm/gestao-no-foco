"use client";

import { ExecutiveBadge } from "@/components/executive";
import { cn } from "@/lib/utils";

type Props = {
  category: string;
  className?: string;
};

export function NotificationCategoryBadge({ category, className }: Props) {
  return (
    <ExecutiveBadge tone="neutral" variant="outline" className={cn(className)}>
      <span className="truncate">{category.replaceAll("_", " ")}</span>
    </ExecutiveBadge>
  );
}
