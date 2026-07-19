import { cn } from "@/lib/utils";
import { exColors, type ExColorTone } from "@/lib/design-system/colors";
import { exPaddingX, exPaddingY } from "@/lib/design-system/spacing";
import { exRadius } from "@/lib/design-system/radius";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  children: React.ReactNode;
  tone?: ExColorTone;
  className?: string;
};

function toneClasses(tone: ExColorTone) {
  if (tone === "neutral") {
    return cn(
      exColors.neutral.muted,
      exColors.neutral.textMuted,
      "ring-1 ring-border/50",
    );
  }
  return cn(exColors[tone].soft, "ring-1", exColors[tone].ring);
}

/**
 * Badge / chip executivo (Sprint 10.5).
 */
export function ExecutiveBadge({
  children,
  tone = "primary",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold motion-safe:transition-colors motion-safe:duration-150",
        exRadius.full,
        exPaddingX[12],
        exPaddingY[8],
        exTypography.caption,
        toneClasses(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}
