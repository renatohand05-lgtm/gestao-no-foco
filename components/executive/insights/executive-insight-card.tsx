import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

import { ExecutiveCard } from "@/components/executive";
import { ExecutiveDisclosure } from "@/components/executive/presentation/executive-disclosure";
import { ExecutiveEvidence } from "@/components/executive/presentation/executive-evidence";
import { ExecutiveImpact } from "@/components/executive/presentation/executive-impact";
import { ExecutiveConfidence } from "@/components/executive/presentation/executive-confidence";
import { ExecutiveSourceInfo } from "@/components/executive/presentation/executive-source-info";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exTypography,
} from "@/lib/design-system";
import { sourceLabel } from "@/lib/executive-insights";
import type { ExecutiveComposedInsight } from "@/lib/executive-insights";
import { cn } from "@/lib/utils";

type Props = {
  insight: ExecutiveComposedInsight;
  featured?: boolean;
};

const TYPE_UI = {
  critical: {
    tone: "danger" as const,
    label: "Crítico",
    icon: ShieldAlert,
  },
  warning: {
    tone: "warning" as const,
    label: "Atenção",
    icon: AlertTriangle,
  },
  opportunity: {
    tone: "info" as const,
    label: "Oportunidade",
    icon: Lightbulb,
  },
  positive: {
    tone: "success" as const,
    label: "Positivo",
    icon: CheckCircle2,
  },
  informational: {
    tone: "neutral" as const,
    label: "Informativo",
    icon: Info,
  },
};

export function ExecutiveInsightCard({ insight, featured }: Props) {
  const ui = TYPE_UI[insight.type];
  const showCta =
    insight.cta &&
    insight.confidence !== "baixa" &&
    insight.status !== "insufficient_data";

  return (
    <ExecutiveCard
      padding={featured ? 24 : 20}
      accent={ui.tone === "neutral" ? "info" : ui.tone}
      priority={
        insight.type === "critical" || insight.type === "warning"
          ? "risk"
          : insight.type === "opportunity" || insight.type === "positive"
            ? "opportunity"
            : "info"
      }
      className={cn(exAnimations.fade, featured && "ring-1 ring-slate-900/10")}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
            ui.tone === "danger" && "bg-red-600/10 text-red-700",
            ui.tone === "warning" && "bg-orange-600/10 text-orange-700",
            ui.tone === "success" && "bg-emerald-600/10 text-emerald-700",
            ui.tone === "info" && "bg-sky-600/10 text-sky-800",
            ui.tone === "neutral" && "bg-slate-500/10 text-slate-700",
          )}
          aria-hidden
        >
          <DsIcon icon={ui.icon} size="md" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(exTypography.caption, "font-medium")}>
              {ui.label}
            </span>
            <ExecutiveConfidence
              level={insight.confidence}
              reason={insight.confidenceReason}
            />
          </div>
          <h3 className={exTypography.sectionTitle}>{insight.title}</h3>
          <p className={exTypography.caption}>{insight.summary}</p>

          {insight.evidence ? (
            <ExecutiveEvidence value={insight.evidence} />
          ) : null}
          {insight.impact ? <ExecutiveImpact value={insight.impact} /> : null}

          {insight.recommendation && insight.confidence !== "baixa" ? (
            <p className={exTypography.caption}>
              <span className="font-medium text-foreground">Recomendação:</span>{" "}
              {insight.recommendation}
            </p>
          ) : null}

          {insight.horizon ? (
            <p className={exTypography.caption}>Prazo: {insight.horizon}</p>
          ) : null}

          {showCta && insight.cta ? (
            <Button
              size="sm"
              className={cn("mt-1 min-h-11", exAnimations.focusRing)}
              render={<Link href={insight.cta.href} />}
            >
              {insight.cta.label}
            </Button>
          ) : null}

          <ExecutiveDisclosure summary="Fontes e auditoria">
            <ExecutiveSourceInfo
              sources={insight.sources.map(sourceLabel)}
            />
            {insight.periodLabel ? (
              <p className={exTypography.caption}>
                Período: {insight.periodLabel}
              </p>
            ) : null}
            <p className={exTypography.caption}>Regra: {insight.ruleId}</p>
            {insight.relatedMetrics.length > 0 ? (
              <ul className={cn("mt-1 list-inside list-disc", exTypography.caption)}>
                {insight.relatedMetrics.map((m) => (
                  <li key={`${m.label}-${m.value}`}>
                    {m.label}: {m.value}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className={exTypography.caption}>
              Confiança: {insight.confidenceReason}
            </p>
          </ExecutiveDisclosure>
        </div>
      </div>
    </ExecutiveCard>
  );
}
