import { cn } from "@/lib/utils";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  className?: string;
  label?: string;
};

/**
 * Divisor visual entre blocos executivos (Sprint 10.5).
 */
export function ExecutiveDivider({ className, label }: Props) {
  if (label) {
    return (
      <div
        className={cn("flex items-center gap-4 py-1", className)}
        role="separator"
        aria-label={label}
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border/40" />
        <span className={exTypography.label}>{label}</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border/40" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-border to-transparent",
        className,
      )}
      role="separator"
    />
  );
}
