import { ExecutiveCard } from "@/components/executive";
import {
  ExecutiveEvidence,
  ExecutiveImpact,
  ExecutivePriorityBadge,
} from "@/components/executive/presentation";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BusinessRisk } from "@/lib/business-intelligence";
import type { PresentationPriority } from "@/lib/executive-presentation";

type Props = {
  risk: BusinessRisk;
};

const SEV_PRIORITY: Record<BusinessRisk["severity"], PresentationPriority> = {
  alta: "critical",
  media: "high",
  baixa: "info",
};

const SEV_LABEL = {
  alta: "Crítico",
  media: "Atenção",
  baixa: "Informativo",
} as const;

export function BusinessRiskCard({ risk }: Props) {
  const priority = SEV_PRIORITY[risk.severity];

  return (
    <ExecutiveCard
      padding={20}
      accent={
        risk.severity === "alta"
          ? "danger"
          : risk.severity === "media"
            ? "warning"
            : "info"
      }
      priority={
        risk.severity === "alta" || risk.severity === "media" ? "risk" : "info"
      }
      className={cn(
        "h-full",
        exAnimations.slide,
        exAnimations.hoverScale,
        risk.severity === "alta" && "ring-1 ring-red-500/15",
      )}
      aria-label={`${SEV_LABEL[risk.severity]}: ${risk.title}`}
    >
      <div className="space-y-2">
        <ExecutivePriorityBadge
          priority={priority}
          label={SEV_LABEL[risk.severity]}
        />
        <p
          className={cn(
            risk.severity === "alta"
              ? exTypography.sectionTitle
              : exTypography.cardTitle,
          )}
        >
          {risk.title}
        </p>
        <ExecutiveEvidence label="Causa / evidência" value={risk.description} />
        <ExecutiveImpact value={risk.impact} />
      </div>
    </ExecutiveCard>
  );
}
