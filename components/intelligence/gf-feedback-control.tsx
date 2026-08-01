"use client";

import { useState } from "react";
import type { IntelligenceFeedback } from "@/lib/intelligence/enterprise/types";
import { cn } from "@/lib/utils";

const OPTIONS: IntelligenceFeedback["rating"][] = [
  "util",
  "nao_util",
  "incorreto",
  "incompleto",
  "desatualizado",
  "irrelevante",
];

export function GFFeedbackControl({
  onSubmit,
  disabled,
}: {
  onSubmit: (rating: IntelligenceFeedback["rating"]) => void;
  disabled?: boolean;
}) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <p data-gf-feedback-control="" className="text-xs text-[var(--text-secondary)]">
        Feedback registrado. Obrigado.
      </p>
    );
  }
  return (
    <div data-gf-feedback-control="" className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-md border border-[var(--gf-border-subtle)] px-2 py-1 text-[10px] uppercase",
            "text-[var(--text-secondary)] hover:border-[var(--gf-border-active)]",
          )}
          onClick={() => {
            onSubmit(o);
            setSent(true);
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
