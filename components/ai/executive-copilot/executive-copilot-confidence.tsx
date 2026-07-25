"use client";

import {
  EXECUTIVE_COPILOT_CONFIDENCE_LABEL,
  type ExecutiveCopilotConfidence,
} from "@/lib/ai/executive-copilot-types";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";

function tone(
  level: ExecutiveCopilotConfidence,
): "success" | "warning" | "danger" | "neutral" {
  if (level === "alta") return "success";
  if (level === "media") return "warning";
  return "danger";
}

type Props = {
  level: ExecutiveCopilotConfidence;
  className?: string;
};

export function ExecutiveCopilotConfidence({ level, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={gofTypography.caption}>Confiança</span>
      <ExecutiveBadge tone={tone(level)} variant="soft">
        {EXECUTIVE_COPILOT_CONFIDENCE_LABEL[level]}
      </ExecutiveBadge>
    </div>
  );
}
