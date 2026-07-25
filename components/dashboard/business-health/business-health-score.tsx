import {
  BUSINESS_HEALTH_STATUS_LABEL,
  type BusinessHealthStatus,
} from "@/lib/dashboard/business-health-engine";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";

function statusTone(
  status: BusinessHealthStatus,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "excelente") return "success";
  if (status === "saudavel") return "info";
  if (status === "atencao") return "warning";
  if (status === "critico") return "danger";
  return "neutral";
}

type Props = {
  score: number | null;
  status: BusinessHealthStatus;
  emphasize?: boolean;
  className?: string;
};

/**
 * Score + status oficial Business Health (Gate 20.2).
 */
export function BusinessHealthScore({
  score,
  status,
  emphasize = false,
  className,
}: Props) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p
        className={cn(
          emphasize ? "text-3xl font-semibold tracking-tight" : "text-xl font-semibold",
          "tabular-nums text-foreground",
        )}
        aria-label={`Business Health Score ${score == null ? "indisponível" : score}`}
      >
        {score == null ? "—" : score}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ExecutiveBadge tone={statusTone(status)} variant="soft">
          {BUSINESS_HEALTH_STATUS_LABEL[status]}
        </ExecutiveBadge>
        <span className={gofTypography.caption}>0–100</span>
      </div>
    </div>
  );
}
