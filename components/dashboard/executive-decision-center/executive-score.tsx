import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import {
  EDC_CONFIDENCE_LABEL,
  executiveScoreCaption,
  type EdcExecutiveScore,
} from "@/lib/executive-decision-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  score: EdcExecutiveScore;
};

function tone(
  value: number | null,
): "success" | "warning" | "danger" | "neutral" {
  if (value == null) return "neutral";
  if (value >= 80) return "success";
  if (value >= 65) return "warning";
  return "danger";
}

export function ExecutiveScoreCard({ score }: Props) {
  return (
    <div data-executive-score={score.value ?? "null"}>
    <ExecutiveCard padding={16} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={gofTypography.caption}>Executive Score</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {score.value == null ? "—" : score.value}
            <span className="text-sm font-normal text-muted-foreground">
              /100
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ExecutiveBadge tone={tone(score.value)} variant="soft">
            {score.label}
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            Confiança {EDC_CONFIDENCE_LABEL[score.confidence]}
          </ExecutiveBadge>
        </div>
      </div>

      <p className={gofTypography.caption}>{executiveScoreCaption(score)}</p>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {score.dimensions.map((d) => (
          <li
            key={d.key}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="text-muted-foreground">
              {d.label}
              <span className="ml-1 opacity-70">({d.weight}%)</span>
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {d.score == null ? "Indisponível" : d.score}
            </span>
          </li>
        ))}
      </ul>

      {score.unavailable.length > 0 ? (
        <p className={cn(gofTypography.caption)}>
          Dimensões indisponíveis: {score.unavailable.join(", ")}.
        </p>
      ) : null}
    </ExecutiveCard>
    </div>
  );
}
