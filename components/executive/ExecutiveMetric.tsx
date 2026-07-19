import type { LucideIcon } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exColors, type ExColorTone } from "@/lib/design-system/colors";
import { exRadius } from "@/lib/design-system/radius";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: ExColorTone;
  size?: "primary" | "secondary";
  icon?: LucideIcon;
  className?: string;
};

function toneText(tone: ExColorTone) {
  if (tone === "neutral") return "text-foreground";
  return exColors[tone].text;
}

function toneSoft(tone: ExColorTone) {
  if (tone === "neutral") return "bg-muted/60 text-muted-foreground";
  return exColors[tone].soft;
}

/**
 * Métrica executiva — ícone maior, valor protagonista (Sprint 10.5).
 */
export function ExecutiveMetric({
  label,
  value,
  hint,
  tone = "neutral",
  size = "secondary",
  icon: Icon,
  className,
}: Props) {
  const valueClass =
    size === "primary" ? exTypography.kpiPrimary : exTypography.kpiSecondary;
  const iconBox = size === "primary" ? "size-10" : "size-9";
  const iconSize = size === "primary" ? "md" : "sm";

  return (
    <div
      className={cn(
        "min-w-0",
        size === "primary" ? "space-y-3" : "space-y-2",
        exAnimations.count,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center",
              iconBox,
              exRadius[12],
              toneSoft(tone),
            )}
          >
            <DsIcon icon={Icon} size={iconSize} />
          </span>
        ) : null}
        <p className={exTypography.label}>{label}</p>
      </div>
      <p className={cn(valueClass, toneText(tone), "leading-none")}>{value}</p>
      {hint ? <p className={exTypography.caption}>{hint}</p> : null}
    </div>
  );
}
