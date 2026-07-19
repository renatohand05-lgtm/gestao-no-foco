import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  Zap,
} from "lucide-react";

import { ExecutiveBadge } from "@/components/executive";
import { ExecutiveConfidence } from "@/components/executive/presentation";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exColors,
  exMotion,
  exPadding,
  exRadius,
  exShadow,
  exSize,
  exStack,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ActionCenterDecision } from "@/lib/action-center";

type Props = {
  decision: ActionCenterDecision;
};

const PRIORITY_META = {
  CRITICA: {
    label: "Crítica",
    tone: "danger" as const,
    Icon: AlertTriangle,
    bar: "from-red-600 to-red-500",
    soft: exColors.danger.soft,
    ring: "ring-1 ring-red-500/20",
    elevation: exShadow.critical,
  },
  ALTA: {
    label: "Alta",
    tone: "warning" as const,
    Icon: Zap,
    bar: "from-orange-600 to-amber-500",
    soft: exColors.warning.soft,
    ring: "ring-1 ring-orange-500/15",
    elevation: exShadow.warningElevated,
  },
  MEDIA: {
    label: "Média",
    tone: "info" as const,
    Icon: Info,
    bar: "from-violet-600 to-indigo-500",
    soft: exColors.info.soft,
    ring: "ring-1 ring-slate-200/70",
    elevation: exShadow.decision,
  },
  BAIXA: {
    label: "Baixa",
    tone: "success" as const,
    Icon: CheckCircle2,
    bar: "from-emerald-600 to-teal-500",
    soft: exColors.success.soft,
    ring: "ring-1 ring-emerald-500/10",
    elevation: exShadow.card,
  },
} as const;

/**
 * Ação principal — ~2× peso visual (Sprint 13.8 polish).
 * Sem alteração do motor Action Center.
 */
export function ExecutiveActionCard({ decision }: Props) {
  const meta = PRIORITY_META[decision.priority];

  return (
    <article
      className={cn(
        "relative overflow-hidden bg-white dark:bg-card",
        exRadius[24],
        meta.ring,
        "dark:ring-white/10",
        meta.elevation,
        exAnimations.slide,
        exAnimations.hoverGlow,
        exSize.actionCard,
      )}
      data-priority="action"
      aria-label={`Ação principal — ${meta.label}`}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b",
          meta.bar,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-blue-500/[0.04] blur-2xl"
        aria-hidden
      />

      <div
        className={cn(
          "relative flex flex-col sm:flex-row sm:items-stretch",
          "gap-5 sm:gap-8",
          exPadding[20],
          "pl-6 sm:p-6 sm:pl-8 lg:p-7 lg:pl-9",
        )}
      >
        <div className={cn("min-w-0 flex-[1.6]", exStack[16])}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-xl",
                meta.soft,
              )}
              aria-hidden
            >
              <DsIcon icon={meta.Icon} size="sm" />
            </span>
            <p className={exTypography.label}>Próxima decisão</p>
            <ExecutiveBadge
              tone={meta.tone}
              className="font-medium normal-case tracking-normal"
            >
              {meta.label}
            </ExecutiveBadge>
          </div>

          <h2 className={cn(exTypography.headline, "max-w-3xl text-balance")}>
            {decision.headline}
          </h2>

          <p
            className={cn(
              exTypography.body,
              "max-w-3xl line-clamp-3 text-muted-foreground",
            )}
          >
            {decision.description}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                "rounded-xl p-3.5",
                exColors.neutral.muted,
              )}
            >
              <p className={exTypography.label}>Impacto</p>
              <p className={cn("mt-1", exTypography.cardTitle)}>
                {decision.impact}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl p-3.5",
                exColors.neutral.muted,
              )}
            >
              <p className={exTypography.label}>Motivo</p>
              <p className={cn("mt-1", exTypography.cardTitle)}>
                {decision.reason}
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col justify-between gap-4 rounded-xl p-4",
            "sm:w-56 sm:bg-transparent sm:p-0 sm:pl-8",
            "sm:border-l sm:border-slate-100 dark:sm:border-white/10",
            exColors.neutral.muted,
            "dark:sm:bg-transparent sm:bg-transparent",
          )}
        >
          <div className="space-y-2">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <DsIcon icon={Clock3} size="xs" />
              <span className="font-medium text-foreground">
                Prazo · {decision.deadline}
              </span>
            </p>
            <ExecutiveConfidence level={decision.confidence} />
          </div>
          <Button
            size="lg"
            className={cn(
              "w-full min-h-12 rounded-xl text-base",
              exAnimations.focusRing,
              exMotion.press,
              exAnimations.hoverPress,
              exAnimations.hoverScale,
            )}
            render={<Link href={decision.cta.href} />}
          >
            {decision.cta.label}
            <DsIcon icon={ArrowRight} size="sm" className="text-current" />
          </Button>
        </div>
      </div>
    </article>
  );
}
