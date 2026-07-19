import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string | null | undefined;
  className?: string;
};

/**
 * Impacto somente quando já existir no payload — nunca inventa.
 */
export function ExecutiveImpact({
  label = "Impacto",
  value,
  className,
}: Props) {
  if (!value?.trim()) return null;
  return (
    <p className={cn(exTypography.caption, className)}>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  );
}
