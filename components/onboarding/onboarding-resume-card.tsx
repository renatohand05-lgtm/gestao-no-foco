"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, X } from "lucide-react";

import { ImplantationChecklist } from "@/components/onboarding/implantation-checklist";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import { dismissOnboardingChecklistAction } from "@/lib/onboarding/actions";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { OnboardingChecklistResult } from "@/lib/onboarding";

type Props = {
  tenantSlug: string;
  checklist: OnboardingChecklistResult;
  message: string;
};

/**
 * Banner + checklist de implantação (Gate 19.4).
 * Esconde-se quando completo (pai + progressPct).
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
  const showImplant = checklist.progressPct < 100;

  return (
    <div className="space-y-4">
      <aside
        className={cn(
          "relative border border-border/60 bg-card p-4 sm:p-5",
          gofRadius.lg,
          gofMotion.fade,
        )}
        aria-label="Continuar configuração"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5 pr-8">
            <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
              {brandConfig.name} · Configuração inicial
            </p>
            <p className={gofTypography.title}>
              {checklist.completedCount} de {checklist.totalCount} ·{" "}
              {checklist.progressPct}%
            </p>
            <p className={gofTypography.subtitle}>{message}</p>
            {next ? (
              <p className={cn(gofTypography.caption, "text-foreground")}>
                Próximo: {next.title}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="min-h-11"
              render={
                <Link
                  href={next?.href ?? `/${tenantSlug}/primeiro-acesso`}
                />
              }
            >
              Continuar
              <DsIcon icon={ArrowRight} size="sm" className="text-current" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              render={<Link href={`/${tenantSlug}/primeiro-acesso`} />}
            >
              Ver onboarding
            </Button>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 size-11"
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

      {showImplant ? (
        <ImplantationChecklist
          tenantSlug={tenantSlug}
          checklist={checklist}
        />
      ) : null}
    </div>
  );
}
