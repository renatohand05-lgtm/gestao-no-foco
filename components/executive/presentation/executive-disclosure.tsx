"use client";

import { ChevronDown } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exMotion, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  summary: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

/**
 * Progressive disclosure acessível (details/summary nativo).
 */
export function ExecutiveDisclosure({
  summary,
  children,
  className,
  defaultOpen = false,
}: Props) {
  return (
    <details
      className={cn("group", className)}
      open={defaultOpen ? true : undefined}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2",
          exTypography.caption,
          "font-medium text-foreground marker:content-none",
          "[&::-webkit-details-marker]:hidden",
          exAnimations.focusRing,
          exMotion.transition,
        )}
      >
        <DsIcon
          icon={ChevronDown}
          size="sm"
          className="shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
        />
        {summary}
      </summary>
      <div className={cn("mt-2 space-y-2 pl-6", exAnimations.fade)}>
        {children}
      </div>
    </details>
  );
}
