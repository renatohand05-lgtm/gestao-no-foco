"use client";

import {
  ENTERPRISE_ONBOARDING_FLOW,
  enterpriseProgressPct,
  type EnterpriseOnboardingStepId,
} from "@/config/onboarding/flow";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  step: EnterpriseOnboardingStepId;
};

export function EnterpriseProgress({ step }: Props) {
  const pct = enterpriseProgressPct(step);
  const index = ENTERPRISE_ONBOARDING_FLOW.findIndex((s) => s.id === step);
  const current = index >= 0 ? index + 1 : 1;
  const total = ENTERPRISE_ONBOARDING_FLOW.length;

  return (
    <div className={cn("space-y-2", gofMotion.fade)} aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className={cn(gofTypography.caption, "text-[var(--brand-gold)] uppercase tracking-[0.12em]")}>
          Onboarding enterprise
        </p>
        <p className={cn(gofTypography.caption, "tabular-nums")}>
          Passo {current} de {total} · {pct}%
        </p>
      </div>
      <div
        className={cn("h-1.5 overflow-hidden bg-muted", gofRadius.sm)}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do onboarding enterprise"
      >
        <div
          className={cn(
            "h-full bg-[var(--brand-gold)] motion-safe:transition-[width] motion-safe:duration-300",
            gofRadius.sm,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="hidden gap-1 sm:flex sm:flex-wrap" aria-hidden="true">
        {ENTERPRISE_ONBOARDING_FLOW.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px]",
              i <= index
                ? "bg-[var(--brand-gold)]/15 text-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {s.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
