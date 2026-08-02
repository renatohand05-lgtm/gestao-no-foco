import Link from "next/link";

import type { BusinessHealthPriorityItem } from "@/lib/enterprise";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";

type Props = {
  priority: BusinessHealthPriorityItem | null;
  className?: string;
};

/**
 * Prioridade nº 1 — evidência do Decision Engine.
 */
export function BusinessHealthPriority({ priority, className }: Props) {
  if (!priority) {
    return (
      <p className={cn(gofTypography.caption, className)}>
        Nenhuma prioridade com evidência neste momento.
      </p>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <ExecutiveBadge tone="primary" variant="soft">
          Prioridade #{priority.rank}
        </ExecutiveBadge>
        <ExecutiveBadge tone="neutral" variant="outline">
          {priority.moduleLabel}
        </ExecutiveBadge>
      </div>
      <p className="text-sm font-semibold text-foreground">{priority.title}</p>
      <p className={cn(gofTypography.subtitle, "line-clamp-2")}>
        {priority.reason}
      </p>
      {priority.href ? (
        <Link
          href={priority.href}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Abrir ação
        </Link>
      ) : null}
    </div>
  );
}
