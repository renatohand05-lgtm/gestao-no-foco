"use client";

import { useState } from "react";

import { ExecutiveSection } from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { ExecutiveTimelineItem } from "@/components/executive/timeline/executive-timeline-item";
import { Button } from "@/components/ui/button";
import {
  exAnimations,
  exGlass,
  exPadding,
  exRadius,
  exStack,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { TimelineEngineResult } from "@/lib/timeline-engine";

type Props = {
  data: TimelineEngineResult;
};

/**
 * Timeline Executiva Premium (Sprint 11.5 / 13.8 empty state).
 * Vertical · glass · fade/slide na entrada · histórico sob demanda.
 */
export function ExecutiveTimeline({ data }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const items = showHistory ? data.events : data.visible;

  if (data.events.length === 0) {
    return (
      <ExecutiveSection
        title="Timeline executiva"
        description="Narrativa dos sinais já calculados pela inteligência e previsões — sem novos cálculos."
        panel
      >
        <ExecutiveSectionState
          variant="empty"
          title="Nenhum evento neste período"
          description="Quando houver sinais de inteligência ou previsões, a narrativa aparece aqui."
        />
      </ExecutiveSection>
    );
  }

  return (
    <ExecutiveSection
      title="Timeline executiva"
      description="Narrativa dos sinais já calculados pela inteligência e previsões — sem novos cálculos."
      panel
    >
      <div className={cn(exStack[16], exAnimations.fade)}>
        <div
          className={cn(
            "relative",
            exRadius[20],
            exPadding[12],
            "sm:p-5 lg:p-6",
            exGlass.panel,
          )}
        >
          {/* Linha central */}
          <div
            className="pointer-events-none absolute bottom-6 left-[1.55rem] top-6 w-px bg-gradient-to-b from-border via-blue-600/30 to-border sm:left-[1.85rem]"
            aria-hidden
          />

          <ol className="relative space-y-4 sm:space-y-5">
            {items.map((event, index) => (
              <ExecutiveTimelineItem
                key={event.id}
                event={event}
                index={index}
              />
            ))}
          </ol>

          {data.hasHistory ? (
            <div className="relative z-10 mt-5 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className={cn("rounded-xl", exAnimations.focusRing)}
                aria-expanded={showHistory}
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory
                  ? "Ocultar histórico"
                  : `Ver histórico (${data.hiddenCount})`}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </ExecutiveSection>
  );
}
