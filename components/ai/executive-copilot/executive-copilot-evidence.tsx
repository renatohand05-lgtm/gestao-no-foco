"use client";

import Link from "next/link";

import type { ExecutiveCopilotEvidenceItem } from "@/lib/ai/executive-copilot-types";
import { EXECUTIVE_COPILOT_CONFIDENCE_LABEL } from "@/lib/ai/executive-copilot-types";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";

type Props = {
  items: ExecutiveCopilotEvidenceItem[];
  className?: string;
};

export function ExecutiveCopilotEvidence({ items, className }: Props) {
  if (items.length === 0) {
    return (
      <p className={cn(gofTypography.caption, className)}>
        Sem evidências suficientes para esta resposta.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid gap-2 sm:grid-cols-2",
        className,
      )}
      aria-label="Evidências"
    >
      {items.map((item, idx) => (
        <li key={`${item.source}-${item.label}-${idx}`}>
          <ExecutiveCard padding={12} className="space-y-1 h-full">
            <div className="flex flex-wrap items-center gap-1.5">
              <ExecutiveBadge tone="neutral" variant="outline">
                {item.domain}
              </ExecutiveBadge>
              <ExecutiveBadge tone="neutral" variant="soft">
                {EXECUTIVE_COPILOT_CONFIDENCE_LABEL[item.reliability]}
              </ExecutiveBadge>
            </div>
            <p className="text-xs font-semibold text-foreground">{item.label}</p>
            <p className={cn(gofTypography.subtitle, "text-sm")}>{item.value}</p>
            <p className={gofTypography.caption}>
              {item.status} · {item.source}
            </p>
            {item.link ? (
              <Link
                href={item.link}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Abrir
              </Link>
            ) : null}
          </ExecutiveCard>
        </li>
      ))}
    </ul>
  );
}
