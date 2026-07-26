import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import type { EccExecutiveScore } from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";

type Props = {
  score: EccExecutiveScore;
  pendingDecisionsCount: number;
  criticalDecisionsCount: number;
};

export function ExecutiveHealthOverview({
  score,
  pendingDecisionsCount,
  criticalDecisionsCount,
}: Props) {
  return (
    <ExecutiveCard padding={16} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={gofTypography.caption}>Saúde executiva</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            {score.value == null ? "—" : score.value}
            <span className="text-sm font-normal text-muted-foreground">
              /100
            </span>
          </p>
        </div>
        <ExecutiveBadge tone="neutral" variant="outline">
          {score.source}
        </ExecutiveBadge>
      </div>
      <p className={gofTypography.caption}>
        {score.label} · confiança {score.confidence}
      </p>
      <div className="flex flex-wrap gap-2">
        <ExecutiveBadge
          tone={criticalDecisionsCount > 0 ? "danger" : "neutral"}
          variant="soft"
        >
          {criticalDecisionsCount} crítica
          {criticalDecisionsCount === 1 ? "" : "s"}
        </ExecutiveBadge>
        <ExecutiveBadge tone="info" variant="outline">
          {pendingDecisionsCount} pendente
          {pendingDecisionsCount === 1 ? "" : "s"}
        </ExecutiveBadge>
      </div>
    </ExecutiveCard>
  );
}
