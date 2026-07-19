import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  impact: string;
  href: string;
  ctaLabel: string;
};

/**
 * Empty state orientado a primeiro valor (Sprint 13.12).
 */
export function OnboardingEmptyState({
  title,
  description,
  impact,
  href,
  ctaLabel,
}: Props) {
  return (
    <div
      className={cn(
        "border bg-white p-6 text-center dark:bg-card",
        exRadius[20],
        exShadow.card,
        exAnimations.fade,
      )}
      role="status"
    >
      <p className={exTypography.sectionTitle}>{title}</p>
      <p className={cn("mt-2", exTypography.caption)}>{description}</p>
      <p className={cn("mt-2", exTypography.caption, "text-foreground")}>
        Impacto no Dashboard: {impact}
      </p>
      <Button
        className={cn("mt-4 min-h-11", exAnimations.focusRing)}
        render={<Link href={href} />}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
