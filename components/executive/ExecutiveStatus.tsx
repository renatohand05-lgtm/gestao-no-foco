import { cn } from "@/lib/utils";
import { exColors, type ExColorTone } from "@/lib/design-system/colors";
import { exPaddingX, exPaddingY } from "@/lib/design-system/spacing";
import { exRadius } from "@/lib/design-system/radius";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  label: string;
  tone?: Exclude<ExColorTone, "neutral"> | "neutral";
  className?: string;
};

function toneClasses(tone: Props["tone"]) {
  switch (tone) {
    case "primary":
      return cn(exColors.primary.soft, exColors.primary.border);
    case "success":
      return cn(exColors.success.soft, exColors.success.border);
    case "warning":
      return cn(exColors.warning.soft, exColors.warning.border);
    case "danger":
      return cn(exColors.danger.soft, exColors.danger.border);
    case "info":
      return cn(exColors.info.soft, exColors.info.border);
    default:
      return cn(exColors.neutral.muted, exColors.neutral.border, exColors.neutral.textMuted);
  }
}

/**
 * Status textual com tom semântico.
 */
export function ExecutiveStatus({
  label,
  tone = "neutral",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center border font-medium",
        exRadius[12],
        exPaddingX[12],
        exPaddingY[8],
        exTypography.caption,
        toneClasses(tone),
        className,
      )}
    >
      {label}
    </span>
  );
}
