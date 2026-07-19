import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string;
  className?: string;
};

/**
 * Evidência factual já calculada — só tipografia.
 */
export function ExecutiveEvidence({
  label = "Evidência",
  value,
  className,
}: Props) {
  if (!value.trim()) return null;
  return (
    <p className={cn(exTypography.caption, className)}>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  );
}
