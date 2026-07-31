import { cn } from "@/lib/utils";
import { gfType } from "@/lib/design-system/signature";

type Props = {
  value: string;
  label?: string;
  size?: "lg" | "xl";
  unavailable?: boolean;
  className?: string;
  title?: string;
};

export function GFMetric({
  value,
  label,
  size = "lg",
  unavailable = false,
  className,
  title,
}: Props) {
  return (
    <div className={cn("min-w-0 overflow-visible", className)} data-gf-metric="">
      {label ? <p className={cn(gfType.overline, "mb-1")}>{label}</p> : null}
      <p
        className={cn(
          size === "xl" ? gfType.metricXl : gfType.metricLg,
          "block w-full max-w-full overflow-visible whitespace-nowrap",
          unavailable && "text-[var(--text-muted)]",
        )}
        data-kpi-value=""
        data-kpi-no-truncation=""
        title={title ?? value}
      >
        {value}
      </p>
    </div>
  );
}
