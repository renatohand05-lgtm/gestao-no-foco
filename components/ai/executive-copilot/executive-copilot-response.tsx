"use client";

import type { ExecutiveCopilotResponse } from "@/lib/ai/executive-copilot-types";
import { EXECUTIVE_COPILOT_INTENT_LABEL } from "@/lib/ai/executive-copilot-types";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";
import { ExecutiveCopilotActions } from "@/components/ai/executive-copilot/executive-copilot-actions";
import { ExecutiveCopilotConfidence } from "@/components/ai/executive-copilot/executive-copilot-confidence";
import { ExecutiveCopilotEvidence } from "@/components/ai/executive-copilot/executive-copilot-evidence";
import Link from "next/link";

type Props = {
  response: ExecutiveCopilotResponse;
  className?: string;
};

export function ExecutiveCopilotResponseView({ response, className }: Props) {
  return (
    <article
      className={cn("space-y-4", className)}
      aria-live="polite"
      data-copilot-intent={response.intent}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ExecutiveBadge tone="neutral" variant="outline">
          {EXECUTIVE_COPILOT_INTENT_LABEL[response.intent]}
        </ExecutiveBadge>
        <ExecutiveCopilotConfidence level={response.confidence} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{response.answer}</p>
        <p className={cn(gofTypography.subtitle, "text-sm")}>{response.summary}</p>
      </div>

      {response.warnings.length > 0 ? (
        <ul className="space-y-1" aria-label="Avisos">
          {response.warnings.map((w) => (
            <li key={w} className={cn(gofTypography.caption, "text-warning")}>
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      {response.unavailableReasons.length > 0 ? (
        <ul className="space-y-1" aria-label="Indisponível">
          {response.unavailableReasons.map((r) => (
            <li key={r} className={gofTypography.caption}>
              {r}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className={cn(gofTypography.caption, "mb-2")}>Evidências</p>
        <ExecutiveCopilotEvidence items={response.evidence} />
      </div>

      <div>
        <p className={cn(gofTypography.caption, "mb-2")}>Ações</p>
        <ExecutiveCopilotActions actions={response.recommendedActions} />
      </div>

      {response.relatedLinks.length > 0 ? (
        <div>
          <p className={cn(gofTypography.caption, "mb-2")}>Links</p>
          <ul className="flex flex-wrap gap-2">
            {response.relatedLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
