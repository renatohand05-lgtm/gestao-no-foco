import { Check } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import {
  gofColors,
  gofMotion,
  gofRadius,
  gofTypography,
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
          <p
            className={cn(
              gofTypography.caption,
              "tracking-[0.12em] text-[var(--brand-gold)] uppercase",
            )}
          >
            Progresso
          </p>
          <p className={gofTypography.title}>
            {checklist.completedCount} de {checklist.totalCount} etapas
          </p>
        </div>
        <p className={cn(gofTypography.caption, "tabular-nums")}>
          {checklist.progressPct}%
          {estimatedMinutes != null && estimatedMinutes > 0
            ? ` · ~${estimatedMinutes} min restantes`
            : null}
        </p>
      </div>
      <div
        className={cn("h-1.5 overflow-hidden bg-muted", gofRadius.sm)}
        role="progressbar"
        aria-valuenow={checklist.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do onboarding"
      >
        <div
          className={cn(
            "h-full bg-[var(--brand-gold)] motion-safe:transition-[width] motion-safe:duration-200",
            gofRadius.sm,
            gofMotion.fade,
          )}
          style={{ width: `${checklist.progressPct}%` }}
        />
      </div>
      {checklist.firstValueUnlocked ? (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1",
            gofTypography.caption,
            gofColors.success.soft,
            gofRadius.sm,
          )}
        >
          <DsIcon icon={Check} size="xs" />
          Primeiro valor desbloqueado
        </p>
      ) : (
        <p className={gofTypography.caption}>
          Falta apenas uma etapa útil (meta ou venda) para ativar o Dashboard.
        </p>
      )}
    </div>
  );
}
