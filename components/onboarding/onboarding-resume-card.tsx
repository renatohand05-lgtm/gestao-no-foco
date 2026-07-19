"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  dismissOnboardingChecklistAction,
} from "@/lib/onboarding/actions";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { OnboardingChecklistResult } from "@/lib/onboarding";

type Props = {
  tenantSlug: string;
  checklist: OnboardingChecklistResult;
  message: string;
};

/**
 * Banner no Dashboard — não altera Hero/KPIs (Design Freeze).
 */
export function OnboardingResumeCard({
  tenantSlug,
  checklist,
  message,
}: Props) {
  const [pending, startTransition] = useTransition();

  if (checklist.dashboardReady && checklist.progressPct >= 100) {
    return null;
  }

  const next = checklist.nextItem;

  return (
    <aside
      className={cn(
        "relative border bg-white p-4 dark:bg-card sm:p-5",
        exRadius[20],
        exShadow.card,
        exAnimations.slide,
      )}
      aria-label="Continuar configuração"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5 pr-8">
          <p className={exTypography.label}>Configuração inicial</p>
          <p className={exTypography.sectionTitle}>
            {checklist.completedCount} de {checklist.totalCount} ·{" "}
            {checklist.progressPct}%
          </p>
          <p className={exTypography.caption}>{message}</p>
          {next ? (
            <p className={cn(exTypography.caption, "text-foreground")}>
              Próximo: {next.title}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className={cn("min-h-11", exAnimations.focusRing)}
            render={
              <Link
                href={
                  next?.href ?? `/${tenantSlug}/primeiro-acesso`
                }
              />
            }
          >
            Continuar
            <DsIcon icon={ArrowRight} size="sm" className="text-current" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn("min-h-11", exAnimations.focusRing)}
            render={<Link href={`/${tenantSlug}/primeiro-acesso`} />}
          >
            Ver checklist
          </Button>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "absolute right-2 top-2 size-11",
          exAnimations.focusRing,
        )}
        aria-label="Dispensar lembrete"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void dismissOnboardingChecklistAction(tenantSlug);
          })
        }
      >
        <DsIcon icon={X} size="sm" />
      </Button>
    </aside>
  );
}
