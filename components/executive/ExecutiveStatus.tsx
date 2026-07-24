import { cn } from "@/lib/utils";
import {
  gofColors,
  gofRadius,
  gofTypography,
} from "@/lib/design-system/foundation";

export type ExecutiveStatusTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type Props = {
  label: string;
  tone?: ExecutiveStatusTone;
  className?: string;
};

function toneClasses(tone: ExecutiveStatusTone) {
  switch (tone) {
    case "primary":
      return cn(gofColors.primary.soft, gofColors.primary.border);
    case "success":
      return cn(gofColors.success.soft, gofColors.success.border);
    case "warning":
      return cn(gofColors.warning.soft, gofColors.warning.border);
    case "danger":
      return cn(gofColors.danger.soft, gofColors.danger.border);
    case "info":
      return cn(gofColors.info.soft, gofColors.info.border);
    default:
      return cn(
        gofColors.muted.className,
        gofColors.border.className,
        gofColors.muted.text,
      );
  }
}

/**
 * Status textual com tom semântico (Gate 19.6 — tokens gof*).
 */
export function ExecutiveStatus({
  label,
  tone = "neutral",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 font-medium",
        gofRadius.sm,
        gofTypography.caption,
        toneClasses(tone),
        className,
      )}
    >
      {label}
    </span>
  );
}
