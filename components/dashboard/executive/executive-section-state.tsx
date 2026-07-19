import Link from "next/link";
import {
  AlertTriangle,
  Inbox,
  LineChart,
  ShieldOff,
  Target,
  WifiOff,
} from "lucide-react";

import { ExecutiveCard } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exColors,
  exRadius,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type ExecutiveSectionStateVariant =
  | "loading"
  | "empty"
  | "error"
  | "sem_meta"
  | "offline"
  | "forbidden"
  | "success";

type Props = {
  variant: ExecutiveSectionStateVariant;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

function EmptyIllustration({ variant }: { variant: Props["variant"] }) {
  const stroke =
    variant === "error" || variant === "offline" || variant === "forbidden"
      ? "stroke-red-500/35"
      : variant === "sem_meta"
        ? "stroke-violet-500/35"
        : variant === "success"
          ? "stroke-emerald-500/35"
          : "stroke-slate-400/40";
  return (
    <svg
      viewBox="0 0 120 72"
      className="h-14 w-24 text-muted-foreground/30"
      aria-hidden
    >
      <rect
        x="10"
        y="14"
        width="100"
        height="44"
        rx="14"
        className={cn("fill-slate-100/80 dark:fill-white/[0.04]", stroke)}
        strokeWidth="1.25"
        fill="none"
      />
      <path
        d="M28 42 L42 30 L55 38 L72 24 L92 36"
        className={stroke}
        strokeWidth="1.75"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="92" cy="36" r="3" className="fill-slate-400/50" />
    </svg>
  );
}

function variantVisual(variant: Props["variant"]) {
  switch (variant) {
    case "error":
      return {
        accent: "danger" as const,
        priority: "risk" as const,
        icon: AlertTriangle,
        iconClass: exColors.danger.soft,
      };
    case "offline":
      return {
        accent: "warning" as const,
        priority: "risk" as const,
        icon: WifiOff,
        iconClass: exColors.warning.soft,
      };
    case "forbidden":
      return {
        accent: "danger" as const,
        priority: "risk" as const,
        icon: ShieldOff,
        iconClass: exColors.danger.soft,
      };
    case "sem_meta":
      return {
        accent: "info" as const,
        priority: "opportunity" as const,
        icon: Target,
        iconClass: exColors.info.soft,
      };
    case "success":
      return {
        accent: "success" as const,
        priority: "opportunity" as const,
        icon: Inbox,
        iconClass: exColors.success.soft,
      };
    case "loading":
      return {
        accent: "none" as const,
        priority: "info" as const,
        icon: LineChart,
        iconClass: exColors.neutral.muted,
      };
    default:
      return {
        accent: "none" as const,
        priority: "info" as const,
        icon: Inbox,
        iconClass: "bg-slate-100 text-slate-500 dark:bg-white/5",
      };
  }
}

/**
 * Empty / error / loading / first-access / offline / forbidden (Sprint 13.8.1).
 * Fonte única de estados de módulo no Dashboard Executivo.
 */
export function ExecutiveSectionState({
  variant,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: Props) {
  const visual = variantVisual(variant);

  if (variant === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn("mt-4", className)}
      >
        <div
          className={cn(
            "h-28 bg-white dark:bg-card",
            exRadius[20],
            exAnimations.shimmer,
          )}
        />
      </div>
    );
  }

  return (
    <div
      role={variant === "error" || variant === "forbidden" ? "alert" : "status"}
      aria-live="polite"
      className="mt-4"
    >
      <ExecutiveCard
        padding={24}
        accent={visual.accent}
        priority={visual.priority}
        className={cn("relative overflow-hidden", exAnimations.fade, className)}
      >
        <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4 py-5 text-center">
          <EmptyIllustration variant={variant} />
          <span
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-xl",
              visual.iconClass,
            )}
          >
            <DsIcon icon={visual.icon} size="sm" />
          </span>
          <div className="space-y-1.5">
            <p className={exTypography.sectionTitle}>{title}</p>
            {description ? (
              <p className={exTypography.caption}>{description}</p>
            ) : null}
          </div>
          {actionHref && actionLabel ? (
            <Button
              size="sm"
              className={cn("min-h-11", exAnimations.focusRing)}
              render={<Link href={actionHref} />}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </ExecutiveCard>
    </div>
  );
}
