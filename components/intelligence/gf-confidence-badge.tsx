import type { ConfidenceResult } from "@/lib/intelligence/enterprise/types";
import { cn } from "@/lib/utils";

export function GFConfidenceBadge({
  confidence,
  className,
}: {
  confidence: ConfidenceResult;
  className?: string;
}) {
  return (
    <span
      data-gf-confidence-badge=""
      data-level={confidence.level}
      title={confidence.explanation}
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--gf-border-subtle)]",
        "px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        "text-[var(--text-secondary)]",
        className,
      )}
    >
      Confiança {confidence.level}
      {confidence.score != null ? ` · ${Math.round(confidence.score * 100)}%` : ""}
    </span>
  );
}
