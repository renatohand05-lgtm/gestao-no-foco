import type { BusinessHealthEvidenceItem } from "@/lib/enterprise";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: BusinessHealthEvidenceItem[];
  emptyLabel?: string;
  className?: string;
};

/**
 * Motivos determinísticos — somente evidências do engine.
 */
export function BusinessHealthReason({
  items,
  emptyLabel = "Sem motivos com evidência suficiente.",
  className,
}: Props) {
  if (items.length === 0) {
    return (
      <p className={cn(gofTypography.caption, className)}>{emptyLabel}</p>
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)} aria-label="Principais motivos">
      {items.map((item) => (
        <li key={item.id} className={cn(gofTypography.subtitle, "text-sm")}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
