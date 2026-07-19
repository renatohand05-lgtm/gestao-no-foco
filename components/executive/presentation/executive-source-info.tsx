import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  sources: string[];
  className?: string;
  label?: string;
};

/**
 * Lista fontes já existentes no payload.
 */
export function ExecutiveSourceInfo({
  sources,
  className,
  label = "Fonte",
}: Props) {
  const cleaned = sources.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return (
    <p className={cn(exTypography.caption, className)}>
      <span className="font-medium text-foreground">
        {cleaned.length > 1 ? "Fontes" : label}:
      </span>{" "}
      {cleaned.join(" · ")}
    </p>
  );
}
