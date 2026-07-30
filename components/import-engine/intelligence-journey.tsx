"use client";

import {
  ArrowRight,
  CheckCircle2,
  Circle,
  type LucideIcon,
} from "lucide-react";

import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type IntelligenceJourneyStepId =
  | "enviar"
  | "detectar"
  | "mapear"
  | "classificar"
  | "revisar"
  | "confirmar"
  | "acompanhar";

export type IntelligenceJourneyStep = {
  id: IntelligenceJourneyStepId;
  label: string;
  icon?: LucideIcon;
};

export const INTELLIGENCE_JOURNEY_STEPS: IntelligenceJourneyStep[] = [
  { id: "enviar", label: "Enviar" },
  { id: "detectar", label: "Detectar" },
  { id: "mapear", label: "Mapear" },
  { id: "classificar", label: "Classificar" },
  { id: "revisar", label: "Revisar" },
  { id: "confirmar", label: "Confirmar" },
  { id: "acompanhar", label: "Acompanhar" },
];

type Props = {
  /** Passo atual destacado (opcional — ex.: com run ativo) */
  currentStep?: IntelligenceJourneyStepId | null;
  /** Passos concluídos antes do atual */
  completedSteps?: IntelligenceJourneyStepId[];
  className?: string;
};

function stepIndex(id: IntelligenceJourneyStepId): number {
  return INTELLIGENCE_JOURNEY_STEPS.findIndex((s) => s.id === id);
}

/**
 * Visualização da jornada progressiva de importação (Sprint 22.9).
 */
export function IntelligenceJourney({
  currentStep = null,
  completedSteps = [],
  className,
}: Props) {
  const currentIdx = currentStep != null ? stepIndex(currentStep) : -1;
  const completedSet = new Set(completedSteps);

  return (
    <section
      aria-label="Jornada de importação"
      data-intelligence-journey
      className={cn(
        "rounded-xl border border-border/60 bg-card/30 p-4",
        gofMotion.fade,
        className,
      )}
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Jornada de importação
      </p>
      <ol
        className="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
        aria-label="Etapas da jornada"
      >
        {INTELLIGENCE_JOURNEY_STEPS.map((step, idx) => {
          const done =
            completedSet.has(step.id) ||
            (currentIdx >= 0 && idx < currentIdx);
          const current = step.id === currentStep;
          const pending = !done && !current;

          return (
            <li key={step.id} className="flex shrink-0 items-center">
              <div
                data-journey-step={step.id}
                data-journey-state={
                  current ? "current" : done ? "done" : "pending"
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                  current && "bg-[var(--brand-graphite)] text-white",
                  done && !current && "text-emerald-700 dark:text-emerald-400",
                  pending && "text-muted-foreground",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <Circle
                    className={cn(
                      "size-3.5 shrink-0",
                      current && "text-[var(--brand-gold)]",
                    )}
                    aria-hidden
                  />
                )}
                <span>{step.label}</span>
              </div>
              {idx < INTELLIGENCE_JOURNEY_STEPS.length - 1 ? (
                <ArrowRight
                  className="mx-0.5 size-3 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
