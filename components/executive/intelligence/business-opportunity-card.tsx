import { ExecutiveCard } from "@/components/executive";
import {
  ExecutiveEvidence,
  ExecutiveImpact,
  ExecutivePriorityBadge,
} from "@/components/executive/presentation";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BusinessOpportunity } from "@/lib/business-intelligence";

type Props = {
  opportunity: BusinessOpportunity;
};

export function BusinessOpportunityCard({ opportunity }: Props) {
  return (
    <ExecutiveCard
      padding={20}
      accent="success"
      priority="opportunity"
      className={cn("h-full", exAnimations.slide, exAnimations.hoverScale)}
      aria-label={`Oportunidade: ${opportunity.title}`}
    >
      <div className="space-y-2">
        <ExecutivePriorityBadge priority="medium" label="Oportunidade" />
        <p className={exTypography.sectionTitle}>{opportunity.title}</p>
        <ExecutiveEvidence value={opportunity.description} />
        <ExecutiveImpact
          label="Ganho potencial"
          value={opportunity.estimatedImpact}
        />
      </div>
    </ExecutiveCard>
  );
}
