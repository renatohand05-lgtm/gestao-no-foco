"use client";

import Link from "next/link";
import { useState } from "react";

import { ExecutiveTimelineEvidenceList } from "@/components/dashboard/executive-timeline/executive-timeline-evidence";
import { ExecutiveTimelineImpact } from "@/components/dashboard/executive-timeline/executive-timeline-impact";
import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import {
  EXECUTIVE_TIMELINE_CATEGORY_LABEL,
  EXECUTIVE_TIMELINE_CONFIDENCE_LABEL,
  EXECUTIVE_TIMELINE_SEVERITY_LABEL,
  formatTimelineTime,
  type ExecutiveTimelineEvent,
} from "@/lib/executive-timeline";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function severityTone(
  s: ExecutiveTimelineEvent["severity"],
): "info" | "success" | "warning" | "danger" | "neutral" {
  if (s === "positive") return "success";
  if (s === "attention") return "warning";
  if (s === "critical") return "danger";
  if (s === "info") return "info";
  return "neutral";
}

type Props = {
  event: ExecutiveTimelineEvent;
};

export function ExecutiveTimelineItem({ event }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <li className="relative pl-6">
      <span
        className={cn(
          "absolute left-0 top-3 size-2.5 rounded-full",
          event.severity === "critical" && "bg-danger",
          event.severity === "attention" && "bg-warning",
          event.severity === "positive" && "bg-success",
          event.severity === "info" && "bg-muted-foreground",
        )}
        aria-hidden
      />
      <ExecutiveCard padding={16} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <time dateTime={event.timestamp} className={gofTypography.caption}>
            {formatTimelineTime(event.timestamp)}
          </time>
          <ExecutiveBadge tone="neutral" variant="outline">
            {EXECUTIVE_TIMELINE_CATEGORY_LABEL[event.category]}
          </ExecutiveBadge>
          <ExecutiveBadge tone={severityTone(event.severity)} variant="soft">
            {EXECUTIVE_TIMELINE_SEVERITY_LABEL[event.severity]}
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            Confiança {EXECUTIVE_TIMELINE_CONFIDENCE_LABEL[event.confidence]}
          </ExecutiveBadge>
        </div>

        <p className="text-sm font-semibold text-foreground">{event.title}</p>
        <p className={cn(gofTypography.subtitle, "text-sm")}>
          {event.description}
        </p>

        <ExecutiveTimelineImpact event={event} />

        {event.recommendation ? (
          <p className={cn(gofTypography.caption, "text-foreground")}>
            <span className="font-semibold">Ação:</span> {event.recommendation}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "text-xs font-medium text-primary underline-offset-2 hover:underline",
              gofFocusRing,
            )}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Ocultar evidências" : "Ver evidências"}
          </button>
          {event.href ? (
            <Link
              href={event.href}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Abrir módulo
            </Link>
          ) : null}
        </div>

        {open ? <ExecutiveTimelineEvidenceList items={event.evidence} /> : null}
      </ExecutiveCard>
    </li>
  );
}
