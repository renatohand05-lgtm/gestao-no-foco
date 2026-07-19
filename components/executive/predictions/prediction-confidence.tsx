import { ExecutiveBadge } from "@/components/executive";
import { confidenceLabel } from "@/lib/predictions/confidence";
import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { PredictionConfidence } from "@/lib/predictions/types";

type Props = {
  confidence: PredictionConfidence;
  motivo?: string;
  className?: string;
};

const TONE = {
  baixa: "warning",
  media: "info",
  alta: "success",
} as const;

export function PredictionConfidenceBadge({
  confidence,
  motivo,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ExecutiveBadge tone={TONE[confidence]}>
        {confidenceLabel(confidence)}
      </ExecutiveBadge>
      {motivo ? (
        <p id="prediction-confidence-hint" className={exTypography.caption}>
          {motivo}
        </p>
      ) : null}
    </div>
  );
}
