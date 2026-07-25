"use client";

import Link from "next/link";

import type { ExecutiveCopilotAction } from "@/lib/ai/executive-copilot-types";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";

type Props = {
  actions: ExecutiveCopilotAction[];
  className?: string;
};

export function ExecutiveCopilotActions({ actions, className }: Props) {
  if (actions.length === 0) {
    return (
      <p className={cn(gofTypography.caption, className)}>
        Nenhuma ação recomendada com evidência neste momento.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)} aria-label="Ações recomendadas">
      {actions.map((action) => {
        const body = (
          <ExecutiveCard padding={12} className="space-y-1" interactive={Boolean(action.link)}>
            <div className="flex flex-wrap items-center gap-1.5">
              <ExecutiveBadge tone="primary" variant="soft">
                #{action.priority}
              </ExecutiveBadge>
              <ExecutiveBadge tone="neutral" variant="outline">
                {action.domain}
              </ExecutiveBadge>
            </div>
            <p className="text-sm font-semibold">{action.title}</p>
            <p className={cn(gofTypography.subtitle, "line-clamp-2")}>
              {action.description}
            </p>
            {action.impact ? (
              <p className={gofTypography.caption}>{action.impact}</p>
            ) : null}
          </ExecutiveCard>
        );

        return (
          <li key={`${action.priority}-${action.title}`}>
            {action.link ? (
              <Link href={action.link} className="block focus-visible:outline-none">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
