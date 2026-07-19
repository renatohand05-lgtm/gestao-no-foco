"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  LineChart,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { ExecutiveBadge } from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exGlass,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  TimelineCategory,
  TimelineEvent,
  TimelineTone,
} from "@/lib/timeline-engine";

type Props = {
  event: TimelineEvent;
  index: number;
};

const TONE_META: Record<
  TimelineTone,
  {
    badge: "success" | "warning" | "danger" | "info";
    dot: string;
    iconWrap: string;
  }
> = {
  Success: {
    badge: "success",
    dot: "bg-emerald-600",
    iconWrap: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  },
  Warning: {
    badge: "warning",
    dot: "bg-orange-600",
    iconWrap: "bg-orange-600/10 text-orange-700 dark:text-orange-400",
  },
  Danger: {
    badge: "danger",
    dot: "bg-red-600",
    iconWrap: "bg-red-600/10 text-red-700 dark:text-red-400",
  },
  Info: {
    badge: "info",
    dot: "bg-violet-600",
    iconWrap: "bg-violet-600/10 text-violet-700 dark:text-violet-400",
  },
};

const CATEGORY_ICON: Record<TimelineCategory, LucideIcon> = {
  Meta: Target,
  Ritmo: Activity,
  Projeção: LineChart,
  Ticket: TrendingUp,
  Crescimento: TrendingUp,
  Confiança: Info,
  Tendência: TrendingDown,
  Performance: CheckCircle2,
};

const PRIORITY_LABEL = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
} as const;

const ORIGIN_LABEL = {
  executive_intelligence: "Inteligência executiva",
  business_intelligence: "Inteligência de negócio",
  prediction_engine: "Previsão",
} as const;

export function ExecutiveTimelineItem({ event, index }: Props) {
  const tone = TONE_META[event.tone];
  const Icon =
    event.tone === "Danger"
      ? AlertTriangle
      : CATEGORY_ICON[event.category];

  return (
    <li
      className={cn(
        "relative grid grid-cols-[2.5rem_1fr] gap-3 sm:grid-cols-[3rem_1fr] sm:gap-4",
        exAnimations.slide,
      )}
      style={{ animationDelay: exStagger(index) }}
    >
      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "z-10 flex size-9 items-center justify-center rounded-xl sm:size-10",
            tone.iconWrap,
            exGlass.badge,
          )}
          aria-hidden
        >
          <DsIcon icon={Icon} size="sm" />
        </span>
      </div>

      <article
        className={cn(
          "min-w-0 rounded-2xl p-3.5 sm:p-4",
          exGlass.soft,
          exAnimations.hoverLift,
          "motion-reduce:hover:translate-y-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <ExecutiveBadge
            tone={tone.badge}
            className="font-normal normal-case tracking-normal"
          >
            {event.category}
          </ExecutiveBadge>
          <ExecutiveBadge
            tone="info"
            className="font-normal normal-case tracking-normal"
          >
            {PRIORITY_LABEL[event.priority]}
          </ExecutiveBadge>
        </div>

        <h3 className="mt-2 text-sm font-semibold tracking-tight sm:text-base">
          {event.title}
        </h3>
        <p className={cn("mt-1", exTypography.caption)}>{event.description}</p>

        <p className={cn("mt-2 text-xs sm:text-sm")}>
          <span className="font-medium text-foreground">Impacto:</span>{" "}
          <span className="text-muted-foreground">{event.impact}</span>
        </p>

        <div
          className={cn(
            "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1",
            exTypography.caption,
          )}
        >
          <span>Confiança {event.confidence}</span>
          <span aria-hidden>·</span>
          <span>{ORIGIN_LABEL[event.origin]}</span>
          {event.timestamp ? (
            <>
              <span aria-hidden>·</span>
              <time>{event.timestamp}</time>
            </>
          ) : null}
        </div>
      </article>
    </li>
  );
}
