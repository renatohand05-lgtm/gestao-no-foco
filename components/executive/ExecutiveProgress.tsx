import { cn } from "@/lib/utils";
import {
  gofColors,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system/foundation";

export type ExecutiveProgressTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  value: number;
  max?: number;
  label?: string;
  tone?: ExecutiveProgressTone;
  className?: string;
  showValue?: boolean;
  detail?: string;
  size?: "sm" | "md" | "lg";
};

function barColor(tone: ExecutiveProgressTone) {
  switch (tone) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "danger":
      return "bg-danger";
    case "info":
      return "bg-[var(--brand-info)]";
    default:
      return "bg-primary";
  }
}

/**
 * Barra de progresso acessível (Gate 19.6 — tokens gof*, sem blue-*).
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
          {label ? <p className={gofTypography.caption}>{label}</p> : <span />}
          {showValue ? (
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                gofColors[tone].text,
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
          "rounded-full",
        )}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progresso"}
      >
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out",
            barColor(tone),
            gofRadius.sm,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail ? (
        <p className={cn(gofTypography.caption, gofMotion.fade)}>{detail}</p>
      ) : null}
    </div>
  );
}
