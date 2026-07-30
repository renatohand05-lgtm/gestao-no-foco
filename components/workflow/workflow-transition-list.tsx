"use client";

import type { WorkflowTransition } from "@/lib/workflow";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { WorkflowEmptyState } from "@/components/workflow/workflow-empty-state";

type Props = {
  transitions: readonly WorkflowTransition[];
  className?: string;
  onSelect?: (transition: WorkflowTransition) => void;
};

/**
 * Lista de transições disponíveis — dados já avaliados pelo engine.
 * Sem regras de domínio neste componente.
 */
export function WorkflowTransitionList({
  transitions,
  className,
  onSelect,
}: Props) {
  if (transitions.length === 0) {
    return (
      <WorkflowEmptyState
        title="Sem transições disponíveis"
        description="Nenhum evento permitido no estado atual."
        className={className}
      />
    );
  }

  return (
    <ul
      data-workflow-transitions
      className={cn("space-y-2", className)}
      aria-label="Transições disponíveis"
    >
      {transitions.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className={cn(
              "w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35",
              onSelect && "hover:border-[var(--brand-gold)]/40",
            )}
            onClick={() => onSelect?.(t)}
            disabled={!onSelect}
          >
            <p className="text-sm font-semibold text-foreground">{t.event}</p>
            <p className={cn(gofTypography.caption)}>
              {t.from} → {t.to}
            </p>
            {t.description ? (
              <p className={cn(gofTypography.subtitle, "text-xs line-clamp-2")}>
                {t.description}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
