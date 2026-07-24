import { cn } from "@/lib/utils";
import {
  gofColors,
  gofRadius,
  gofTypography,
} from "@/lib/design-system/foundation";

export type ExecutiveBadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary";

export type ExecutiveBadgeVariant = "soft" | "solid" | "outline";

type Props = {
  children: React.ReactNode;
  tone?: ExecutiveBadgeTone;
  variant?: ExecutiveBadgeVariant;
  className?: string;
};

function toneClasses(tone: ExecutiveBadgeTone, variant: ExecutiveBadgeVariant) {
  if (tone === "neutral") {
    if (variant === "solid") {
      return "bg-[var(--brand-gray-dark)] text-white";
    }
    if (variant === "outline") {
      return "border border-border bg-transparent text-muted-foreground";
    }
    return "bg-muted text-muted-foreground ring-1 ring-border/50";
  }

  const palette = gofColors[tone];
  if (variant === "solid") return palette.solid;
  if (variant === "outline") {
    return cn("border bg-transparent", palette.border, palette.text);
  }
  return cn(palette.soft, "ring-1", palette.border);
}

/**
 * Badge — Success · Warning · Danger · Info · Neutral · Outline (Gate 19.0.2).
 */
export function ExecutiveBadge({
  children,
  tone = "neutral",
  variant = "soft",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate px-2.5 py-1",
        "motion-safe:transition-colors motion-safe:duration-150",
        gofRadius.sm,
        gofTypography.caption,
        "font-semibold",
        toneClasses(tone, variant),
        className,
      )}
    >
      {children}
    </span>
  );
}
