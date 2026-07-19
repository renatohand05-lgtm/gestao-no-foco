import {
  OnboardingProgressBar,
} from "@/components/onboarding/onboarding-progress-bar";
import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { OnboardingChecklistResult } from "@/lib/onboarding";

type Props = {
  checklist: OnboardingChecklistResult;
  estimatedMinutes?: number;
  message?: string;
};

/** Resumo de progresso (percentual + próximo passo). */
export function OnboardingProgress({
  checklist,
  estimatedMinutes,
  message,
}: Props) {
  return (
    <div className="space-y-3">
      <OnboardingProgressBar
        checklist={checklist}
        estimatedMinutes={estimatedMinutes}
      />
      {message ? (
        <p className={cn(exTypography.body, "text-muted-foreground")}>
          {message}
        </p>
      ) : null}
      {checklist.nextItem ? (
        <p className={exTypography.caption} aria-live="polite">
          Próximo passo: {checklist.nextItem.title}.
        </p>
      ) : null}
    </div>
  );
}
