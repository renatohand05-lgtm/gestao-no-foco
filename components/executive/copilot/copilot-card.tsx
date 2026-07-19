"use client";

import { useState } from "react";
import {
  BookOpen,
  Check,
  Lightbulb,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { ExecutiveBadge } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exGlass,
  exRadius,
  exShadow,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CopilotResponse, CopilotSource } from "@/lib/copilot";

type Props = {
  response: CopilotResponse;
  index: number;
};

const SOURCE_LABEL: Record<CopilotSource, string> = {
  action_center: "Action Center",
  executive_intelligence: "Inteligência executiva",
  business_intelligence: "Inteligência de negócio",
  prediction_engine: "Previsão",
  timeline: "Timeline",
};

const CONF_TONE = {
  baixa: "warning",
  media: "info",
  alta: "success",
} as const;

/**
 * Card premium de uma resposta do copiloto.
 */
export function CopilotCard({ response, index }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm text-muted-foreground",
          exGlass.soft,
          exAnimations.fade,
        )}
        role="status"
      >
        Resposta marcada como entendida.
      </div>
    );
  }

  return (
    <article
      className={cn(
        "relative overflow-hidden border-l-[3px] border-l-blue-600 p-4 sm:p-5",
        exRadius[20],
        exGlass.panel,
        exShadow.glow,
        exAnimations.slide,
        exAnimations.hoverLift,
      )}
      style={{ animationDelay: exStagger(index) }}
      aria-label={response.headline}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700 dark:text-blue-400",
            exGlass.badge,
          )}
          aria-hidden
        >
          <DsIcon
            icon={index === 0 ? Sparkles : MessageSquareText}
            size="md"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={exTypography.label}>Executive Copilot</p>
            <ExecutiveBadge tone={CONF_TONE[response.confidence]}>
              Confiança {response.confidence}
            </ExecutiveBadge>
          </div>

          <h3 className={cn("mt-2", exTypography.title)}>
            {response.headline}
          </h3>
          <p className={cn("mt-2", exTypography.caption)}>{response.resposta}</p>

          {response.evidencias.length > 0 ? (
            <div className={cn("mt-3 rounded-xl p-3", exGlass.soft)}>
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <DsIcon icon={BookOpen} size="xs" />
                Evidências
              </p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {response.evidencias.map((ev) => (
                  <li key={ev}>{ev}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className={cn("mt-3 inline-flex items-start gap-1.5 text-sm")}>
            <DsIcon
              icon={Lightbulb}
              size="xs"
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <span>
              <span className="font-medium text-foreground">Próxima ação:</span>{" "}
              <span className="text-muted-foreground">
                {response.proximaAcao}
              </span>
            </span>
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {response.fontes.map((f) => (
              <ExecutiveBadge
                key={f}
                tone="info"
                className="font-normal normal-case tracking-normal"
              >
                {SOURCE_LABEL[f]}
              </ExecutiveBadge>
            ))}
          </div>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-h-11 rounded-xl",
                exAnimations.focusRing,
                exAnimations.hoverPress,
              )}
              onClick={() => setDismissed(true)}
            >
              <DsIcon icon={Check} size="sm" className="mr-1.5" />
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
