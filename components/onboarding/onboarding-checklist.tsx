import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exColors,
  exRadius,
  exTypography,
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
            "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
            item.completed
              ? "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5"
              : "border-slate-200/70 bg-white dark:border-white/10 dark:bg-card",
            exAnimations.fade,
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
                item.completed ? exColors.success.soft : exColors.neutral.muted,
              )}
              aria-hidden
            >
              <DsIcon icon={item.completed ? Check : Circle} size="sm" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={exTypography.sectionTitle}>{item.title}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    exTypography.caption,
                    item.required
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10",
                    exRadius.full,
                  )}
                >
                  {item.required ? "Essencial" : "Opcional"}
                </span>
                {item.completed ? (
                  <span className={cn(exTypography.caption, "text-emerald-700")}>
                    Concluído
                  </span>
                ) : null}
              </div>
              <p className={exTypography.caption}>{item.description}</p>
              <p className={cn(exTypography.caption, "text-foreground/80")}>
                Impacto: {item.benefit}
              </p>
            </div>
          </div>
          {!item.completed ? (
            <Button
              size="sm"
              className={cn("min-h-11 shrink-0", exAnimations.focusRing)}
              render={<Link href={item.href} />}
            >
              {item.ctaLabel}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className={cn("min-h-11 shrink-0", exAnimations.focusRing)}
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
