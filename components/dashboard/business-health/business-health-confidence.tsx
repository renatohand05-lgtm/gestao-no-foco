import {
  BUSINESS_HEALTH_CONFIDENCE_LABEL,
  type BusinessHealthConfidenceLevel,
} from "@/lib/enterprise";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";

function confidenceTone(
  level: BusinessHealthConfidenceLevel,
): "success" | "warning" | "danger" | "neutral" {
  if (level === "alta") return "success";
  if (level === "media") return "warning";
  return "danger";
}

type Props = {
  level: BusinessHealthConfidenceLevel;
  coveragePct: number;
  modulesAvailable: number;
  className?: string;
};

/**
 * Confiança Alta / Média / Baixa conforme cobertura real.
 */
export function BusinessHealthConfidence({
  level,
  coveragePct,
  modulesAvailable,
  className,
}: Props) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={gofTypography.caption}>Confiança</span>
        <ExecutiveBadge tone={confidenceTone(level)} variant="soft">
          {BUSINESS_HEALTH_CONFIDENCE_LABEL[level]}
        </ExecutiveBadge>
      </div>
      <p className={gofTypography.caption}>
        {modulesAvailable} módulo{modulesAvailable === 1 ? "" : "s"} com
        cobertura · {coveragePct}% dos dados
      </p>
    </div>
  );
}
