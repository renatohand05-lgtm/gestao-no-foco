import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  gofCardSurface,
  gofColors,
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { OnboardingChecklistResult } from "@/lib/onboarding";

type Props = {
  checklist: OnboardingChecklistResult;
};

export function OnboardingChecklist({ checklist }: Props) {
  return (
    <ul className="space-y-3" aria-label="Checklist de configuração">
      {checklist.items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
            gofCardSurface,
            gofMotion.fade,
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex size-11 shrink-0 items-center justify-center",
                gofRadius.lg,
                item.completed ? gofColors.success.soft : gofColors.muted.className,
              )}
              aria-hidden
            >
              <DsIcon icon={item.completed ? Check : Circle} size="sm" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={gofTypography.title}>{item.title}</p>
                <span
                  className={cn(
                    "px-2 py-0.5",
                    gofTypography.caption,
                    gofRadius.sm,
                    item.required
                      ? "bg-[var(--brand-graphite)] text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.required ? "Essencial" : "Opcional"}
                </span>
                {item.completed ? (
                  <span className={cn(gofTypography.caption, gofColors.success.text)}>
                    Concluído
                  </span>
                ) : null}
              </div>
              <p className={gofTypography.caption}>{item.description}</p>
              <p className={cn(gofTypography.caption, "text-foreground/80")}>
                Impacto: {item.benefit}
              </p>
            </div>
          </div>
          {!item.completed ? (
            <Button
              size="sm"
              className={cn("min-h-11 shrink-0", gofFocusRing)}
              render={<Link href={item.href} />}
            >
              {item.ctaLabel}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className={cn("min-h-11 shrink-0", gofFocusRing)}
              render={<Link href={item.href} />}
            >
              Abrir
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
