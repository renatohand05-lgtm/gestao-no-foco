import Link from "next/link";

import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveActionResult } from "@/lib/intelligence/types";

type Props = {
  action: ExecutiveActionResult;
};

const SEV_TONE = {
  critical: "danger",
  important: "warning",
  positive: "success",
  neutral: "info",
} as const;

const SEV_LABEL = {
  critical: "Crítico",
  important: "Importante",
  positive: "Positivo",
  neutral: "Neutro",
} as const;

export function ExecutiveActionCard({ action }: Props) {
  const tone = SEV_TONE[action.severity];
  return (
    <ExecutiveCard
      padding={24}
      accent={tone}
      className={cn(exAnimations.slide)}
      aria-label={`Próxima ação: ${action.title}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Próxima ação</p>
        <ExecutiveBadge tone={tone}>{SEV_LABEL[action.severity]}</ExecutiveBadge>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
        {action.title}
      </p>
      <p className={cn("mt-2", exTypography.caption)}>{action.description}</p>
      <p className={cn("mt-2", exTypography.caption)}>
        <span className="font-medium text-foreground">Por quê:</span>{" "}
        {action.rationale}
      </p>
      <Link
        href={action.href}
        className={cn(
          "mt-4 inline-flex h-10 items-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white",
          exAnimations.hoverPress,
          exAnimations.focusRing,
        )}
      >
        {action.actionLabel}
      </Link>
    </ExecutiveCard>
  );
}
