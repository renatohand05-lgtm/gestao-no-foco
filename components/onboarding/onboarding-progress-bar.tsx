import { Check } from "lucide-react";

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
  estimatedMinutes?: number;
};

export function OnboardingProgressBar({
  checklist,
  estimatedMinutes,
}: Props) {
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={exTypography.label}>Progresso</p>
          <p className={exTypography.sectionTitle}>
            {checklist.completedCount} de {checklist.totalCount} etapas
          </p>
        </div>
        <p className={cn(exTypography.caption, "tabular-nums")}>
          {checklist.progressPct}%
          {estimatedMinutes != null && estimatedMinutes > 0
            ? ` · ~${estimatedMinutes} min restantes`
            : null}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={checklist.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do onboarding"
      >
        <div
          className={cn("h-full rounded-full bg-blue-600", exAnimations.progress)}
          style={{ width: `${checklist.progressPct}%` }}
        />
      </div>
      {checklist.firstValueUnlocked ? (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
            exTypography.caption,
            exColors.success.soft,
            exRadius.full,
          )}
        >
          <DsIcon icon={Check} size="xs" />
          Primeiro valor desbloqueado
        </p>
      ) : (
        <p className={exTypography.caption}>
          Falta apenas uma etapa útil (meta ou venda) para ativar o Dashboard.
        </p>
      )}
    </div>
  );
}
