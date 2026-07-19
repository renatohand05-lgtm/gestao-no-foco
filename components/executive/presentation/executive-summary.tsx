import { ExecutiveCard } from "@/components/executive";
import { ExecutiveConfidence } from "@/components/executive/presentation/executive-confidence";
import { ExecutivePriorityBadge } from "@/components/executive/presentation/executive-priority-badge";
import {
  CONTEXT_LABEL,
  type ExecutiveNarrative,
} from "@/lib/executive-presentation";
import {
  exAnimations,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  narrative: ExecutiveNarrative;
  confidence?: "baixa" | "media" | "alta";
  className?: string;
  /** Variante embutida no Hero (fundo escuro). */
  inverse?: boolean;
  compact?: boolean;
};

/**
 * Resumo executivo — máximo 2 frases já existentes + badges de contexto.
 */
export function ExecutiveSummary({
  narrative,
  confidence,
  className,
  inverse = false,
  compact = false,
}: Props) {
  const body = (
    <div
      className={cn("space-y-2", className)}
      aria-label="Resumo executivo"
    >
      <div className="flex flex-wrap items-center gap-2">
        {!compact || !inverse ? (
          <p
            className={cn(
              exTypography.label,
              inverse && "text-white/55",
            )}
          >
            Situação da empresa
          </p>
        ) : (
          <p className={cn(exTypography.label, "text-white/55")}>
            Resumo executivo
          </p>
        )}
        <ExecutivePriorityBadge priority={narrative.priority} />
        {!compact ? (
          <span
            className={cn(
              "inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5 ring-1",
              exTypography.caption,
              "font-medium",
              inverse
                ? "bg-white/[0.06] text-white/75 ring-white/10"
                : "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-white/5 dark:text-muted-foreground dark:ring-white/10",
            )}
          >
            {CONTEXT_LABEL[narrative.context]}
          </span>
        ) : null}
        {confidence ? (
          <ExecutiveConfidence
            level={confidence}
            reason={narrative.confidenceNote}
          />
        ) : null}
      </div>

      <p
        className={cn(
          compact ? exTypography.cardTitle : exTypography.title,
          inverse && "text-white",
        )}
      >
        {narrative.lead}
      </p>

      {narrative.support ? (
        <p
          className={cn(
            exTypography.caption,
            inverse ? "text-white/65" : undefined,
            "line-clamp-3",
          )}
        >
          {narrative.support}
        </p>
      ) : null}

      {narrative.lowConfidence && narrative.confidenceNote ? (
        <p
          className={cn(
            exTypography.caption,
            inverse ? "text-amber-200/80" : "text-amber-700 dark:text-amber-400",
          )}
          role="status"
        >
          {narrative.confidenceNote}
        </p>
      ) : null}
    </div>
  );

  if (inverse || compact) {
    return <div className={exAnimations.fade}>{body}</div>;
  }

  return (
    <ExecutiveCard
      padding={20}
      priority={
        narrative.priority === "critical" || narrative.priority === "high"
          ? "risk"
          : narrative.priority === "medium"
            ? "opportunity"
            : "info"
      }
      className={cn(exAnimations.slide, className)}
      aria-label="Resumo executivo"
    >
      {body}
    </ExecutiveCard>
  );
}
