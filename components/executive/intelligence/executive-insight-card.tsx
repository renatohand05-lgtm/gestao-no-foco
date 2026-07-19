import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exSpacing,
  exStagger,
  exTypography,
} from "@/lib/design-system";
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
    label: "Oportunidade",
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

export function ExecutiveInsightCard({ insight, index = 0 }: Props) {
  const cat = CAT[insight.category];
  const body = (
    <ExecutiveCard
      padding={20}
      accent={cat.tone}
      priority={
        insight.category === "critical"
          ? "risk"
          : insight.category === "important"
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
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
            cat.tone === "danger" && "bg-red-600/10 text-red-700",
            cat.tone === "warning" && "bg-orange-600/10 text-orange-700",
            cat.tone === "success" && "bg-emerald-600/10 text-emerald-700",
            cat.tone === "info" && "bg-violet-600/10 text-violet-700",
          )}
        >
          <DsIcon icon={cat.icon} size="md" />
        </span>
        <div className="min-w-0 space-y-2">
          <ExecutiveBadge tone={cat.tone}>{cat.label}</ExecutiveBadge>
          <p className="text-sm font-semibold tracking-tight">{insight.title}</p>
          <p className={exTypography.caption}>{insight.description}</p>
          <p className={exTypography.caption}>
            <span className="font-medium text-foreground">Impacto:</span>{" "}
            {insight.impact}
          </p>
          <p className={exTypography.caption}>
            <span className="font-medium text-foreground">Recomendação:</span>{" "}
            {insight.recommendation}
          </p>
          {insight.href ? (
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
    <Link href={insight.href} className={cn("block h-full", exAnimations.focusRing)}>
      {body}
    </Link>
  );
}

type GridProps = {
  insights: ExecutiveInsight[];
};

export function ExecutiveIntelligenceInsightsGrid({ insights }: GridProps) {
  if (insights.length === 0) return null;
  return (
    <ul
      className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", exSpacing[16])}
      aria-label="Insights executivos"
    >
      {insights.map((insight, index) => (
        <li key={insight.id}>
          <ExecutiveInsightCard insight={insight} index={index} />
        </li>
      ))}
    </ul>
  );
}
