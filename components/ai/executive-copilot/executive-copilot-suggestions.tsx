"use client";

import { EXECUTIVE_COPILOT_SUGGESTIONS } from "@/lib/ai/executive-copilot-types";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (question: string) => void;
  suggestions?: string[];
  className?: string;
};

export function ExecutiveCopilotSuggestions({
  onSelect,
  suggestions = EXECUTIVE_COPILOT_SUGGESTIONS,
  className,
}: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className={gofTypography.caption}>Sugestões</p>
      <ul className="flex flex-wrap gap-2" aria-label="Perguntas sugeridas">
        {suggestions.map((q) => (
          <li key={q}>
            <button
              type="button"
              className={cn(
                "rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left text-xs font-medium hover:bg-muted/50",
                gofFocusRing,
              )}
              onClick={() => onSelect(q)}
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
