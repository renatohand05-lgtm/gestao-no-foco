import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exColors, type ExColorTone } from "@/lib/design-system/colors";
import { exRadius } from "@/lib/design-system/radius";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  value: number;
  max?: number;
  label?: string;
  tone?: Exclude<ExColorTone, "neutral">;
  className?: string;
  showValue?: boolean;
  detail?: string;
  size?: "sm" | "md" | "lg";
};

function barColor(tone: Exclude<ExColorTone, "neutral">) {
  switch (tone) {
    case "success":
      return "bg-gradient-to-r from-emerald-600 to-emerald-500";
    case "warning":
      return "bg-gradient-to-r from-orange-600 to-orange-500";
    case "danger":
      return "bg-gradient-to-r from-red-600 to-red-500";
    case "info":
      return "bg-gradient-to-r from-violet-600 to-violet-500";
    default:
      return "bg-gradient-to-r from-blue-700 to-blue-500";
  }
}

/**
 * Barra de progresso premium (Sprint 10.5).
 */
export function ExecutiveProgress({
  value,
  max = 100,
  label,
  tone = "primary",
  className,
  showValue = true,
  detail,
  size = "md",
}: Props) {
  const safeMax = max <= 0 ? 100 : max;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const height =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5";

  return (
    <div className={cn("space-y-2.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {label ? <p className={exTypography.label}>{label}</p> : <span />}
          {showValue ? (
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                exColors[tone].text,
              )}
            >
              {Math.round(pct)}%
            </p>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden bg-muted/60 ring-1 ring-border/40",
          height,
          exRadius.full,
        )}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progresso"}
      >
        <div
          className={cn(
            "h-full rounded-full",
            barColor(tone),
            exAnimations.progress,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail ? <p className={exTypography.caption}>{detail}</p> : null}
    </div>
  );
}
