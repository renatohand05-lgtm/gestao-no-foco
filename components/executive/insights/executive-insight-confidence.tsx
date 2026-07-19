import { ExecutiveConfidence } from "@/components/executive/presentation/executive-confidence";
import type { ExecutiveInsightConfidence } from "@/lib/executive-insights";

type Props = {
  confidence: ExecutiveInsightConfidence;
  reason: string;
};

export function ExecutiveInsightConfidenceBadge({
  confidence,
  reason,
}: Props) {
  return <ExecutiveConfidence level={confidence} reason={reason} />;
}
