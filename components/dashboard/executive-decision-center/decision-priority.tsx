import { ExecutiveBadge } from "@/components/executive";
import {
  EDC_PRIORITY_LABEL,
  type EdcPriority,
} from "@/lib/executive-decision-center";

function tone(
  p: EdcPriority,
): "danger" | "warning" | "info" | "neutral" {
  if (p === "critical") return "danger";
  if (p === "high") return "warning";
  if (p === "medium") return "info";
  return "neutral";
}

type Props = {
  priority: EdcPriority;
};

export function DecisionPriority({ priority }: Props) {
  return (
    <ExecutiveBadge tone={tone(priority)} variant="soft">
      {EDC_PRIORITY_LABEL[priority]}
    </ExecutiveBadge>
  );
}
