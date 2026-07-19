import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BusinessPriority } from "@/lib/business-intelligence";

type Props = {
  priority: BusinessPriority;
};

type Accent = "danger" | "warning" | "info";

const PRIO_TONE: Record<BusinessPriority["priority"], Accent> = {
  alta: "danger",
  media: "warning",
  baixa: "info",
};

const PRIO_LABEL = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
} as const;

export function BusinessPriorityCard({ priority }: Props) {
  return (
    <ExecutiveCard
      padding={20}
      accent={PRIO_TONE[priority.priority]}
      className={cn("h-full", exAnimations.slide)}
      aria-label={`Prioridade ${PRIO_LABEL[priority.priority]}: ${priority.title}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Prioridade</p>
        <ExecutiveBadge tone={PRIO_TONE[priority.priority]}>
          {PRIO_LABEL[priority.priority]}
        </ExecutiveBadge>
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">
        {priority.title}
      </p>
      <p className={cn("mt-2", exTypography.caption)}>{priority.description}</p>
      <p className={cn("mt-3", exTypography.caption)}>
        <span className="font-medium text-foreground">Impacto estimado:</span>{" "}
        {priority.estimatedImpact}
      </p>
    </ExecutiveCard>
  );
}
