import type { LucideIcon } from "lucide-react";

import { ExecutiveCard } from "@/components/executive/ExecutiveCard";
import { ExecutiveMetric } from "@/components/executive/ExecutiveMetric";
import type { ExColorTone } from "@/lib/design-system/colors";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: ExColorTone;
  icon?: LucideIcon;
  className?: string;
  emphasize?: boolean;
};

/**
 * MetricCard — KPI na superfície canônica (Gate 19.0.2).
 * Mesmo padding/raio/shadow do ExecutiveCard.
 */
export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  className,
  emphasize = false,
}: Props) {
  return (
    <ExecutiveCard
      padding={20}
      className={cn("h-full min-w-0 overflow-hidden", className)}
      priority={emphasize ? "action" : "info"}
    >
      <ExecutiveMetric
        label={label}
        value={value}
        hint={hint}
        tone={tone}
        icon={icon}
        size={emphasize ? "primary" : "secondary"}
      />
    </ExecutiveCard>
  );
}
