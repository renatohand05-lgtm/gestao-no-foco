"use client";

import Link from "next/link";
import { useState } from "react";

import { DecisionPriority } from "@/components/dashboard/executive-decision-center/decision-priority";
import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import {
  EDC_CATEGORY_LABEL,
  EDC_CONFIDENCE_LABEL,
  EDC_EFFORT_LABEL,
  EDC_URGENCY_LABEL,
  type EdcDecision,
} from "@/lib/executive-decision-center";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  decision: EdcDecision;
};

export function DecisionCard({ decision }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div data-decision-id={decision.id} data-priority={decision.priority}>
    <ExecutiveCard
      padding={16}
      className={cn(
        "space-y-2",
        decision.quickWin && "ring-1 ring-success/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DecisionPriority priority={decision.priority} />
        <ExecutiveBadge tone="neutral" variant="outline">
          {EDC_CATEGORY_LABEL[decision.category]}
        </ExecutiveBadge>
        <ExecutiveBadge tone="neutral" variant="outline">
          Urgência {EDC_URGENCY_LABEL[decision.urgency]}
        </ExecutiveBadge>
        {decision.quickWin ? (
          <ExecutiveBadge tone="success" variant="soft">
            Quick win
          </ExecutiveBadge>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-foreground">{decision.title}</p>
      <p className={cn(gofTypography.subtitle, "text-sm")}>
        {decision.description}
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className={gofTypography.caption}>
          Impacto {decision.impact}/100
        </span>
        <span className={gofTypography.caption}>
          Confiança {EDC_CONFIDENCE_LABEL[decision.confidence]}
        </span>
        <span className={gofTypography.caption}>
          Esforço {EDC_EFFORT_LABEL[decision.effort]}
        </span>
        <span className={gofTypography.caption}>
          Score fila {decision.score}
        </span>
      </div>

      {decision.financialImpactLabel ? (
        <p className={cn(gofTypography.caption, "text-foreground")}>
          Impacto financeiro: {decision.financialImpactLabel}
        </p>
      ) : null}

      <p className={cn(gofTypography.caption, "text-foreground")}>
        <span className="font-semibold">Ação:</span> {decision.suggestedAction}
      </p>

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
        {decision.href ? (
          <Link
            href={decision.href}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Abrir módulo
          </Link>
        ) : null}
      </div>

      {open ? (
        <ul className="space-y-1 border-t border-border/50 pt-2">
          {decision.evidence.length === 0 ? (
            <li className={gofTypography.caption}>Sem evidências listadas.</li>
          ) : (
            decision.evidence.map((ev) => (
              <li key={ev.id} className={gofTypography.caption}>
                <span className="font-medium text-foreground">{ev.label}:</span>{" "}
                {ev.value}
                <span className="text-muted-foreground"> · {ev.source}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </ExecutiveCard>
    </div>
  );
}
