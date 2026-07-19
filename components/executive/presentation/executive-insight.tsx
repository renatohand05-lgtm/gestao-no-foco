import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

import { ExecutiveCard } from "@/components/executive";
import { ExecutiveDisclosure } from "@/components/executive/presentation/executive-disclosure";
import { ExecutiveEvidence } from "@/components/executive/presentation/executive-evidence";
import { ExecutiveImpact } from "@/components/executive/presentation/executive-impact";
import { ExecutivePriorityBadge } from "@/components/executive/presentation/executive-priority-badge";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exSpacing,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import {
  mapInsightCategoryToPriority,
} from "@/lib/executive-presentation";
import { cn } from "@/lib/utils";
import type { ExecutiveInsight } from "@/lib/intelligence/types";

type Props = {
  insight: ExecutiveInsight;
  index?: number;
};

const CAT = {
  critical: {
    tone: "danger" as const,
    label: "Crítico",
    icon: ShieldAlert,
    surface: "ring-1 ring-red-500/15",
  },
  important: {
    tone: "warning" as const,
    label: "Atenção",
    icon: AlertTriangle,
    surface: "ring-1 ring-orange-500/12",
  },
  positive: {
    tone: "success" as const,
    label: "Positivo",
    icon: CheckCircle2,
    surface: "ring-1 ring-emerald-500/12",
  },
  informative: {
    tone: "info" as const,
    label: "Informativo",
    icon: Info,
    surface: "ring-1 ring-slate-200/60",
  },
};

/**
 * Insight estruturado: título · evidência · impacto · ação (campos existentes).
 */
export function ExecutiveInsightView({ insight, index = 0 }: Props) {
  const cat = CAT[insight.category];
  const priority = mapInsightCategoryToPriority(insight.category);

  const body = (
    <ExecutiveCard
      padding={20}
      accent={cat.tone}
      priority={
        insight.category === "critical" || insight.category === "important"
          ? "risk"
          : insight.category === "positive"
            ? "opportunity"
            : "info"
      }
      className={cn(
        "h-full",
        cat.surface,
        exAnimations.slide,
        exAnimations.hoverScale,
        insight.href && exAnimations.hoverGlow,
      )}
      style={{ animationDelay: exStagger(index) } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
            cat.tone === "danger" && "bg-red-600/10 text-red-700",
            cat.tone === "warning" && "bg-orange-600/10 text-orange-700",
            cat.tone === "success" && "bg-emerald-600/10 text-emerald-700",
            cat.tone === "info" && "bg-violet-600/10 text-violet-700",
          )}
          aria-hidden
        >
          <DsIcon icon={cat.icon} size="md" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ExecutivePriorityBadge priority={priority} label={cat.label} />
          </div>
          <p className={exTypography.sectionTitle}>{insight.title}</p>
          <ExecutiveEvidence value={insight.description} />
          <ExecutiveImpact value={insight.impact} />

          {insight.recommendation ? (
            <ExecutiveDisclosure summary="Recomendação e detalhes">
              <p className={exTypography.caption}>
                <span className="font-medium text-foreground">Ação sugerida:</span>{" "}
                {insight.recommendation}
              </p>
              {insight.href ? (
                <p className={cn(exTypography.caption, "text-blue-600")}>
                  {insight.actionLabel}
                </p>
              ) : null}
            </ExecutiveDisclosure>
          ) : null}

          {insight.href && !insight.recommendation ? (
            <span className="inline-flex text-sm font-medium text-blue-600">
              {insight.actionLabel} →
            </span>
          ) : null}
        </div>
      </div>
    </ExecutiveCard>
  );

  if (!insight.href) return body;
  return (
    <Link
      href={insight.href}
      className={cn("block h-full", exAnimations.focusRing)}
    >
      {body}
    </Link>
  );
}

type GridProps = {
  insights: ExecutiveInsight[];
};

export function ExecutiveInsightGrid({ insights }: GridProps) {
  if (insights.length === 0) return null;

  const sorted = [...insights].sort((a, b) => a.priority - b.priority);

  return (
    <ul
      className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", exSpacing[16])}
      aria-label="Insights executivos"
    >
      {sorted.map((insight, index) => (
        <li
          key={insight.id}
          className={cn(
            insight.category === "critical" && "md:col-span-2 xl:col-span-2",
          )}
        >
          <ExecutiveInsightView insight={insight} index={index} />
        </li>
      ))}
    </ul>
  );
}
